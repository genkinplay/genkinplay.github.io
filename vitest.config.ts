import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@scripts': resolve(__dirname, 'scripts'),
      '@data': resolve(__dirname, 'data'),
      '@theme': resolve(__dirname, 'docs/.vitepress/theme'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
