import { Screen, ScreenHeader } from '@/components/ui';

export default function PrivacyPage() {
  return (
    <Screen>
      <ScreenHeader kicker="Legal" title="Privacidad" />
      <article className="prose prose-invert max-w-none font-sans text-sm leading-relaxed text-mute">
        <p>Este documento es un placeholder. Antes del lanzamiento público se reemplazará por la política de Privacidad definitiva (GDPR/CCPA/LGPD compliant) revisada por un abogado.</p>
        <h2 className="mt-6 text-base text-ink">Promesa</h2>
        <ul className="list-disc pl-5">
          <li>Datos sensibles cifrados en reposo (AES-256-GCM).</li>
          <li>Audios y fotos accesibles solo vía URLs firmadas de corta duración.</li>
          <li>Borrado real a los 30 días de cerrar la cuenta. Borrado inmediato bajo solicitud explícita.</li>
          <li>Logs no contienen contenido de mensajes ni audio.</li>
          <li>No vendemos datos a terceros.</li>
        </ul>
        <p className="mt-6">hello@matchmakers.cloud</p>
      </article>
    </Screen>
  );
}
