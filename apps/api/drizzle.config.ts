import type { Config } from 'drizzle-kit';

export default {
  schema: './src/shared/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://knot:knot@localhost:5432/knot',
  },
  strict: true,
  verbose: true,
} satisfies Config;
