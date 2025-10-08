module.exports = {
    ci: {
        collect: {
            url: ['http://localhost:4321/'],
            startServerCommand: 'npm run preview',
            startServerReadyPattern: 'Local:',
            startServerReadyTimeout: 30000,
            numberOfRuns: 3,
        },
        assert: {
            assertions: {
                'categories:performance': ['error', { minScore: 0.9 }],
                'categories:accessibility': ['error', { minScore: 0.9 }],
                'categories:best-practices': ['error', { minScore: 0.9 }],
                'categories:seo': ['error', { minScore: 0.9 }],
                'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
                'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
                'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
                'speed-index': ['error', { maxNumericValue: 3000 }],
                'interactive': ['error', { maxNumericValue: 3500 }],
                'total-blocking-time': ['error', { maxNumericValue: 300 }],
            },
        },
        upload: {
            target: 'temporary-public-storage',
        },
        server: {
            command: 'npm run preview',
            port: 4321,
        },
    },
};
