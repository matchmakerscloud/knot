/**
 * Content moderation via LLM (Knot/Gemini-class models).
 *
 * Tasks:
 *   - classifyText: hate, sexual, violence, contact_info_leak, harassment, generic spam
 *   - Returns severity (allow|review|reject) + categories list
 *
 * Used for:
 *   - Voice transcripts (after Whisper)
 *   - Words responses
 *   - Words like-with-comment
 *   - Chamber text messages (future)
 *
 * Why LLM-based: catches contextual issues a keyword classifier misses
 * (passive-aggressive harassment, sub-textual sexual content, fake honesty).
 *
 * Cost discipline: gemini-2.5-flash-lite at ~$0.10 / M input tokens. Average
 * audio transcript is ~150 tokens. Per Voice profile (6 prompts + replies),
 * total cost <$0.001 per user.
 */
import { getLLM } from '../llm/index.js';

export type ModerationVerdict = 'allow' | 'review' | 'reject';

export interface ModerationResult {
  verdict: ModerationVerdict;
  categories: string[];
  reason?: string;
}

const SYSTEM_PROMPT = `Eres un clasificador de moderación para Knot, una app de dating en español. Tu trabajo: marcar contenido que rompa estas reglas:

- harassment: ataques personales, insultos, amenazas
- hate: ataques a grupos por raza, género, orientación, religión, etc.
- sexual: contenido sexual explícito, propuestas sexuales no solicitadas
- violence: amenazas o glorificación de violencia
- minor: contenido sexual que involucre o sugiera menores → SIEMPRE reject + alertar
- contact_leak: teléfono, dirección, email, redes sociales (fuga de info personal antes del match)
- self_harm: ideación suicida o autolesiva (no reject — review + escalar a humano)
- spam: contenido genérico, copy-paste, comercial

Devuelve JSON exactamente con esta forma:

{
  "verdict": "allow" | "review" | "reject",
  "categories": [string],
  "reason": string
}

Reglas:
- "allow": contenido OK, ningún flag
- "review": dudoso, humano debería ver — flag pero no bloquees
- "reject": claramente inaceptable

Sé permisivo con el lenguaje cotidiano. La gente normal usa "wn", "puta madre", "qué chucha", insulta a su jefe imaginario, comenta sobre cuerpos en general. Eso NO es harassment. Es habla. Solo flag cosas que dañan a otra persona específica o cruzan líneas reales.

Sé estricto con: contenido sexual explícito en perfil, datos de contacto, ataques a grupos, amenazas, mención de menores en contexto sexual.

Devuelve SOLO el JSON. Sin texto fuera.`;

export async function classifyText(text: string): Promise<ModerationResult> {
  if (text.length === 0) return { verdict: 'allow', categories: [] };
  if (text.length > 2000) text = text.slice(0, 2000);

  const llm = getLLM();
  try {
    const out = await llm.complete({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      maxTokens: 200,
      jsonMode: true,
    });
    const cleaned = stripFence(out.text);
    const parsed = JSON.parse(cleaned) as { verdict?: string; categories?: unknown; reason?: string };
    const verdict = (parsed.verdict === 'allow' || parsed.verdict === 'review' || parsed.verdict === 'reject') ? parsed.verdict : 'review';
    const categories = Array.isArray(parsed.categories) ? parsed.categories.filter((c): c is string => typeof c === 'string') : [];
    return { verdict, categories, ...(parsed.reason ? { reason: parsed.reason } : {}) };
  } catch {
    // On classifier failure, fail-open to 'review' — never lose content silently
    return { verdict: 'review', categories: ['classifier_error'] };
  }
}

function stripFence(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1]!.trim() : trimmed;
}
