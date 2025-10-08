module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        'plugin:astro/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    plugins: ['@typescript-eslint', 'astro'],
    rules: {
        // TypeScript rules
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/prefer-const': 'error',
        '@typescript-eslint/no-var-requires': 'error',

        // General rules
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-unused-vars': 'off', // Use TypeScript version instead
        'prefer-const': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-template': 'error',

        // Code quality
        'complexity': ['warn', 10],
        'max-depth': ['warn', 4],
        'max-lines': ['warn', 300],
        'max-lines-per-function': ['warn', 50],
        'max-params': ['warn', 4],

        // Security
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',

        // Best practices
        'curly': 'error',
        'eqeqeq': 'error',
        'no-alert': 'warn',
        'no-caller': 'error',
        'no-else-return': 'error',
        'no-empty-function': 'warn',
        'no-eq-null': 'error',
        'no-extra-bind': 'error',
        'no-floating-decimal': 'error',
        'no-lone-blocks': 'error',
        'no-multi-spaces': 'error',
        'no-multiple-empty-lines': ['error', { max: 2 }],
        'no-new': 'error',
        'no-new-wrappers': 'error',
        'no-throw-literal': 'error',
        'no-undef-init': 'error',
        'no-unused-expressions': 'error',
        'no-useless-call': 'error',
        'no-useless-concat': 'error',
        'no-useless-return': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-promise-reject-errors': 'error',
        'radix': 'error',
        'wrap-iife': 'error',
        'yoda': 'error',
    },
    overrides: [
        {
            files: ['*.astro'],
            parser: 'astro-eslint-parser',
            parserOptions: {
                parser: '@typescript-eslint/parser',
                extraFileExtensions: ['.astro'],
            },
            rules: {
                // Astro-specific rules
                'astro/no-conflict-set-directives': 'error',
                'astro/no-unused-define-vars-in-style': 'error',
            },
        },
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/explicit-function-return-type': 'warn',
                '@typescript-eslint/no-explicit-any': 'error',
            },
        },
        {
            files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
            env: {
                jest: true,
            },
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                'no-console': 'off',
            },
        },
    ],
    ignorePatterns: [
        'dist/',
        'build/',
        'node_modules/',
        '*.config.js',
        '*.config.ts',
    ],
};
