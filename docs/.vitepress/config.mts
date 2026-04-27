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

const LOGO = 'https://assets.wbrks.com/assets/logo/longbridge-com-hk.png'

// 通用 nav 构造：根据 locale 拼 longbridge.com 的对应页面
function buildNav(lang: 'en' | 'zh-CN' | 'zh-HK') {
  const labels = {
    en:      { home: 'Home',     community: 'Community', news: 'News',     about: 'About' },
    'zh-CN': { home: '首页',     community: '社区',       news: '资讯',     about: '关于' },
    'zh-HK': { home: '首頁',     community: '社群',       news: '資訊',     about: '關於' },
  }[lang]

  return [
    { text: labels.home,      link: 'https://longbridge.com/' },
    { text: labels.community, link: `https://longbridge.com/${lang}/topics` },
    { text: labels.news,      link: `https://longbridge.com/${lang}/news` },
    { text: labels.about,     link: `https://longbridge.com/hk/${lang}/about` },
  ]
}

export default defineConfig({
  title: 'Longbridge',
  description: 'Real 13F snapshots, curated holdings, downloadable AI skills.',
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
        nav: buildNav('en'),
      },
    },
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: buildNav('zh-CN'),
      },
    },
    'zh-HK': {
      label: '繁體中文',
      lang: 'zh-HK',
      themeConfig: {
        nav: buildNav('zh-HK'),
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
    logo: LOGO,
    // Logo 图片本身已含 "LONGBRIDGE" 字样，不再叠加 siteTitle 文字避免重复
    siteTitle: false,
    socialLinks: [],
  },
})
