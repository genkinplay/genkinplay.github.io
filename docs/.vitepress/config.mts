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

// nav 上的 logo：本地的宽版（bars + LONGBRIDGE 文字一体），从 longbridge-com-hk.png 去掉 Hong Kong 后裁切而来
const LOGO_NAV = '/brand/logo.png'
// 浏览器 tab favicon：方形的纯 bars 图标（宽版图比例不适合 favicon）
const LOGO_ICON = 'https://assets.wbrks.com/assets/logo/logo1.png'

// 通用 nav 构造：根据 locale 拼 longbridge.com 的对应页面
// VitePress 默认外链 (https://...) 会带 target="_blank" + 外部图标；
// 我们要求 nav 跳转在当前 tab 打开，所以显式 target="_self" + noIcon
function buildNav(lang: 'en' | 'zh-CN' | 'zh-HK') {
  const labels = {
    en:      { home: 'Home',     community: 'Community', news: 'News',     about: 'About' },
    'zh-CN': { home: '首页',     community: '社区',       news: '资讯',     about: '关于' },
    'zh-HK': { home: '首頁',     community: '社群',       news: '資訊',     about: '關於' },
  }[lang]

  const sameTab = { target: '_self', noIcon: true } as const

  return [
    { text: labels.home,      link: 'https://longbridge.com/',                          ...sameTab },
    { text: labels.community, link: `https://longbridge.com/${lang}/topics`,            ...sameTab },
    { text: labels.news,      link: `https://longbridge.com/${lang}/news`,              ...sameTab },
    { text: labels.about,     link: `https://longbridge.com/${lang}/about`,             ...sameTab },
  ]
}

export default defineConfig({
  title: 'Longbridge',
  description: 'Real 13F snapshots, curated holdings, downloadable AI skills.',
  base,
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,

  // 浏览器 tab favicon + Apple touch icon
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: LOGO_ICON }],
    ['link', { rel: 'apple-touch-icon', href: LOGO_ICON }],
  ],

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
        lastUpdated: {
          text: 'Updated',
          formatOptions: { dateStyle: 'long', forceLocale: true },
        },
      },
    },
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: buildNav('zh-CN'),
        lastUpdated: {
          text: '更新于',
          formatOptions: { dateStyle: 'long', forceLocale: true },
        },
      },
    },
    'zh-HK': {
      label: '繁體中文',
      lang: 'zh-HK',
      themeConfig: {
        nav: buildNav('zh-HK'),
        lastUpdated: {
          text: '更新於',
          formatOptions: { dateStyle: 'long', forceLocale: true },
        },
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
    logo: LOGO_NAV,
    // 新的宽版 logo 已含 "LONGBRIDGE" 字样，不再叠加 siteTitle 文字
    siteTitle: false,
    socialLinks: [],
  },
})
