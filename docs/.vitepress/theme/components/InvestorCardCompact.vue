<script setup lang="ts">
import { computed } from 'vue'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

interface InvestorCompact {
  slug: string
  display_name: Record<Lang, string>
  portrait: string
  rank?: number
  aum_usd?: number
  total_value_usd?: number
}

const props = defineProps<{
  investor: InvestorCompact
  lang: Lang
}>()

const name = computed(() => props.investor.display_name[props.lang])

const href = computed(() => {
  const prefix = props.lang === 'en' ? '' : `/${props.lang}`
  return `${prefix}/investors/${props.investor.slug}/`
})

// 优先用 fetch 到的实际 AUM（更准），fallback 到 yaml 里的 aum_usd 静态值
const aumLabel = computed<string | null>(() => {
  const v = props.investor.total_value_usd || props.investor.aum_usd
  if (!v || v <= 0) return null
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
})
</script>

<template>
  <a
    :href="href"
    data-investor-card-compact
    class="investor-card-compact flex items-center gap-3 rounded-xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] p-3 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--vp-c-brand-1,#00b8b8)] text-[var(--vp-c-text-1)]"
  >
    <img
      :src="investor.portrait"
      :alt="name"
      class="shrink-0 w-11 h-11 rounded-full object-cover bg-[var(--vp-c-bg-soft)]"
      loading="lazy"
    />

    <div class="min-w-0 flex-1 leading-tight">
      <div class="font-bold text-sm truncate">{{ name }}</div>
      <div
        v-if="aumLabel"
        class="text-xs text-[var(--vp-c-text-2)] tabular-nums mt-0.5"
      >
        {{ aumLabel }}
      </div>
    </div>
  </a>
</template>
