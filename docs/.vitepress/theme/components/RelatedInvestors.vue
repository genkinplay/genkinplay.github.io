<script setup lang="ts">
import { computed } from 'vue'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

interface Investor {
  slug: string
  display_name: Record<Lang, string>
  tagline: Record<Lang, string>
  portrait: string
  holdings_source: '13f' | 'curated'
}

const props = defineProps<{
  /** 候选投资人池（调用方已过滤掉当前人物） */
  investors: Investor[]
  /** 当前人物 slug，用作 deterministic shuffle 的 seed —— 同一详情页每次刷新展示同一组 */
  currentSlug: string
  lang: Lang
  label: string
  count?: number
}>()

// 简单 FNV-1a 字符串哈希。用 Math.random 会让 SSR / hydration 看到不同顺序，
// 这里走 deterministic shuffle 保证服务端和客户端一致。
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

const picked = computed<Investor[]>(() => {
  const n = props.count ?? 4
  const seed = props.currentSlug
  return [...props.investors]
    .map((inv) => ({ inv, key: hash(`${seed}|${inv.slug}`) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, n)
    .map((x) => x.inv)
})

function hrefOf(slug: string): string {
  const prefix = props.lang === 'en' ? '' : `/${props.lang}`
  return `${prefix}/investors/${slug}/`
}
</script>

<template>
  <section
    v-if="picked.length > 0"
    class="max-w-7xl mx-auto px-6 py-6 border-t border-[var(--vp-c-divider)] mt-4"
  >
    <div class="text-xl font-bold text-[var(--vp-c-text-1)] mb-4">{{ label }}</div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <a
        v-for="inv in picked"
        :key="inv.slug"
        :href="hrefOf(inv.slug)"
        data-related-card
        class="related-card group flex items-center gap-3 rounded-2xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] p-3 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--vp-c-brand-1,#00b8b8)] text-[var(--vp-c-text-1)]"
      >
        <img
          :src="inv.portrait"
          :alt="inv.display_name[lang]"
          class="shrink-0 w-14 h-14 rounded-full object-cover shadow-sm"
          loading="lazy"
        />
        <div class="min-w-0 flex-1">
          <h3 class="font-bold text-sm leading-tight truncate">{{ inv.display_name[lang] }}</h3>
          <p class="text-xs text-[var(--vp-c-text-2)] mt-1 leading-snug related-tagline">
            {{ inv.tagline[lang] }}
          </p>
        </div>
      </a>
    </div>
  </section>
</template>

<style scoped>
/* 双行截断，不依赖 Tailwind line-clamp 插件（项目未引入） */
.related-tagline {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
