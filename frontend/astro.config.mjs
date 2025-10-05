// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  site: 'https://soladia.com',
  output: 'static',
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto'
  },
  vite: {
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@pages': '/src/pages',
        '@services': '/src/services',
        '@types': '/src/types',
        '@utils': '/src/utils',
        '@styles': '/src/styles'
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'solana-wallet': ['@solana/web3.js'],
            'ui-components': ['@astrojs/tailwind']
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  // Removed invalid experimental feature
});

