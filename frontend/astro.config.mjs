// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
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
    }
  },
  server: {
    port: 4321,
    host: true
  },
  output: 'static',
  build: {
    assets: 'assets'
  }
});

