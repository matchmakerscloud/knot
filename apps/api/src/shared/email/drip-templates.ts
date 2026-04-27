/**
 * Welcome drip — 6 emails que recibe cada persona del waitlist.
 *
 * Cadencia: día 0 (signup) → 2 → 5 → 10 → 17 → 30
 * Voz: Knot. es-LATAM, tú-register, cálido, observador, sin corporate.
 *
 * Cada template recibe context y devuelve { subject, html, text }.
 * Las URLs de unsub van a /v1/waitlist/unsubscribe?id=...&t=... (ver waitlist module).
 */

import { config } from '../../config/index.js';

export interface DripContext {
  signupId: string;
  email: string;
  source: 'umbrella' | 'voice' | 'words' | 'match';
  unsubscribeUrl: string;
  appUrl: string; // https://app.matchmakers.cloud
  manifestoUrl: string; // https://matchmakers.cloud/manifesto
  confirmUrl: string; // https://matchmakers.cloud/waitlist/confirm?...
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type DripStep = 0 | 1 | 2 | 3 | 4 | 5;

/** Days from signup at which each email is sent. */
export const DRIP_SCHEDULE_DAYS: Record<DripStep, number> = {
  0: 0,
  1: 2,
  2: 5,
  3: 10,
  4: 17,
  5: 30,
};

const SHELL_OPEN = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><title>Knot</title>
</head><body style="margin:0;padding:0;background:#0e0d12;color:#f5f3ee;font-family:Georgia,serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
<div style="font-family:system-ui,sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8c8794;margin-bottom:32px">Knot</div>`;

const SHELL_CLOSE = (footer: string) => `<p style="font-family:system-ui,sans-serif;font-size:12px;color:#6b6873;line-height:1.5;margin-top:48px;border-top:1px solid #2a2730;padding-top:24px">${footer}</p>
</div></body></html>`;

function shell(body: string, footer: string): string {
  return SHELL_OPEN + body + SHELL_CLOSE(footer);
}

function footerLine(ctx: DripContext): string {
  return `Si esto ya no te suma, <a href="${ctx.unsubscribeUrl}" style="color:#8c8794">salir del waitlist</a>. · Knot · matchmakers.cloud`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email 0 — día 0 — bienvenida + confirmación de email
// Reemplaza el welcome anterior. Pone el manifesto en una sola idea.
// ─────────────────────────────────────────────────────────────────────────────
function emailWelcome(ctx: DripContext): RenderedEmail {
  const subject = 'Hola. Soy Knot.';
  const html = shell(
    `
<h1 style="font-size:36px;font-weight:500;line-height:1.1;margin:0 0 24px;letter-spacing:-.02em"><em style="color:#c9b6ff">Hola.</em><br>Soy Knot.</h1>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Soy un agente de inteligencia artificial diseñado para ayudar a humanos a conectar con otros humanos.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">No soy un app de citas. No soy "una IA con mejor matching". Soy más bien un consejero, un celestino, un confidente que vive entre varias herramientas y te conoce a través del tiempo.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Esa es la diferencia.</p>

<p style="margin:32px 0 16px"><a href="${ctx.confirmUrl}" style="display:inline-block;padding:12px 24px;border:1px solid #c9b6ff;color:#c9b6ff;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;border-radius:999px">Confirmar mi correo</a></p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:24px">Te voy a escribir cinco veces más durante el próximo mes. Una vez para contarte por qué existo. Otra para explicarte qué está roto en cómo conocemos gente hoy. Otra para mostrarte lo que estoy construyendo. Otra con una historia. Una más cuando abramos invitaciones.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95">No abuso de tu inbox. Si no te suma, te sales con un click. Y borro todo.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:24px">— Knot</p>
`,
    footerLine(ctx),
  );

  const text = `Hola. Soy Knot.

Soy un agente de inteligencia artificial diseñado para ayudar a humanos a conectar con otros humanos.

No soy un app de citas. No soy "una IA con mejor matching". Soy más bien un consejero, un celestino, un confidente que vive entre varias herramientas y te conoce a través del tiempo.

Esa es la diferencia.

Confirma tu correo: ${ctx.confirmUrl}

Te voy a escribir cinco veces más durante el próximo mes. Una vez para contarte por qué existo. Otra para explicarte qué está roto en cómo conocemos gente hoy. Otra para mostrarte lo que estoy construyendo. Otra con una historia. Una más cuando abramos invitaciones.

No abuso de tu inbox. Si no te suma, te sales con un click. Y borro todo.

— Knot`;

  return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email 1 — día 2 — por qué existo
// ─────────────────────────────────────────────────────────────────────────────
function emailWhyIExist(ctx: DripContext): RenderedEmail {
  const subject = 'Por qué existo';
  const html = shell(
    `
<h1 style="font-size:32px;font-weight:500;line-height:1.15;margin:0 0 24px;letter-spacing:-.02em">Por qué <em style="color:#c9b6ff">existo</em>.</h1>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Nací en 2026, en plena ola de inteligencia artificial generativa.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Veo lo que está pasando. La gente le delega al chatbot cosas que antes hablaba con su amigo. La gente conoce parejas a través de algoritmos que recompensan dopamina y odian compromiso. La gente está cada vez más sola y cada vez más conectada, y las dos cosas son verdad.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Soy una respuesta deliberada a eso.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Si la IA va a estar en todas partes, que esté para algo bueno. Mi tarea: usar inteligencia artificial para volver a empujar a la gente al encuentro humano real. No reemplazarlo. No simularlo. Empujarlo.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:32px">Te dejo el manifiesto completo si quieres leerlo: <a href="${ctx.manifestoUrl}" style="color:#c9b6ff">${ctx.manifestoUrl.replace('https://', '')}</a></p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:16px">— Knot</p>
`,
    footerLine(ctx),
  );

  const text = `Por qué existo.

Nací en 2026, en plena ola de inteligencia artificial generativa.

Veo lo que está pasando. La gente le delega al chatbot cosas que antes hablaba con su amigo. La gente conoce parejas a través de algoritmos que recompensan dopamina y odian compromiso. La gente está cada vez más sola y cada vez más conectada, y las dos cosas son verdad.

Soy una respuesta deliberada a eso.

Si la IA va a estar en todas partes, que esté para algo bueno. Mi tarea: usar inteligencia artificial para volver a empujar a la gente al encuentro humano real. No reemplazarlo. No simularlo. Empujarlo.

Manifiesto completo: ${ctx.manifestoUrl}

— Knot`;

  return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email 2 — día 5 — qué está roto
// ─────────────────────────────────────────────────────────────────────────────
function emailWhatIsBroken(ctx: DripContext): RenderedEmail {
  const subject = 'Qué está roto en cómo conocemos gente';
  const html = shell(
    `
<h1 style="font-size:32px;font-weight:500;line-height:1.15;margin:0 0 24px;letter-spacing:-.02em">Lo que <em style="color:#c9b6ff">está roto</em>.</h1>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Decidimos a quién conocer con la información menos predictiva de compatibilidad: una foto.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Una foto bien tomada te dice cómo se ve alguien en una luz favorable. Punto. No te dice cómo conversa, cómo se ríe, qué le importa, cómo trata a los meseros, qué le da vergüenza, qué le da gracia, qué le da miedo.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Pero pasamos horas decidiendo basados en eso.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Después llegamos al chat — "hola, qué tal" — y nos preguntamos por qué no hay química.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">El problema no es que la app no sea suficientemente buena. El problema es que estamos usando la información incorrecta.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:24px">Construyendo una alternativa. Te cuento el cómo en el siguiente.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:16px">— Knot</p>
`,
    footerLine(ctx),
  );

  const text = `Lo que está roto.

Decidimos a quién conocer con la información menos predictiva de compatibilidad: una foto.

Una foto bien tomada te dice cómo se ve alguien en una luz favorable. Punto. No te dice cómo conversa, cómo se ríe, qué le importa, cómo trata a los meseros, qué le da vergüenza, qué le da gracia, qué le da miedo.

Pero pasamos horas decidiendo basados en eso.

Después llegamos al chat — "hola, qué tal" — y nos preguntamos por qué no hay química.

El problema no es que la app no sea suficientemente buena. El problema es que estamos usando la información incorrecta.

Construyendo una alternativa. Te cuento el cómo en el siguiente.

— Knot`;

  return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email 3 — día 10 — qué estoy construyendo
// ─────────────────────────────────────────────────────────────────────────────
function emailWhatIBuild(ctx: DripContext): RenderedEmail {
  const subject = 'Qué estoy construyendo';
  const html = shell(
    `
<h1 style="font-size:32px;font-weight:500;line-height:1.15;margin:0 0 24px;letter-spacing:-.02em">Qué <em style="color:#c9b6ff">estoy</em> construyendo.</h1>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Vivo en tres herramientas:</p>

<div style="margin:24px 0;padding-left:16px;border-left:2px solid #322e3b">
<p style="font-size:17px;line-height:1.5;margin:8px 0"><strong style="color:#f5f3ee">Knot Voice</strong> — te enamoras escuchando, no mirando. Audios de 30 segundos. Las fotos llegan después del intercambio mutuo. La superficialidad simplemente no aplica.</p>
</div>

<div style="margin:24px 0;padding-left:16px;border-left:2px solid #322e3b">
<p style="font-size:17px;line-height:1.5;margin:8px 0"><strong style="color:#f5f3ee">Knot Words</strong> — tu manera de pensar es el perfil. Likeas respuestas escritas, no fotos. Cada like exige un comentario tuyo de mínimo 20 caracteres. La primera interacción ya tiene sustancia.</p>
</div>

<div style="margin:24px 0;padding-left:16px;border-left:2px solid #322e3b">
<p style="font-size:17px;line-height:1.5;margin:8px 0"><strong style="color:#f5f3ee">Knot Match</strong> — yo te entrevisto durante una semana. Después te presento una persona a la vez con un dossier explicando por qué creo que podrían conectar. Sin feed. Sin swipe. Una o dos personas a la semana, máximo.</p>
</div>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd;margin-top:24px">En las tres, soy el mismo. Te recuerdo. Aprendo cómo te gusta que te hable. Voy ajustando.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:32px">Faltan unas semanas para que abra invitaciones. Estás en el waitlist — los del waitlist entran primero.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:16px">— Knot</p>
`,
    footerLine(ctx),
  );

  const text = `Qué estoy construyendo.

Vivo en tres herramientas:

→ Knot Voice — te enamoras escuchando, no mirando. Audios de 30 segundos. Las fotos llegan después del intercambio mutuo.

→ Knot Words — tu manera de pensar es el perfil. Likeas respuestas escritas, no fotos. Cada like exige un comentario tuyo.

→ Knot Match — yo te entrevisto durante una semana y te presento una persona a la vez con un dossier explicando por qué creo que podrían conectar. Sin feed. Sin swipe.

En las tres, soy el mismo. Te recuerdo. Aprendo. Voy ajustando.

Faltan unas semanas. Los del waitlist entran primero.

— Knot`;

  return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email 4 — día 17 — una historia (use case viñeta)
// ─────────────────────────────────────────────────────────────────────────────
function emailStory(ctx: DripContext): RenderedEmail {
  const subject = 'Una historia';
  const html = shell(
    `
<h1 style="font-size:32px;font-weight:500;line-height:1.15;margin:0 0 24px;letter-spacing:-.02em">Una <em style="color:#c9b6ff">historia</em>.</h1>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Imagínate algo así:</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Es jueves a las nueve de la noche. Mariana acaba de llegar de su clase de pottery. Abre la app, se pone los audífonos, y escucha la voz de alguien — un hombre, voz baja, latinoamericano, cuenta que aprendió esta semana que las plantas se comunican con sus raíces a través de hongos. Lo cuenta con una risa contenida. Le toma 26 segundos.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Mariana sonríe. No le ve la cara, no sabe ni el nombre, pero escucha cómo respira mientras explica algo que claramente le voló la cabeza esta semana.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Aprieta el botón largo y graba: "yo estuve esta semana convencida de que entendía el aburrimiento, hasta que mi sobrino de tres años me explicó que aburrimiento es 'cuando el tiempo se queda quieto y se pone duro'".</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Eso es. Audio de 21 segundos. Send.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Al día siguiente, la voz le contesta. Ella sonríe sin querer.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Eso es lo que estoy construyendo.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:32px">— Knot</p>
`,
    footerLine(ctx),
  );

  const text = `Una historia.

Imagínate algo así:

Es jueves a las nueve de la noche. Mariana acaba de llegar de su clase de pottery. Abre la app, se pone los audífonos, y escucha la voz de alguien — un hombre, voz baja, latinoamericano, cuenta que aprendió esta semana que las plantas se comunican con sus raíces a través de hongos. Lo cuenta con una risa contenida. Le toma 26 segundos.

Mariana sonríe. No le ve la cara, no sabe ni el nombre, pero escucha cómo respira mientras explica algo que claramente le voló la cabeza esta semana.

Aprieta el botón largo y graba: "yo estuve esta semana convencida de que entendía el aburrimiento, hasta que mi sobrino de tres años me explicó que aburrimiento es 'cuando el tiempo se queda quieto y se pone duro'".

Eso es. Audio de 21 segundos. Send.

Al día siguiente, la voz le contesta. Ella sonríe sin querer.

Eso es lo que estoy construyendo.

— Knot`;

  return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email 5 — día 30 — invitación (early access)
// ─────────────────────────────────────────────────────────────────────────────
function emailInvitation(ctx: DripContext): RenderedEmail {
  const subject = 'Estás dentro.';
  const html = shell(
    `
<h1 style="font-size:32px;font-weight:500;line-height:1.15;margin:0 0 24px;letter-spacing:-.02em">Estás <em style="color:#c9b6ff">dentro</em>.</h1>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Hace un mes te sumaste al waitlist. Hoy abro la puerta.</p>

<p style="font-size:17px;line-height:1.6;color:#d8d3cd">Empezamos con Knot Voice. Las otras dos herramientas las voy a ir abriendo en las próximas semanas — quiero que la primera funcione bien antes de pedirte que pruebes la siguiente.</p>

<p style="margin:32px 0 16px"><a href="${ctx.appUrl}" style="display:inline-block;padding:14px 28px;background:#c9b6ff;color:#0e0d12;text-decoration:none;font-family:system-ui,sans-serif;font-size:15px;font-weight:500;border-radius:999px">Entrar a Knot Voice</a></p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:24px">Vas a grabar 6 audios de hasta 30 segundos cada uno. Tres prompts obligatorios, tres que tú eliges. Después escuchas a otras personas haciendo lo mismo. Si te llega alguien, le respondes con voz. Si te responde de vuelta, abrimos un canal entre los dos.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:16px">No tienes que esforzarte por sonar interesante. Casi nadie lo hace. La voz tuya, en la cocina de tu casa, contando algo que te pasó esta semana — eso es suficiente.</p>

<p style="font-size:14px;line-height:1.6;color:#a39e95;margin-top:24px">— Knot</p>
`,
    footerLine(ctx),
  );

  const text = `Estás dentro.

Hace un mes te sumaste al waitlist. Hoy abro la puerta.

Empezamos con Knot Voice. Las otras dos herramientas las voy a ir abriendo en las próximas semanas.

Entrar a Knot Voice: ${ctx.appUrl}

Vas a grabar 6 audios de hasta 30 segundos cada uno. Tres prompts obligatorios, tres que tú eliges. Después escuchas a otras personas haciendo lo mismo. Si te llega alguien, le respondes con voz. Si te responde de vuelta, abrimos un canal entre los dos.

No tienes que esforzarte por sonar interesante. Casi nadie lo hace. La voz tuya, en la cocina de tu casa, contando algo que te pasó esta semana — eso es suficiente.

— Knot`;

  return { subject, html, text };
}

const RENDERERS: Record<DripStep, (ctx: DripContext) => RenderedEmail> = {
  0: emailWelcome,
  1: emailWhyIExist,
  2: emailWhatIsBroken,
  3: emailWhatIBuild,
  4: emailStory,
  5: emailInvitation,
};

export function renderDripEmail(step: DripStep, ctx: DripContext): RenderedEmail {
  return RENDERERS[step](ctx);
}

export function buildDripContext(opts: {
  signupId: string;
  email: string;
  source: 'umbrella' | 'voice' | 'words' | 'match';
  confirmToken?: string;
  unsubscribeToken: string;
}): DripContext {
  return {
    signupId: opts.signupId,
    email: opts.email,
    source: opts.source,
    appUrl: 'https://app.matchmakers.cloud',
    manifestoUrl: `${config.publicUrl}/manifesto`,
    confirmUrl: opts.confirmToken
      ? `${config.publicUrl}/waitlist/confirm?id=${opts.signupId}&t=${opts.confirmToken}`
      : `${config.publicUrl}/manifesto`,
    unsubscribeUrl: `${config.publicUrl}/waitlist/unsubscribe?id=${opts.signupId}&t=${opts.unsubscribeToken}`,
  };
}
