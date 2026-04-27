<script setup lang="ts">
import { computed } from 'vue'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

interface InvestorCardProps {
  investor: {
    slug: string
    display_name: Record<Lang, string>
    tagline: Record<Lang, string>
    role: Record<Lang, string>
    portrait: string
    holdings_source: '13f' | 'curated'
    total_value_usd?: number
  }
  lang: Lang
}

const props = defineProps<InvestorCardProps>()

const name = computed(() => props.investor.display_name[props.lang])
const tagline = computed(() => props.investor.tagline[props.lang])

const href = computed(() => {
  const prefix = props.lang === 'en' ? '' : `/${props.lang}`
  return `${prefix}/investors/${props.investor.slug}/`
})

// 只在有真实 13F 数据时显示 badge，curated 不显示空标签
const badge = computed<string | null>(() => {
  if (props.investor.holdings_source === '13f' && props.investor.total_value_usd) {
    const b = props.investor.total_value_usd / 1e9
    return `$${b.toFixed(2)}B · 13F`
  }
  return null
})
</script>

<template>
  <a
    :href="href"
    class="investor-card group flex items-center gap-5 rounded-2xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--vp-c-brand-1,#00b8b8)]"
  >
    <!-- Avatar：与详情页 Hero 完全相同的结构（img 自身 rounded-full + object-cover） -->
    <img
      :src="investor.portrait"
      :alt="name"
      class="shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shadow-md"
      loading="lazy"
    />

    <div class="investor-card__body min-w-0 flex-1">
      <h3 class="font-bold text-lg leading-tight truncate">{{ name }}</h3>
      <p class="text-xs text-[var(--vp-c-text-2)] mt-1.5 leading-relaxed">{{ tagline }}</p>
      <div v-if="badge" class="mt-2 text-xs font-semibold text-[var(--vp-c-brand-1,#00b8b8)] tabular-nums">{{ badge }}</div>
    </div>
  </a>
</template>
