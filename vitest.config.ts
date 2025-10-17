import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    onConsoleLog(log, type) {
      // Suppress jsdom import warnings that are treated as unhandled errors
      if (log.includes('Cannot find package \'jsdom\'') ||
          log.includes('jsdom') && log.includes('deprecated')) {
        return false;
      }
      return true;
    },
    // Ignore unhandled errors from jsdom imports
    dangerouslyIgnoreUnhandledErrors: true,
  },
});