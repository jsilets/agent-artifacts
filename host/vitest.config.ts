import { defineConfig } from 'vitest/config';

// The suites cover the Worker's pure helpers. They run in Node with WebCrypto.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'], passWithNoTests: false },
});
