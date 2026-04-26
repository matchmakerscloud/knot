import { db } from './client.js';
import { voicePrompts } from './schema/voice.js';
import { eq, and } from 'drizzle-orm';

interface SeedPrompt {
  text: string;
  category: 'mandatory' | 'elective';
  locale: 'es' | 'en' | 'pt-BR';
}

const PROMPTS: SeedPrompt[] = [
  // ============================================================================
  // ES — mandatory (rotate weekly in production)
  // ============================================================================
  { locale: 'es', category: 'mandatory', text: 'Cuéntame de la última vez que te reíste hasta llorar.' },
  { locale: 'es', category: 'mandatory', text: 'Algo que aprendiste recientemente que te voló la cabeza.' },
  { locale: 'es', category: 'mandatory', text: 'Tu opinión impopular sobre algo cotidiano.' },

  // ES — elective pool
  { locale: 'es', category: 'elective', text: 'Describe tu domingo perfecto.' },
  { locale: 'es', category: 'elective', text: 'Una cosa que te emociona del futuro.' },
  { locale: 'es', category: 'elective', text: 'El compliment que más recuerdas haber recibido.' },
  { locale: 'es', category: 'elective', text: 'Tu canción favorita y por qué.' },
  { locale: 'es', category: 'elective', text: 'Algo que harías si tuvieras un mes libre.' },
  { locale: 'es', category: 'elective', text: 'La conversación más interesante que tuviste este año.' },
  { locale: 'es', category: 'elective', text: 'Un lugar al que sueñas con volver.' },
  { locale: 'es', category: 'elective', text: 'Algo que aprendiste de tu mejor amigo o amiga.' },
  { locale: 'es', category: 'elective', text: 'El último libro, serie o película que te marcó.' },
  { locale: 'es', category: 'elective', text: 'Una habilidad que querrías tener mañana mismo.' },
  { locale: 'es', category: 'elective', text: 'Tu mañana ideal.' },
  { locale: 'es', category: 'elective', text: 'Algo que te hace sentir orgulloso o orgullosa de ti.' },
  { locale: 'es', category: 'elective', text: 'Un consejo que le darías a tu yo de 18 años.' },
  { locale: 'es', category: 'elective', text: 'El mejor regalo que has recibido o dado.' },
  { locale: 'es', category: 'elective', text: 'Una causa por la que te involucras.' },

  // ============================================================================
  // EN — mandatory
  // ============================================================================
  { locale: 'en', category: 'mandatory', text: 'Tell me about the last time you laughed until you cried.' },
  { locale: 'en', category: 'mandatory', text: 'Something you learned recently that blew your mind.' },
  { locale: 'en', category: 'mandatory', text: 'Your unpopular opinion about something everyday.' },

  // EN — elective
  { locale: 'en', category: 'elective', text: 'Describe your perfect Sunday.' },
  { locale: 'en', category: 'elective', text: 'Something you are excited about for the future.' },
  { locale: 'en', category: 'elective', text: 'The compliment you remember most receiving.' },
  { locale: 'en', category: 'elective', text: 'Your favorite song and why.' },
  { locale: 'en', category: 'elective', text: 'Something you would do with a free month.' },
  { locale: 'en', category: 'elective', text: 'The most interesting conversation you had this year.' },
  { locale: 'en', category: 'elective', text: 'A place you dream of returning to.' },
  { locale: 'en', category: 'elective', text: 'Something you learned from your best friend.' },
  { locale: 'en', category: 'elective', text: 'The last book, show, or film that marked you.' },
  { locale: 'en', category: 'elective', text: 'A skill you wish you had tomorrow.' },
  { locale: 'en', category: 'elective', text: 'Your ideal morning.' },
  { locale: 'en', category: 'elective', text: 'Something that makes you feel proud of yourself.' },
  { locale: 'en', category: 'elective', text: 'Advice you would give your 18-year-old self.' },
  { locale: 'en', category: 'elective', text: 'The best gift you have received or given.' },
  { locale: 'en', category: 'elective', text: 'A cause you are involved with.' },

  // ============================================================================
  // pt-BR — mandatory
  // ============================================================================
  { locale: 'pt-BR', category: 'mandatory', text: 'Me conta da última vez que você riu até chorar.' },
  { locale: 'pt-BR', category: 'mandatory', text: 'Algo que você aprendeu recentemente que te explodiu a cabeça.' },
  { locale: 'pt-BR', category: 'mandatory', text: 'Sua opinião impopular sobre algo cotidiano.' },

  // pt-BR — elective
  { locale: 'pt-BR', category: 'elective', text: 'Descreva seu domingo perfeito.' },
  { locale: 'pt-BR', category: 'elective', text: 'Algo que te empolga sobre o futuro.' },
  { locale: 'pt-BR', category: 'elective', text: 'O elogio que você mais lembra ter recebido.' },
  { locale: 'pt-BR', category: 'elective', text: 'Sua música favorita e por quê.' },
  { locale: 'pt-BR', category: 'elective', text: 'Algo que você faria com um mês livre.' },
  { locale: 'pt-BR', category: 'elective', text: 'A conversa mais interessante que você teve este ano.' },
  { locale: 'pt-BR', category: 'elective', text: 'Um lugar para o qual você sonha em voltar.' },
  { locale: 'pt-BR', category: 'elective', text: 'Algo que você aprendeu com seu melhor amigo ou amiga.' },
  { locale: 'pt-BR', category: 'elective', text: 'O último livro, série ou filme que te marcou.' },
  { locale: 'pt-BR', category: 'elective', text: 'Uma habilidade que você gostaria de ter amanhã.' },
  { locale: 'pt-BR', category: 'elective', text: 'Sua manhã ideal.' },
  { locale: 'pt-BR', category: 'elective', text: 'Algo que te faz sentir orgulho de si mesmo.' },
  { locale: 'pt-BR', category: 'elective', text: 'Um conselho que você daria ao seu eu de 18 anos.' },
  { locale: 'pt-BR', category: 'elective', text: 'O melhor presente que você recebeu ou deu.' },
  { locale: 'pt-BR', category: 'elective', text: 'Uma causa pela qual você se envolve.' },
];

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const p of PROMPTS) {
    const existing = await db
      .select({ id: voicePrompts.id })
      .from(voicePrompts)
      .where(and(eq(voicePrompts.text, p.text), eq(voicePrompts.locale, p.locale)))
      .limit(1);
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(voicePrompts).values({ text: p.text, category: p.category, locale: p.locale });
    inserted++;
  }
  console.log(`voice_prompts seed: inserted=${inserted}, skipped=${skipped} (already present)`);
  process.exit(0);
}

main().catch((err) => {
  console.error('voice_prompts seed failed:', err);
  process.exit(1);
});
