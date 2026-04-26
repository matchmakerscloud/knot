import { config } from '../../config/index.js';

const SOURCE_COPY = {
  umbrella: {
    title: 'Knot',
    tagline: 'El dating no se ve, se siente.',
    body: 'Te avisaremos cuando abramos el waitlist completo. Si quieres una experiencia particular antes que el resto, escribe a hello@matchmakers.cloud y dinos por qué.',
  },
  voice: {
    title: 'Knot Voice',
    tagline: 'Te enamoras escuchando, no mirando.',
    body: 'Estamos a unas semanas de abrir invitaciones. Cuando suceda, los del waitlist entran primero. Mientras tanto, piensa en una historia de 30 segundos que dirías sobre ti.',
  },
  words: {
    title: 'Knot Words',
    tagline: 'Tu manera de pensar es el perfil.',
    body: 'Estamos curando los 40 prompts que conformarán tu primer perfil. Cuando estemos listos, los del waitlist son los primeros en entrar.',
  },
  match: {
    title: 'Knot Match',
    tagline: 'Un agente que conoce a ambos.',
    body: 'Knot Match es premium-only y abre con cohortes pequeñas. Cuando llegue tu turno, te enviaremos un link personal. La conversación con la IA es la mejor primera cita que vas a tener.',
  },
} as const;

export type WaitlistSource = keyof typeof SOURCE_COPY;

export function buildWelcomeEmail(opts: {
  email: string;
  source: WaitlistSource;
  confirmToken: string;
  signupId: string;
}): { subject: string; html: string; text: string } {
  const copy = SOURCE_COPY[opts.source];
  const confirmUrl = `${config.publicUrl}/waitlist/confirm?id=${opts.signupId}&t=${opts.confirmToken}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${copy.title}</title></head>
<body style="margin:0;padding:0;background:#0e0d12;color:#f5f3ee;font-family:Georgia,serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <div style="font-family:system-ui,sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8c8794;margin-bottom:32px">Knot${opts.source !== 'umbrella' ? ' / ' + copy.title.replace('Knot ', '') : ''}</div>
    <h1 style="font-size:36px;font-weight:500;line-height:1.1;margin:0 0 16px;letter-spacing:-.02em"><em style="color:#c9b6ff">${copy.tagline}</em></h1>
    <p style="font-size:17px;line-height:1.6;color:#d8d3cd;margin:24px 0">Gracias por sumarte. Estás en el waitlist de <strong>${copy.title}</strong>.</p>
    <p style="font-size:15px;line-height:1.6;color:#a39e95;margin:16px 0">${copy.body}</p>
    <p style="margin:32px 0 16px"><a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;border:1px solid #c9b6ff;color:#c9b6ff;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;border-radius:999px">Confirmar mi correo</a></p>
    <p style="font-family:system-ui,sans-serif;font-size:12px;color:#6b6873;line-height:1.5;margin-top:48px;border-top:1px solid #2a2730;padding-top:24px">Si no solicitaste esto, ignora este correo. Knot · matchmakers.cloud · matchmaking.cloud</p>
  </div>
</body></html>`;

  const text = `${copy.title} — ${copy.tagline}

Gracias por sumarte. Estás en el waitlist de ${copy.title}.

${copy.body}

Confirma tu correo: ${confirmUrl}

Knot · matchmakers.cloud · matchmaking.cloud`;

  return {
    subject: `${copy.title} — confirma tu correo`,
    html,
    text,
  };
}
