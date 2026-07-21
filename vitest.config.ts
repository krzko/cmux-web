import { defineConfig } from 'vitest/config'

// Isolated from vite.config so tests do not load the Start/nitro plugins.
// Domain/application logic is pure, so a plain node environment is enough.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
