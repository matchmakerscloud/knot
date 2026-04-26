# Modelo de datos

Schema de PostgreSQL para Knot. Comparte la mayoría de tablas entre las tres apps con discriminadores de modo cuando aplica.

## Convenciones

- Todas las tablas tienen `id UUID DEFAULT gen_random_uuid()`.
- Toda tabla tiene `created_at` y `updated_at` (timestamptz, default now()).
- Soft delete con `deleted_at TIMESTAMPTZ NULL` cuando aplica.
- FKs siempre con `ON DELETE` explícito.
- Índices en toda FK y en columnas usadas en filtros/sorts.
- Nombres de tablas en plural snake_case.
- Enums via `CREATE TYPE` para valores fijos.

## Tablas core (compartidas entre las tres apps)

### users

```sql
CREATE TYPE user_status AS ENUM ('pending_verification', 'active', 'suspended', 'deleted');
CREATE TYPE gender AS ENUM ('male', 'female', 'non_binary', 'prefer_not_to_say', 'other');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender gender NOT NULL,
  gender_other_label TEXT,
  status user_status NOT NULL DEFAULT 'pending_verification',
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  identity_verified_at TIMESTAMPTZ,
  locale TEXT NOT NULL DEFAULT 'es',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_last_active ON users(last_active_at DESC) WHERE deleted_at IS NULL;
```

### user_apps

Qué apps tiene activas el usuario.

```sql
CREATE TYPE app_kind AS ENUM ('voice', 'words', 'match');

CREATE TABLE user_apps (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app app_kind NOT NULL,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, app)
);
```

### user_preferences

Preferencias de matching.

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  interested_in gender[] NOT NULL,
  age_min INT NOT NULL CHECK (age_min >= 18),
  age_max INT NOT NULL CHECK (age_max >= age_min),
  max_distance_km INT,
  location_city TEXT,
  location_country TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_pref_location ON user_preferences USING gist (
  ll_to_earth(location_lat, location_lng)
);
```

### photos

Fotos del usuario, bloqueadas por defecto.

```sql
CREATE TYPE photo_visibility AS ENUM ('locked', 'unlocked_after_match', 'public');

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  position INT NOT NULL,
  visibility photo_visibility NOT NULL DEFAULT 'unlocked_after_match',
  width INT NOT NULL,
  height INT NOT NULL,
  blur_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, position)
);
```

### auth_sessions

```sql
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  device_id TEXT,
  device_name TEXT,
  user_agent TEXT,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON auth_sessions(user_id) WHERE revoked_at IS NULL;
```

## Knot Voice — tablas

### voice_prompts

Catálogo de prompts disponibles. Curados por equipo, no user-generated.

```sql
CREATE TYPE voice_prompt_category AS ENUM ('mandatory', 'elective');

CREATE TABLE voice_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  locale TEXT NOT NULL,
  category voice_prompt_category NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### voice_recordings

Audios de los usuarios respondiendo a prompts.

```sql
CREATE TYPE voice_recording_status AS ENUM ('processing', 'active', 'rejected', 'archived');

CREATE TABLE voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES voice_prompts(id),
  prompt_text_snapshot TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  duration_seconds NUMERIC(4,2) NOT NULL CHECK (duration_seconds BETWEEN 1 AND 30),
  waveform_peaks JSONB NOT NULL,
  transcript TEXT,
  status voice_recording_status NOT NULL DEFAULT 'processing',
  rejection_reason TEXT,
  position INT NOT NULL,
  listened_count INT NOT NULL DEFAULT 0,
  saved_count INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, position)
);

CREATE INDEX idx_voice_recordings_user_active ON voice_recordings(user_id) WHERE status = 'active';
CREATE INDEX idx_voice_recordings_active_recent ON voice_recordings(created_at DESC) WHERE status = 'active';
```

### voice_fingerprints

```sql
CREATE TABLE voice_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  embedding vector(192) NOT NULL,
  source_recording_id UUID REFERENCES voice_recordings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_fp_user ON voice_fingerprints(user_id);
```

### voice_feed_events

Tracking de qué audios vio cada usuario.

```sql
CREATE TYPE voice_feed_action AS ENUM ('viewed', 'listened_partial', 'listened_full', 'saved', 'replied', 'skipped');

CREATE TABLE voice_feed_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES voice_recordings(id) ON DELETE CASCADE,
  action voice_feed_action NOT NULL,
  duration_listened_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vfe_user_recent ON voice_feed_events(user_id, created_at DESC);
CREATE INDEX idx_vfe_recording ON voice_feed_events(recording_id);
```

## Knot Words — tablas

### words_prompts

```sql
CREATE TABLE words_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  locale TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### words_responses

```sql
CREATE TYPE words_response_status AS ENUM ('draft', 'pending_review', 'active', 'rejected', 'archived');

CREATE TABLE words_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES words_prompts(id),
  prompt_text_snapshot TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 100 AND 280),
  position INT NOT NULL,
  status words_response_status NOT NULL DEFAULT 'pending_review',
  rejection_reason TEXT,
  embedding vector(1536),
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, position)
);

CREATE INDEX idx_words_resp_active_user ON words_responses(user_id) WHERE status = 'active';
CREATE INDEX idx_words_resp_embedding ON words_responses USING ivfflat (embedding vector_cosine_ops) WHERE status = 'active';
```

### words_likes

```sql
CREATE TYPE words_like_status AS ENUM ('pending', 'replied', 'expired', 'declined');

