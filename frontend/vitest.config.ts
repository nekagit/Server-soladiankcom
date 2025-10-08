import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/tests/setup.ts'],
        include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
        exclude: ['node_modules', 'dist', '.git', '.cache'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/tests/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/coverage/**',
                '**/dist/**',
                '**/.{idea,git,cache,output,temp}/**',
                '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@components': resolve(__dirname, './src/components'),
            '@services': resolve(__dirname, './src/services'),
            '@utils': resolve(__dirname, './src/utils'),
            '@types': resolve(__dirname, './src/types'),
        },
    },
});
