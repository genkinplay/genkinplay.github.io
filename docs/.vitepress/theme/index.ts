// Custom theme entry for Longbridge Investors
// Based on developers theme baseline (Task 4.5) with UnoCSS/virtual-module imports
// stripped since we do not (yet) wire UnoCSS into this project's Vite config.
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { createI18n } from 'vue-i18n'

import './style/tailwind.css'
import './style/index.css'
import './style/layout-overrides.css'

import Layout from './layouts/Layout.vue'

import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import zhHK from './locales/zh-HK.json'

type LocaleCode = 'en' | 'zh-CN' | 'zh-HK'

function detectLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'en'
  const path = window.location.pathname
  if (path.startsWith('/zh-CN/')) return 'zh-CN'
  if (path.startsWith('/zh-HK/')) return 'zh-HK'
  return 'en'
}

const i18n = createI18n({
  locale: detectLocale(),
  fallbackLocale: 'en',
  legacy: false,
  messages: {
    en,
    'zh-CN': zhCN,
    'zh-HK': zhHK,
  },
})

const theme: Theme = {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app, router, siteData }) {
    DefaultTheme.enhanceApp?.({ app, router, siteData })
    app.use(i18n)
  },
}

export default theme
