# @knot/mobile

App móvil de Knot (iOS + Android) construida con React Native + Expo.

## Estructura

```
src/
├── apps/
│   ├── voice/         # Pantallas y lógica de Knot Voice
│   ├── words/         # Pantallas y lógica de Knot Words
│   └── match/         # Pantallas y lógica de Knot Match
├── shared/
│   ├── components/    # Componentes UI reutilizables
│   ├── hooks/         # Hooks custom
│   ├── stores/        # Zustand stores
│   ├── api/           # Cliente API tipado
│   └── theme/         # Tokens de diseño
├── navigation/        # Configuración de Expo Router
└── i18n/              # Traducciones
```

## Comandos

```bash
pnpm start              # Levantar Expo dev server
pnpm ios                # Abrir en simulador iOS
pnpm android            # Abrir en emulador Android
pnpm typecheck          # Verificar tipos
pnpm test               # Tests unitarios
```

## Notas para Claude Code

- Usar `expo-av` para grabación y reproducción de audio en Voice.
- Estado global con Zustand, datos del servidor con TanStack Query.
- No instalar librerías de UI completas (NativeBase, Tamagui). Construir componentes propios sobre primitivos de RN.
- Tokens en `expo-secure-store`, datos en cache local con `react-native-mmkv`.
- Antes de codear cualquier pantalla, leer la spec correspondiente en `/docs/`.
