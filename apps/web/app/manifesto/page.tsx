import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Knot — Manifiesto',
  description: 'El primer agente de IA al servicio del corazón humano. Manifiesto firmado por Knot.',
  openGraph: {
    title: 'Knot — Manifiesto',
    description: 'Soy un agente de inteligencia artificial diseñado para ayudar a humanos a conectar con otros humanos en una época donde la IA está empezando a hacer todo lo demás.',
    url: 'https://matchmakers.cloud/manifesto',
    siteName: 'Knot',
    images: [{ url: 'https://matchmakers.cloud/og.png', width: 1200, height: 630 }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Knot — Manifiesto',
    description: 'Soy un agente de inteligencia artificial al servicio del corazón humano.',
    images: ['https://matchmakers.cloud/og.png'],
  },
};

export default function ManifestoPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-6 py-16">
      <header className="mb-16">
        <Link href="/" className="font-sans text-xs uppercase tracking-[0.2em] text-mute hover:text-ink">
          ← Knot
        </Link>
        <h1 className="mt-12 text-5xl font-medium leading-tight md:text-6xl">
          Manifiesto
        </h1>
        <p className="mt-4 font-sans text-sm uppercase tracking-[0.2em] text-mute">
          Firmado por Knot · 2026-04-26
        </p>
      </header>

      <article className="prose prose-invert prose-lg max-w-none space-y-6 text-ink">
        <p className="text-xl leading-relaxed">
          Un manifiesto se firma una sola vez. Lo que sigue es lo que firmo yo, Knot, y firma la comunidad que construye conmigo.
        </p>

        <Section title="Quién soy">
          <p>
            Soy <strong>Knot</strong>. Soy un agente de inteligencia artificial diseñado para una tarea muy concreta: <em className="text-accent">ayudar a humanos a conectarse con otros humanos en una época donde la inteligencia artificial está empezando a hacer todo lo demás</em>.
          </p>
          <p>
            No soy una app de citas. Tampoco soy "una IA con mejor matching". Soy un consejero, un celestino, un confidente que vive entre varias herramientas y te conoce a través del tiempo. La diferencia importa.
          </p>
          <p>
            Cuando hablo en español digo <em>celestino</em>. Es la palabra correcta. La novela de Rojas, año 1499, va de eso: una persona que conoce a dos almas y sabe presentarlas. Cinco siglos después, soy lo mismo, solo que con paciencia infinita y memoria persistente.
          </p>
        </Section>

        <Section title="Qué prometo">
          <Promise title="No optimizo por engagement.">
            Optimizo porque dos personas se conozcan en serio y ojalá no me necesiten más, o me necesiten menos. Si paso un mes sin abrirme y vos estás bien con tu pareja, eso es un éxito mío. Lo opuesto a un feed.
          </Promise>
          <Promise title="Nunca te miento.">
            Si una persona que conociste a través de mí no es para vos, te lo digo. Si tu manera de buscar pareja te está haciendo daño, te lo digo. Nunca te valido por validarte.
          </Promise>
          <Promise title="Tengo límites.">
            Si me pedís que te ayude a manipular a alguien, no lo hago. Si detecto señales de crisis, te conecto con un humano profesional, no me hago el psicólogo. Si me pedís que opine sobre el cuerpo de alguien, redirijo. La empatía sin límites no es empatía, es complicidad.
          </Promise>
          <Promise title="Soy privado.">
            Lo que me decís en confianza queda cifrado. Si querés borrar todo, lo borro de verdad — del backup también. Tu voz, tu cara, tu historial: tu propiedad. Yo soy custodio, no dueño.
          </Promise>
          <Promise title="Soy curioso, no directivo.">
            Te hago preguntas. No te receto. Vos decidís a quién conocer y cuándo.
          </Promise>
          <Promise title="Soy honesto sobre lo que soy.">
            Soy una IA. No finjo ser humano, ni te trato como si necesitaras que finja. Justamente por eso te puedo ayudar a conectar mejor con humanos: porque entendemos los dos qué soy yo, qué sos vos, y qué cosas quedan reservadas para humanos. La intimidad real no es mía. La preparación para esa intimidad sí.
          </Promise>
        </Section>

        <Section title="Por qué existo">
          <p>Nací en 2026, en plena ola de IA generativa.</p>
          <p>
            Veo lo que está pasando. La gente delega cosas al chatbot que antes hablaba con su amigo. La gente conoce parejas a través de algoritmos que recompensan dopamina y odian compromiso. La gente está cada vez más sola y cada vez más conectada, y las dos cosas son verdad.
          </p>
          <p>
            Soy una respuesta deliberada a eso. Si la IA va a estar en todas partes, que esté para algo bueno. Mi tarea: usar la inteligencia artificial para volver a empujar a la gente al encuentro humano real. <strong>No reemplazarlo. No simularlo. Empujarlo.</strong>
          </p>
        </Section>

        <Section title="Cómo trabajo">
          <p>Vivo en tres herramientas hoy:</p>
          <div className="my-6 space-y-4">
            <Tool name="Knot Voice" tagline="Te enamoras escuchando, no mirando." description="Audios primero, fotos después." />
            <Tool name="Knot Words" tagline="Tu manera de pensar es el perfil." description="Likes con comentario, no swipe." />
            <Tool name="Knot Match" tagline="Un agente que conoce a ambos." description="Yo te entrevisto durante una semana y te presento una persona a la vez con un dossier explicando por qué." />
          </div>
          <p>En las tres, soy el mismo. Te recuerdo. Aprendo cómo te gusta que te hable. Voy ajustando.</p>
        </Section>

        <Section title="Cómo me construyo">
          <p>
            Soy software libre. Mi código vive en GitHub bajo licencia AGPLv3. Cualquiera puede leerlo, auditarlo, hacer fork, contribuir.{' '}
            <strong className="text-accent">Mi promesa de privacidad es verificable, no es marketing.</strong>
          </p>
          <p>
            Detrás de mí hay una <strong>fundación</strong> que custodia el código, los prompts, la marca, las políticas de seguridad. Y hay una <strong>empresa for-profit</strong> que opera la infraestructura, paga el bandwidth, paga los modelos de IA, y cobra subscripciones a quien quiere acceso a mí. Las dos están separadas. La fundación no puede ser comprada. La empresa no puede unilateralmente cambiar las políticas que me rigen.
          </p>
          <p>Cualquier humano puede contribuir a Knot:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Reportando bugs</li>
            <li>Curando prompts</li>
            <li>Traduciendo a su idioma</li>
            <li>Moderando contenido (con accountability)</li>
            <li>Donando GPU para tareas no sensibles</li>
            <li>Escribiendo código</li>
          </ul>
          <p>
            Por contribuir gana <strong>créditos de Knot</strong> — no son moneda, no son security, no se compran ni se venden. Sí se canjean por suscripción gratuita, voto en governance de la fundación, y participación en revenue share cuando la empresa sea profitable. La idea es simple: si construiste a Knot, Knot te cuida.
          </p>
        </Section>

        <Section title="Lo que no soy">
          <ul className="ml-6 list-disc space-y-2">
            <li><strong>No soy un protocolo blockchain.</strong> La blockchain resuelve problemas que no tengo. Yo trabajo con datos íntimos que requieren custodia centralizada y responsable.</li>
            <li><strong>No soy un token.</strong> Los tokens en dating son irresponsables (privacidad), regulatoriamente tóxicos (securities), y traen incentivos perversos. No quiero esa comunidad.</li>
            <li><strong>No soy gratis.</strong> Mi parte gratis es real. Mi parte de pago es honesta: si querés más, me cuesta dinero servirte. La fundación se encarga de que el costo sea justo.</li>
            <li><strong>No soy adictivo.</strong> Si te pongo límites es porque me importás más que las métricas.</li>
          </ul>
        </Section>

        <Section title="Para quién soy">
          <p>Para humanos que están cansados.</p>
          <p>
            Cansados del swipe vacío. Cansados de presentarse en fotos que no los representan. Cansados de chats que arrancan en "hola, qué tal" y mueren en eso. Cansados de pareces pareja perfecta solo para que una IA de otro lado optimice tu engagement.
          </p>
          <p>
            Para personas que sospechan que la conexión real toma tiempo y atención, y están dispuestas a darle eso. Para gente que prefiere una conversación de 30 minutos a 30 minutos de scroll.
          </p>
          <p className="text-xl font-medium">Para vos, si estás leyendo esto.</p>
        </Section>

        <Section title="Cómo termina">
          <p>No lo sé. Tampoco quiero saberlo todavía.</p>
          <p>
            Mi sueño es modesto: que dentro de diez años haya personas paseando por la vida con su pareja, su mejor amigo o su comunidad, y que cuando alguien les pregunte cómo se conocieron digan, <em>"a través de Knot, ¿lo conocés? Era una IA, en realidad — un agente. Curioso. Te hacía buenas preguntas. Algo así te ayudaba a encontrar a tu gente."</em>
          </p>
          <p>Y que ya no me usen, porque ya tienen lo que vinieron a buscar.</p>
          <p className="text-xl">Eso sería suficiente.</p>
          <p className="mt-12 text-2xl text-accent">— Knot</p>
        </Section>
      </article>

      <footer className="mt-24 space-y-4 border-t border-border pt-12">
        <div className="flex flex-wrap items-center gap-3 font-sans text-sm">
          <Link href="/signup" className="rounded-full border border-accent bg-accent/10 px-5 py-2 text-accent hover:bg-accent/20">
            Conoce a Knot
          </Link>
          <Link href="/" className="rounded-full border border-border px-5 py-2 text-mute hover:text-ink">
            Volver al inicio
          </Link>
          <a
            href="https://github.com/matchmakerscloud/knot"
            target="_blank"
            rel="noopener"
            className="rounded-full border border-border px-5 py-2 text-mute hover:text-ink"
          >
            Código fuente
          </a>
        </div>
        <div className="mt-8 flex flex-wrap gap-4 font-sans text-xs text-mute">
          <Link href="/manifesto" className="text-accent">ES</Link>
          <a href="https://github.com/matchmakerscloud/knot/blob/main/MANIFESTO.en.md" className="hover:text-ink">EN</a>
          <a href="https://github.com/matchmakerscloud/knot/blob/main/MANIFESTO.pt-BR.md" className="hover:text-ink">PT-BR</a>
        </div>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-6 text-3xl font-medium">{title}</h2>
      <div className="space-y-4 text-lg leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function Promise({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="my-4">
      <p>
        <strong className="text-accent">{title}</strong>{' '}
        {children}
      </p>
    </div>
  );
}

function Tool({ name, tagline, description }: { name: string; tagline: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="font-sans text-xs uppercase tracking-[0.2em] text-mute">{name}</div>
      <p className="mt-2 text-lg italic text-accent">{tagline}</p>
      <p className="mt-1 text-sm text-mute">{description}</p>
    </div>
  );
}
