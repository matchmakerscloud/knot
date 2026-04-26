import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string(),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .transform((v) => v === true || v === 'true' || v === '1')
    .default(false),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),
  PASSWORD_PEPPER: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(32),

  // --- LLM (Knot the agent + dossiers + moderation) ---
  // Primary: Google Gemini. Alt: any OpenAI-compatible provider (OpenAI, Groq, Together, OpenRouter, Ollama, vLLM, ...).
  LLM_PROVIDER: z.enum(['gemini', 'openai-compat']).default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash-exp'),
  LLM_OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  LLM_OPENAI_API_KEY: z.string().optional(),
  LLM_OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // Embeddings — kept separate because dimensions are baked into the DB schema.
  // For now we use OpenAI-compat with text-embedding-3-small (1536) to match words_responses.embedding(1536).
  // (Future migration to Gemini text-embedding-004 (768) will require schema changes.)
  EMBEDDINGS_PROVIDER: z.enum(['openai-compat', 'gemini']).default('openai-compat'),
  EMBEDDINGS_MODEL: z.string().default('text-embedding-3-small'),

  // --- Legacy keys (still read but no longer required) ---
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-7'),
  OPENAI_API_KEY: z.string().optional(),

  // Email
  MAIL_BACKEND: z.enum(['smtp', 'console', 'resend']).default('console'),
  MAIL_FROM: z.string().default('Knot <hello@matchmakers.cloud>'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .transform((v) => v === true || v === 'true' || v === '1')
    .default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Local microservices
  WHISPER_URL: z.string().url().default('http://127.0.0.1:5050'),
  VOICE_FINGERPRINT_URL: z.string().url().default('http://127.0.0.1:5000'),

  ALLOWED_ORIGINS: z.string().default(
    'http://localhost:3000,http://localhost:3001,https://app.matchmakers.cloud,https://app.matchmaking.cloud,https://matchmakers.cloud,https://matchmaking.cloud,https://voice.matchmakers.cloud,https://words.matchmakers.cloud',
  ),

  PUBLIC_URL: z.string().default('https://matchmakers.cloud'),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  s3: {
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  },
  auth: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    refreshTtlDays: env.JWT_REFRESH_TTL_DAYS,
    passwordPepper: env.PASSWORD_PEPPER,
  },
  encryptionKey: env.ENCRYPTION_KEY,
  microservices: {
    whisperUrl: env.WHISPER_URL,
    voiceFingerprintUrl: env.VOICE_FINGERPRINT_URL,
  },
  llm: {
    provider: env.LLM_PROVIDER,
    gemini: {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
    },
    openaiCompat: {
      baseUrl: env.LLM_OPENAI_BASE_URL,
      apiKey: env.LLM_OPENAI_API_KEY,
      model: env.LLM_OPENAI_MODEL,
    },
    embeddings: {
      provider: env.EMBEDDINGS_PROVIDER,
      model: env.EMBEDDINGS_MODEL,
    },
  },
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_MODEL,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },
  mail: {
    backend: env.MAIL_BACKEND,
    from: env.MAIL_FROM,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    resend: {
      apiKey: env.RESEND_API_KEY,
    },
  },
  allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
  publicUrl: env.PUBLIC_URL,
} as const;
