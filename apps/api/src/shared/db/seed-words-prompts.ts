import { db } from './client.js';
import { wordsPrompts } from './schema/words.js';
import { and, eq } from 'drizzle-orm';

interface Seed { text: string; category: string; locale: 'es' | 'en' | 'pt-BR' }

const PROMPTS: Seed[] = [
  // ES — values
  { locale: 'es', category: 'values', text: 'Una creencia que tienes y por la que estarías dispuesto a defender en una cena.' },
  { locale: 'es', category: 'values', text: 'Algo en lo que has cambiado de opinión en los últimos años.' },
  { locale: 'es', category: 'values', text: 'Una decisión que tomaste contra el consejo de los demás y no te arrepientes.' },
  { locale: 'es', category: 'values', text: 'Algo que te parece sobrevalorado y por qué.' },
  { locale: 'es', category: 'values', text: 'Algo que te parece subvalorado y por qué.' },
  // ES — personality
  { locale: 'es', category: 'personality', text: 'Tu autocrítica favorita sobre ti mismo.' },
  { locale: 'es', category: 'personality', text: 'Algo absurdo que te hace inexplicablemente feliz.' },
  { locale: 'es', category: 'personality', text: 'El tipo de drama del que sí participas.' },
  { locale: 'es', category: 'personality', text: 'Una hipocresía tuya que reconoces.' },
  { locale: 'es', category: 'personality', text: 'Lo más nerd de ti.' },
  // ES — daily
  { locale: 'es', category: 'daily', text: 'Tu ritual matutino más raro.' },
  { locale: 'es', category: 'daily', text: 'El tipo de noche perfecta que tienes con tus amigos cercanos.' },
  { locale: 'es', category: 'daily', text: 'Una manía que sabes que es irracional pero igual la tienes.' },
  { locale: 'es', category: 'daily', text: 'El último mensaje que enviaste que te hace ver mal.' },
  { locale: 'es', category: 'daily', text: 'Una pequeña victoria de ayer.' },
  // ES — relationships
  { locale: 'es', category: 'relationships', text: 'Cómo te das cuenta que estás cómodo con alguien.' },
  { locale: 'es', category: 'relationships', text: 'Algo que aprendiste de una relación anterior.' },
  { locale: 'es', category: 'relationships', text: 'Tu green flag favorita en otras personas.' },
  { locale: 'es', category: 'relationships', text: 'Lo que haces para hacer reír a alguien que te gusta.' },
  { locale: 'es', category: 'relationships', text: 'Algo que valoras en una pareja que la mayoría no menciona.' },
  // ES — ambition
  { locale: 'es', category: 'ambition', text: 'Algo que estás trabajando en mejorar este año.' },
  { locale: 'es', category: 'ambition', text: 'Una habilidad que te gustaría dominar antes de los 60.' },
  { locale: 'es', category: 'ambition', text: 'Lo que harías con un mes libre completo y sin culpa.' },
  { locale: 'es', category: 'ambition', text: 'Algo que te emociona que esté pasando en el mundo ahora.' },
  { locale: 'es', category: 'ambition', text: 'Una conversación que te gustaría tener pero te falta el contexto.' },
];

async function main() {
  let inserted = 0, skipped = 0;
  for (const p of PROMPTS) {
    const ex = await db.select({ id: wordsPrompts.id }).from(wordsPrompts).where(and(eq(wordsPrompts.text, p.text), eq(wordsPrompts.locale, p.locale))).limit(1);
    if (ex.length > 0) { skipped++; continue; }
    await db.insert(wordsPrompts).values(p);
    inserted++;
  }
  console.log(`words_prompts seed: inserted=${inserted}, skipped=${skipped}`);
  process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
