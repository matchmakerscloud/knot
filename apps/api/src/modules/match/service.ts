import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { getLLM } from '../../shared/llm/index.js';
import { buildKnotSystemPrompt } from '../../shared/llm/knot-agent.js';
import { knotConversations, knotConversationMessages } from '../../shared/db/schema/knot-conversations.js';
import { matchProfiles, matchPresentations, type MatchProfile } from '../../shared/db/schema/match.js';
import { users, type User } from '../../shared/db/schema/users.js';

/**
 * Build the semantic profile for a user from their match_onboarding conversation history.
 * Uses Knot (Gemini) to:
 *   1. Extract a structured values_json
 *   2. Write a 3-paragraph public_narrative (what others see)
 *   3. Write a private preferences_narrative (Knot's matching notes)
 *   4. Mark the profile as 'complete'
 *
 * Idempotent: re-running just refreshes the narrative + values without re-asking the user.
 */
export async function buildSemanticProfile(userId: string): Promise<MatchProfile> {
  // Fetch all match_onboarding conversation messages for this user
  const convs = await db
    .select()
    .from(knotConversations)
    .where(and(eq(knotConversations.userId, userId), eq(knotConversations.channel, 'match_onboarding')))
    .orderBy(asc(knotConversations.createdAt));

  const transcript: string[] = [];
  for (const c of convs) {
    const msgs = await db
      .select()
      .from(knotConversationMessages)
      .where(eq(knotConversationMessages.conversationId, c.id))
      .orderBy(asc(knotConversationMessages.createdAt));
    transcript.push(`--- Día ${c.dayIndex ?? '?'} ---`);
    for (const m of msgs) {
      transcript.push(`${m.role === 'knot' ? 'Knot' : m.role === 'user' ? 'Usuario' : 'Sistema'}: ${m.content}`);
    }
  }

  if (transcript.length === 0) {
    throw new Error('match.profile.no_onboarding_data');
  }

  const llm = getLLM();
  const systemPrompt = buildKnotSystemPrompt() + `

## Tarea actual
Estás generando el perfil semántico de un usuario a partir de las conversaciones de onboarding de Knot Match. Devuelve un único objeto JSON con esta forma exacta:

{
  "values_json": {
    "core_values": [string, string, string],
    "deal_breakers": [string, string],
    "what_lights_them_up": [string, string, string],
    "what_drains_them": [string, string],
    "rhythm": "intense" | "steady" | "slow" | "mixed",
    "social_style": string
  },
  "public_narrative": string,
  "preferences_narrative": string
}

Reglas:
- public_narrative: 3 párrafos. Lo que verán otros usuarios. Tono cálido, concreto, sensorial. No genérico. No corporativo.
- preferences_narrative: párrafo de notas TUYAS para matchear esta persona. Incluye qué tipo de pareja podría hacer click y por qué. NO se le muestra al usuario ni a otros.
- values_json arrays con strings cortos (3-7 palabras cada uno).

NO incluyas comentarios fuera del JSON. NO uses backticks. Devuelve JSON válido.`;

  const out = await llm.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Acá está la conversación completa de la semana de onboarding:\n\n' + transcript.join('\n') },
    ],
    temperature: 0.6,
    maxTokens: 1500,
    jsonMode: true,
  });

  let parsed: { values_json: unknown; public_narrative: string; preferences_narrative: string };
  try {
    parsed = JSON.parse(stripJsonFence(out.text));
  } catch {
    throw new Error('match.profile.llm_invalid_json:' + out.text.slice(0, 200));
  }

  // Upsert profile
  const existing = await db.select().from(matchProfiles).where(eq(matchProfiles.userId, userId)).limit(1);
  const values = {
    onboardingStatus: 'complete' as const,
    onboardingCompletedAt: new Date(),
    valuesJson: parsed.values_json as object,
    publicNarrative: parsed.public_narrative,
    preferencesNarrative: parsed.preferences_narrative,
    updatedAt: new Date(),
  };

  let row: MatchProfile | undefined;
  if (existing.length > 0) {
    [row] = await db.update(matchProfiles).set(values).where(eq(matchProfiles.userId, userId)).returning();
  } else {
    [row] = await db.insert(matchProfiles).values({ userId, ...values, onboardingStartedAt: new Date() }).returning();
  }
  if (!row) throw new Error('match.profile.upsert.failed');
  return row;
}

/**
 * Generate a dossier between two users via Knot (LLM).
 * Returns: { summary, commonGround, generativeDifference, starters[3] }
 */
