# @knot/admin

Panel interno de moderación para el equipo de Knot. No es customer-facing.

## Funcionalidades planeadas

- Gestión de usuarios (suspender, verificar, ver historial)
- Cola de moderación (audios pendientes, reportes, respuestas en review)
- Cola de revisión de dossiers de Knot Match (humano-en-el-loop)
- Métricas operacionales en tiempo real
- Gestión de prompts (Voice + Words)
- Feature flags

## Stack

Next.js 14 + shadcn/ui (a diferencia del resto, aquí sí usamos lib UI lista —no hay tiempo a perder en branding interno).

Auth: OAuth con Google Workspace del equipo.