CREATE TABLE words_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES words_responses(id) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (length(comment) >= 20),
  status words_like_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (liker_id, liked_user_id)
);

CREATE INDEX idx_words_likes_received ON words_likes(liked_user_id, status, created_at DESC);
```

## Knot Match — tablas

### match_profiles

Perfil semántico generado por la IA durante onboarding.

```sql
CREATE TYPE match_onboarding_status AS ENUM ('not_started', 'in_progress', 'awaiting_review', 'complete');

CREATE TABLE match_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  onboarding_status match_onboarding_status NOT NULL DEFAULT 'not_started',
  onboarding_started_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,
  semantic_summary TEXT,
  values_json JSONB,
  preferences_narrative TEXT,
  public_narrative TEXT,
  embedding vector(3072),
  fit_vector vector(3072),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_profiles_embedding ON match_profiles USING ivfflat (embedding vector_cosine_ops);
```

### match_conversations

Conversación con la IA durante onboarding.

```sql
CREATE TYPE match_conv_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE match_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_index INT NOT NULL,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE match_conversation_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES match_conversations(id) ON DELETE CASCADE,
  role match_conv_role NOT NULL,
  content_encrypted TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  token_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_conv_msgs_conv ON match_conversation_messages(conversation_id, created_at);
```

### match_presentations

Cada match presentado al usuario.

```sql
CREATE TYPE match_presentation_status AS ENUM ('pending_review', 'queued', 'shown', 'accepted', 'declined', 'expired');

CREATE TABLE match_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presented_to_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  presented_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dossier_summary TEXT NOT NULL,
  dossier_common_ground TEXT NOT NULL,
  dossier_generative_difference TEXT NOT NULL,
  conversation_starters JSONB NOT NULL,
  compatibility_score NUMERIC(4,3),
  status match_presentation_status NOT NULL DEFAULT 'pending_review',
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  shown_at TIMESTAMPTZ,
  user_decision_at TIMESTAMPTZ,
  feedback_score INT CHECK (feedback_score BETWEEN 1 AND 5),
  feedback_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (presented_to_id, presented_user_id)
);

CREATE INDEX idx_match_pres_to_user ON match_presentations(presented_to_id, status);
```

## Mensajería (compartida)

### chambers

Conversaciones activas. El nombre `chamber` es interno por consistencia con la lengua de Voice; aplica a las tres apps.

```sql
CREATE TYPE chamber_status AS ENUM ('active', 'archived', 'closed');
CREATE TYPE chamber_origin AS ENUM ('voice_match', 'words_match', 'match_presentation');

CREATE TABLE chambers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app app_kind NOT NULL,
  origin chamber_origin NOT NULL,
  origin_ref_id UUID,
  status chamber_status NOT NULL DEFAULT 'active',
  photo_unlock_state JSONB NOT NULL DEFAULT '{}',
  text_unlock_state JSONB NOT NULL DEFAULT '{}',
  ai_observer_active BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chamber_participants (
  chamber_id UUID NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (chamber_id, user_id)
);

CREATE INDEX idx_chambers_active ON chambers(last_message_at DESC) WHERE status = 'active';
CREATE INDEX idx_chamber_part_user ON chamber_participants(user_id) WHERE left_at IS NULL;
```

### messages

```sql
CREATE TYPE message_kind AS ENUM ('voice', 'text', 'photo', 'system');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamber_id UUID NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  kind message_kind NOT NULL,
  content_encrypted TEXT,
  encryption_key_id TEXT,
  voice_storage_key TEXT,
  voice_duration_seconds NUMERIC(4,2),
  voice_waveform_peaks JSONB,
  voice_transcript TEXT,
  photo_storage_key TEXT,
  reactions JSONB NOT NULL DEFAULT '[]',
  read_at_by JSONB NOT NULL DEFAULT '{}',
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_chamber ON messages(chamber_id, created_at);
```

## Moderación y safety

### reports

```sql
CREATE TYPE report_target_kind AS ENUM ('user', 'voice_recording', 'words_response', 'message', 'photo');
CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved_actioned', 'resolved_dismissed');

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_kind report_target_kind NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_pending ON reports(created_at) WHERE status = 'pending';
CREATE INDEX idx_reports_target ON reports(target_kind, target_id);
```

### blocks

```sql
CREATE TABLE blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);
```

## Subscripciones

```sql
CREATE TYPE subscription_tier AS ENUM ('free', 'voice_plus', 'voice_premium', 'words_plus', 'words_premium', 'match_standard', 'match_plus', 'match_concierge');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'expired');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL,
  status subscription_status NOT NULL,
  store TEXT NOT NULL,
  store_subscription_id TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subs_user_active ON subscriptions(user_id) WHERE status = 'active';
```

## Feature flags

```sql
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  description TEXT,
  enabled_globally BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INT NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  user_overrides JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Notas finales

- Todas las queries de match deben filtrar por usuarios bloqueados (`blocks`).
- Los embeddings se actualizan vía worker job, nunca síncronamente en API.
- pgvector requiere extensión: `CREATE EXTENSION IF NOT EXISTS vector;`.
- earthdistance + cube se requieren para búsqueda geo: `CREATE EXTENSION cube; CREATE EXTENSION earthdistance;`.
- `gen_random_uuid()` requiere `pgcrypto` extension.
