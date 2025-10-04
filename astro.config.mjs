// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
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
    port: 3000,
    host: true
  }
});