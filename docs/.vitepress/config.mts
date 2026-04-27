import { defineConfig } from 'vitepress'
import tailwind from '@tailwindcss/vite'
import yaml from '@rollup/plugin-yaml'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// NOTE: We intentionally do NOT import @vitejs/plugin-vue here.
// VitePress bundles its own plugin-vue; re-registering our own causes
// every .vue SFC to be transformed twice, which makes the second pass
// re-parse already-compiled JS as an SFC and blow up with
// "At least one <template> or <script> is required...".
const __dirname = dirname(fileURLToPath(import.meta.url))

// Base path 由部署目标决定：
//   - 本地 dev / preview / 自定义域名根：'/'
//   - GitHub Pages 项目站（<owner>.github.io/<repo>/）：'/<repo>/'
// CI 通过 actions/configure-pages 输出 base_path 注入到 VITEPRESS_BASE。
const base = process.env.VITEPRESS_BASE || '/'

export default defineConfig({
  title: 'Longbridge Investors',
  description: 'Tri-lingual introductions to famous investors with downloadable AI skills',
  base,
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,

  // Exclude spec/plan meta docs from the VitePress content tree
  srcExclude: [
    'superpowers/**',
    'zh-CN/superpowers/**',
    'zh-HK/superpowers/**',
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [{ text: 'Home', link: '/' }],
      },
    },
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [{ text: '首页', link: '/zh-CN/' }],
      },
    },
    'zh-HK': {
      label: '繁體中文',
      lang: 'zh-HK',
      themeConfig: {
        nav: [{ text: '首頁', link: '/zh-HK/' }],
      },
    },
  },

  vite: {
    plugins: [tailwind(), yaml()],
    // public dir at project root (not docs/public/)
    // holds portraits/ (committed) + skills/ (copied at build time from root skills/)
    publicDir: resolve(__dirname, '../../public'),
    ssr: {
      noExternal: ['vue-i18n'],
    },
    resolve: {
      alias: {
        '@data': resolve(__dirname, '../../data'),
        '@theme': resolve(__dirname, './theme'),
      },
    },
  },

  themeConfig: {
    siteTitle: 'Longbridge Investors',
    socialLinks: [],
  },
})
