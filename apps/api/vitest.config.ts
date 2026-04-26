import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    hookTimeout: 30_000,
    testTimeout: 20_000,
    include: ['test/**/*.test.ts'],
    // DB is shared across files; serialize file execution to prevent FK truncation collisions
    fileParallelism: false,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'], include: ['src/**'] },
  },
});
