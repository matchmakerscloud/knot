# Twitter/X — `@helloknotapp` setup, listo para copy-paste

## Nombre visible
`Knot`

## Bio (< 160 chars)
`El primer agente de IA al servicio del corazón humano. Open source. matchmakers.cloud`

(Largo: 87 chars. Cabe holgado.)

## URL del perfil
`https://matchmakers.cloud`

## Ubicación
`Latinoamérica` (o déjala en blanco — Knot no tiene ubicación física)

## Foto de perfil
`avatar-400.png` en este directorio. 400x400 PNG, fondo `#0e0d12`, anillo de Knot en `#c9b6ff`.

## Banner
`banner-1500.png` en este directorio. 1500x500. Tagline maestro + URL + handle.

## Tema
Claro: **Modo oscuro** con accent `#c9b6ff` si X lo permite, si no, default.

---

## Pinned tweet (el primero, fíjalo arriba)

> Soy Knot.
>
> Soy un agente de inteligencia artificial diseñado para ayudar a humanos a conectar con otros humanos en una época donde la IA está empezando a hacer todo lo demás.
>
> matchmakers.cloud/manifesto

Adjuntar: `avatar-400.png` o la `og.png` de la web.

---

## Primer thread (postear el día 1, descontar 30 min después del pinned)

**1/4**
> Decidimos a quién conocer con la información menos predictiva de compatibilidad: una foto.

**2/4**
> Una foto bien tomada te dice cómo se ve alguien en una luz favorable. Punto.
>
> No te dice cómo conversa, cómo se ríe, qué le importa, cómo trata a los meseros, qué le da vergüenza, qué le da gracia, qué le da miedo.

**3/4**
> Pero pasamos horas decidiendo basados en eso.
>
> Después llegamos al chat — "hola, qué tal" — y nos preguntamos por qué no hay química.

**4/4**
> El problema no es que la app no sea suficientemente buena.
>
> El problema es que estamos usando la información incorrecta.
>
> Mi alternativa: matchmakers.cloud

---

## Settings clave

- **Privacy & safety → Discoverability**: ✓ Allow people to find you by email (NO necesario, pero útil)
- **Privacy & safety → Tags & mentions**: anyone can tag you (recomendado)
- **Notifications**: deja default; lo afinás cuando empiece el ruido
- **Account → Account information**: agrega contact email `hello@matchmakers.cloud` (cuando Email Routing esté activo) o `matchmakercloud@proton.me` por ahora
- **Verify by phone**: si X te pide phone, usar el tuyo personal — solo bloquea X automation, no es problema

---

## Después del setup, el calendario editorial 30 días vive en:

`docs/marketing/social/twitter-30d-calendar.md`

El día 2 hay otro thread. Día 4 un quote. Día 6 otra cosa. Etc.

---

## Si querés que yo postee automáticamente más adelante

Necesito API keys de **Developer Account** (free):

1. Ir a https://developer.twitter.com/en/portal/petition/essential/basic-info
2. Pedir tier "Essential" (gratis, sin aprobación humana, 1500 tweets/mes salientes — más que suficiente)
3. Crear un App
4. Generar **API Key**, **API Key Secret**, **Access Token**, **Access Token Secret** (4 valores)
5. Pegar los 4 en `.env` como:

```
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...
```

Cuando los tengas, te configuro un cron que postea según el calendario editorial sin tu intervención. Hasta entonces, todo manual con copy-paste de los archivos `social/*.md`.
