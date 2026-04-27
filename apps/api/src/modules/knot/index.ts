import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { and, asc, eq, desc } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { getLLM } from '../../shared/llm/index.js';
import { buildKnotSystemPrompt, type KnotPromptFragmentKey } from '../../shared/llm/knot-agent.js';
import { knotConversations, knotConversationMessages, type KnotConversationMessage } from '../../shared/db/schema/knot-conversations.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import type { LLMMessage } from '../../shared/llm/index.js';

const ChannelSchema = z.enum(['confidant', 'match_onboarding', 'voice_helper', 'words_helper']);
type Channel = z.infer<typeof ChannelSchema>;

const StartBody = z.object({ channel: ChannelSchema });
const SendBody = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try { return schema.parse(value); } catch (err) {
    if (err instanceof ZodError) throw new ValidationError('common.validation_failed', 'Invalid request', { issues: err.issues });
    throw err;
  }
}

const FRAGMENT_BY_CHANNEL: Record<Channel, KnotPromptFragmentKey[]> = {
  confidant: [],
  match_onboarding: ['matchOnboarding'],
  voice_helper: ['voiceTodayPrompt'],
  words_helper: [],
};

const OPENING_BY_CHANNEL: Record<Channel, string> = {
  confidant: 'Hola. Soy Knot. ¿Qué pasa por tu cabeza ahora?',
  match_onboarding:
    'Esta semana voy a conocerte un poco. Una sesión por día, 10-15 minutos. Si en algún momento te sientes apurado, paramos y seguimos mañana — esa es la idea. Para empezar: cuéntame de la última relación que te hizo crecer como persona, sea de pareja o amistad. ¿Quién era esa persona?',
  voice_helper: 'Hola. Si estás trabado con tus prompts de Voice, podemos pensarlo juntos. ¿Qué pregunta te está costando?',
  words_helper: 'Hola. Estoy acá para ayudarte a pensar en cómo escribir tus respuestas para Words sin volverlas genéricas. ¿En qué prompt estás?',
};

export async function knotModule(app: FastifyInstance) {
  // POST /v1/knot/conversations — start (or get most-recent today's) conversation in a channel
  app.post('/conversations', { preHandler: app.requireAuth }, async (req, reply) => {
    const userId = req.auth!.userId;
    const body = parse(StartBody, req.body);

    // Reuse today's conversation in this channel if present (one-per-day in onboarding)
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const [existing] = await db
      .select()
      .from(knotConversations)
      .where(and(eq(knotConversations.userId, userId), eq(knotConversations.channel, body.channel)))
      .orderBy(desc(knotConversations.createdAt))
      .limit(1);

    if (existing && existing.createdAt >= todayStart) {
      const msgs = await db.select().from(knotConversationMessages).where(eq(knotConversationMessages.conversationId, existing.id)).orderBy(asc(knotConversationMessages.createdAt));
      reply.code(200);
      return { conversationId: existing.id, messages: msgs.map(serializeMessage) };
    }

    // Create new conversation
    const [conv] = await db.insert(knotConversations).values({
      userId,
      channel: body.channel,
      dayIndex: existing ? (existing.dayIndex ?? 0) + 1 : 1,
    }).returning();
    if (!conv) throw new Error('knot.conversation.create.failed');

    // Drop the opening message from Knot
    const opening = OPENING_BY_CHANNEL[body.channel];
    const [firstMsg] = await db.insert(knotConversationMessages).values({
      conversationId: conv.id,
      role: 'knot',
      content: opening,
    }).returning();

    reply.code(201);
    return {
      conversationId: conv.id,
      dayIndex: conv.dayIndex,
      messages: firstMsg ? [serializeMessage(firstMsg)] : [],
    };
  });

  // GET /v1/knot/conversations/:id — fetch full transcript (most recent N messages)
  app.get<{ Params: { id: string } }>('/conversations/:id', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const [conv] = await db.select().from(knotConversations).where(eq(knotConversations.id, req.params.id)).limit(1);
    if (!conv || conv.userId !== userId) throw new NotFoundError('knot.conversation.not_found', 'Conversation not found');
    const msgs = await db.select().from(knotConversationMessages).where(eq(knotConversationMessages.conversationId, conv.id)).orderBy(asc(knotConversationMessages.createdAt));
    return {
      conversation: { id: conv.id, channel: conv.channel, dayIndex: conv.dayIndex, createdAt: conv.createdAt.toISOString() },
      messages: msgs.map(serializeMessage),
    };
  });

  // POST /v1/knot/messages — send a user message; returns Knot's response
  app.post('/messages', { preHandler: app.requireAuth }, async (req, reply) => {
    const userId = req.auth!.userId;
    const body = parse(SendBody, req.body);

    const [conv] = await db.select().from(knotConversations).where(eq(knotConversations.id, body.conversationId)).limit(1);
    if (!conv || conv.userId !== userId) throw new NotFoundError('knot.conversation.not_found', 'Conversation not found');

    // Persist the user message
    await db.insert(knotConversationMessages).values({
      conversationId: conv.id,
      role: 'user',
      content: body.content,
    });

    // Build LLM context — keep last 30 messages + system prompt to stay efficient
    const history = await db
      .select()
      .from(knotConversationMessages)
      .where(eq(knotConversationMessages.conversationId, conv.id))
      .orderBy(asc(knotConversationMessages.createdAt));
    const recent = history.slice(-30);

    const systemPrompt = buildKnotSystemPrompt(FRAGMENT_BY_CHANNEL[conv.channel as Channel] ?? []);
    const llmMessages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recent.map((m) => ({
        role: m.role === 'knot' ? 'assistant' as const : m.role === 'system' ? 'system' as const : 'user' as const,
        content: m.content,
      })),
    ];

    const llm = getLLM();
    const out = await llm.complete({
      messages: llmMessages,
      temperature: 0.8,
      maxTokens: 600,
    });

    // Persist the assistant reply
    const [assistantRow] = await db.insert(knotConversationMessages).values({
      conversationId: conv.id,
      role: 'knot',
      content: out.text,
      tokensIn: out.usage?.inputTokens ?? null,
      tokensOut: out.usage?.outputTokens ?? null,
      model: llm.defaultModel,
    }).returning();

    await db.update(knotConversations).set({ updatedAt: new Date() }).where(eq(knotConversations.id, conv.id));

    reply.code(201);
    return {
      message: assistantRow ? serializeMessage(assistantRow) : null,
      usage: out.usage,
    };
  });
}

function serializeMessage(m: KnotConversationMessage) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}