export async function generateDossier(opts: {
  presentedTo: User;
  presentedToProfile: MatchProfile;
  presentedUser: User;
  presentedUserProfile: MatchProfile;
}): Promise<{
  summary: string;
  commonGround: string;
  generativeDifference: string;
  starters: string[];
}> {
  const llm = getLLM();
  const systemPrompt = buildKnotSystemPrompt(['matchPresentation']) + `

Estás generando un dossier para que la persona A (la que va a recibir esta presentación) conozca a la persona B (la que le vas a presentar).

Devuelve un único JSON con esta forma exacta:

{
  "summary": string,
  "common_ground": string,
  "generative_difference": string,
  "starters": [string, string, string]
}

Reglas:
- summary: 3-4 frases. Quién es B, en tono cálido, basado en su public_narrative.
- common_ground: párrafo. NO superficial. Valores, ritmos, formas de pensar.
- generative_difference: párrafo. La diferencia que podría hacer la conexión interesante. Las personas no conectan por ser idénticas.
- starters: 3 puntos de partida concretos para abrir la conversación. NO genericidades. Específicos a este match.

NO comentes fuera del JSON. NO uses backticks. JSON válido.`;

  const userMessage = `
PERSONA A (a quien le vas a presentar B):
Nombre: ${opts.presentedTo.firstName}
Public narrative: ${opts.presentedToProfile.publicNarrative ?? '(sin narrativa)'}
Preferences (privadas, NO incluir literalmente en dossier): ${opts.presentedToProfile.preferencesNarrative ?? ''}
Values: ${JSON.stringify(opts.presentedToProfile.valuesJson ?? {})}

PERSONA B (quien será presentada):
Nombre: ${opts.presentedUser.firstName}
Public narrative: ${opts.presentedUserProfile.publicNarrative ?? '(sin narrativa)'}
Values: ${JSON.stringify(opts.presentedUserProfile.valuesJson ?? {})}

Genera el dossier para A.`;

  const out = await llm.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    maxTokens: 1500,
    jsonMode: true,
  });

  let parsed: { summary?: string; common_ground?: string; generative_difference?: string; starters?: unknown };
  try {
    parsed = JSON.parse(stripJsonFence(out.text));
  } catch {
    throw new Error('match.dossier.llm_invalid_json:' + out.text.slice(0, 200));
  }
  return {
    summary: String(parsed.summary ?? ''),
    commonGround: String(parsed.common_ground ?? ''),
    generativeDifference: String(parsed.generative_difference ?? ''),
    starters: Array.isArray(parsed.starters) ? parsed.starters.slice(0, 3).map(String) : [],
  };
}

/**
 * Create a presentation between two users — runs the dossier generator and persists.
 * pending_review status (per spec: human review in MVP).
 */
export async function createPresentation(presentedToId: string, presentedUserId: string) {
  if (presentedToId === presentedUserId) throw new Error('match.presentation.cannot_self_present');

  const [presentedTo] = await db.select().from(users).where(eq(users.id, presentedToId)).limit(1);
  const [presentedUser] = await db.select().from(users).where(eq(users.id, presentedUserId)).limit(1);
  if (!presentedTo || !presentedUser) throw new Error('match.presentation.user_not_found');

  const [presentedToProfile] = await db.select().from(matchProfiles).where(eq(matchProfiles.userId, presentedToId)).limit(1);
  const [presentedUserProfile] = await db.select().from(matchProfiles).where(eq(matchProfiles.userId, presentedUserId)).limit(1);
  if (!presentedToProfile || !presentedUserProfile) throw new Error('match.presentation.profile_missing');

  const dossier = await generateDossier({
    presentedTo, presentedToProfile, presentedUser, presentedUserProfile,
  });

  const [row] = await db.insert(matchPresentations).values({
    presentedToId,
    presentedUserId,
    dossierSummary: dossier.summary,
    dossierCommonGround: dossier.commonGround,
    dossierGenerativeDifference: dossier.generativeDifference,
    conversationStarters: dossier.starters,
    status: 'pending_review',
  }).returning();
  if (!row) throw new Error('match.presentation.insert.failed');
  return row;
}

/**
 * Strip ```json ... ``` fences if the LLM wrapped its JSON in markdown despite jsonMode.
 * Some models (especially on free tiers) ignore responseMimeType.
 */
function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  // ```json ... ``` or ``` ... ```
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const m = trimmed.match(fence);
  return m ? m[1]!.trim() : trimmed;
}
