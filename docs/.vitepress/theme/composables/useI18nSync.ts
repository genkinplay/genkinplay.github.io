import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useData } from 'vitepress'

/**
 * 把 VitePress 的 route lang 与 vue-i18n 的 locale 双向打通。
 * VitePress 在 SSR 阶段会根据路由前缀（/zh-CN/、/zh-HK/）自动填入 lang，
 * 客户端 hydrate 或路由切换时也会同步更新。
 * 通过 watchEffect 把 useData().lang 透传给 i18n.locale，保证页面文案跟着路由变。
 */
export function useI18nSync() {
  const { lang } = useData()
  const i18n = useI18n()

  // 同步一次——确保 SSR 阶段 render 之前 locale 就和路由一致，
  // 否则 /zh-CN/ 的 HTML 会被预渲染成英文，必须等客户端 hydrate 后才切中文。
  if (lang.value && lang.value !== i18n.locale.value) {
    i18n.locale.value = lang.value
  }

  // 客户端路由切换时继续跟随。
  watchEffect(() => {
    if (lang.value && lang.value !== i18n.locale.value) {
      i18n.locale.value = lang.value
    }
  })

  return {
    lang,
    locale: i18n.locale,
  }
}
