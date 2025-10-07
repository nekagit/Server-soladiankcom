import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/components/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/services/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/utils/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.git',
      '.cache',
      'coverage'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.{js,ts,jsx,tsx}'
      ],
      exclude: [
        'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
        'src/test/**/*',
        'src/**/*.d.ts',
        'src/**/*.config.{js,ts}',
        'src/**/*.stories.{js,ts,jsx,tsx}'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    maxConcurrency: 5,
    minThreads: 1,
    maxThreads: 4,
    isolate: true,
    passWithNoTests: true,
    watch: false,
    ui: true,
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@styles': resolve(__dirname, './src/styles'),
      '@test': resolve(__dirname, './src/test')
    }
  },
  define: {
    'import.meta.env.VITEST': true
  }
});