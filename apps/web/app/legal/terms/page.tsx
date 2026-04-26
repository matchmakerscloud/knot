import { Screen, ScreenHeader } from '@/components/ui';

export default function TermsPage() {
  return (
    <Screen>
      <ScreenHeader kicker="Legal" title="Términos de servicio" />
      <article className="prose prose-invert max-w-none font-sans text-sm leading-relaxed text-mute">
        <p>Este documento es un placeholder. Antes del lanzamiento público se reemplazará por los Términos definitivos revisados por un abogado.</p>
        <p>Knot es una marca operada por Mario Feres. Mientras estamos en pre-launch, el uso de la plataforma se limita a personas mayores de 18 años. Nos reservamos el derecho de suspender cuentas que infrinjan reglas básicas de respeto, seguridad o veracidad.</p>
        <p className="mt-6">hello@matchmakers.cloud</p>
      </article>
    </Screen>
  );
}
