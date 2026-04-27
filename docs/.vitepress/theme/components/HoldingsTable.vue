<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

interface Holding {
  cusip: string
  name: string
  share_type: string
  shares: number
  value_usd: number
  weight_pct: string
  ticker?: string | null
}

const props = defineProps<{
  holdings: Holding[]
  topN: number
  label: string
  periodLabel: string
}>()

// 用当前路由 lang 拼 longbridge 行情页 URL
const { lang } = useData()
const longbridgeLang = computed(() => {
  // longbridge.com 支持 zh-CN / zh-HK / en；其它降级到 en
  if (lang.value === 'zh-CN') return 'zh-CN'
  if (lang.value === 'zh-HK') return 'zh-HK'
  return 'en'
})

const quoteUrl = (ticker: string): string =>
  `https://longbridge.com/${longbridgeLang.value}/quote/${ticker}.US/topics`

const rows = computed(() => props.holdings.slice(0, props.topN))

// 头部 3 大重仓单独突出展示
const top3 = computed(() => props.holdings.slice(0, 3))
const rest = computed(() => props.holdings.slice(3, props.topN))

// 全部持仓的总市值（用于"占总仓位百分比"显示一致性校验）
const totalShown = computed(() =>
  rows.value.reduce((acc, h) => acc + (h.value_usd ?? 0), 0),
)

// 取 top 1 的权重作为 bar 的比例基准（让 bar 视觉上区分度更强）
const maxWeight = computed(() => {
  const w = parseFloat(rows.value[0]?.weight_pct ?? '0')
  return w > 0 ? w : 1
})

const fmtValue = (v: number): string => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}

const fmtShares = (n: number): string => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

// 把权重换算成 bar 宽度百分比（相对最大权重，最少 4% 保证视觉存在）
const barWidth = (pct: string): string => {
  const n = parseFloat(pct)
  const ratio = (n / maxWeight.value) * 100
  return `${Math.max(4, Math.min(100, ratio))}%`
}
</script>

<template>
  <section class="max-w-5xl mx-auto px-6 py-12">
    <div class="flex items-baseline justify-between mb-6 flex-wrap gap-2">
      <div class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-text-2)]">
        {{ label }}
      </div>
      <div class="text-xs text-[var(--vp-c-text-2)]">
        {{ periodLabel }} · {{ holdings.length }} positions · ${{ (totalShown / 1e9).toFixed(1) }}B shown
      </div>
    </div>

    <!-- ───── Top 3 highlighted cards ───── -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div
        v-for="(h, i) in top3"
        :key="h.cusip"
        data-holding
        class="holding-top-card relative rounded-2xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] p-5 overflow-hidden hover:border-[var(--vp-c-brand-1,#00b8b8)] hover:shadow-md transition-all"
      >
        <div class="flex items-center gap-3 mb-3">
          <span
            class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold tabular-nums text-white bg-[var(--vp-c-brand-1,#00b8b8)]"
          >{{ i + 1 }}</span>
          <span class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-text-2)]">
            Top {{ i + 1 }}
          </span>
        </div>
        <h4 class="font-bold text-base leading-tight line-clamp-2 min-h-[2.5em]">
          <a
            v-if="h.ticker"
            :href="quoteUrl(h.ticker)"
            target="_blank"
            rel="noopener"
            class="hover:text-[var(--vp-c-brand-1,#00b8b8)] transition-colors"
          >{{ h.name }} <span class="text-xs font-mono text-[var(--vp-c-text-3)]">{{ h.ticker }}</span></a>
          <span v-else>{{ h.name }}</span>
        </h4>
        <div class="flex items-baseline gap-2 mt-3">
          <span class="text-2xl font-bold tabular-nums text-[var(--vp-c-brand-1,#00b8b8)]">
            {{ h.weight_pct }}%
          </span>
          <span class="text-sm text-[var(--vp-c-text-2)] tabular-nums">{{ fmtValue(h.value_usd) }}</span>
        </div>
        <div class="text-xs text-[var(--vp-c-text-3)] mt-1 tabular-nums">
          {{ fmtShares(h.shares) }} shares
        </div>

        <!-- subtle bottom progress bar -->
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-[var(--vp-c-divider)]">
          <div
            class="h-full bg-[var(--vp-c-brand-1,#00b8b8)] transition-all"
            :style="{ width: barWidth(h.weight_pct) }"
          ></div>
        </div>
      </div>
    </div>

    <!-- ───── Rest as compact list ───── -->
    <div v-if="rest.length > 0" class="rounded-xl border border-[var(--vp-c-divider)] divide-y divide-[var(--vp-c-divider)] overflow-hidden">
      <div
        v-for="(h, i) in rest"
        :key="h.cusip"
        data-holding
        class="holding-row grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_8rem_auto] items-center gap-3 px-4 py-3 hover:bg-[var(--vp-c-bg-soft)] transition-colors"
      >
        <span class="text-xs font-semibold tabular-nums text-[var(--vp-c-text-3)]">
          {{ i + 4 }}
        </span>
        <div class="min-w-0">
          <div class="font-medium text-sm truncate">
            <a
              v-if="h.ticker"
              :href="quoteUrl(h.ticker)"
              target="_blank"
              rel="noopener"
              class="hover:text-[var(--vp-c-brand-1,#00b8b8)] transition-colors"
            >{{ h.name }} <span class="text-xs font-mono text-[var(--vp-c-text-3)]">{{ h.ticker }}</span></a>
            <span v-else>{{ h.name }}</span>
          </div>
          <div class="text-xs text-[var(--vp-c-text-3)] tabular-nums sm:hidden">
            {{ fmtShares(h.shares) }} sh · {{ h.weight_pct }}%
          </div>
        </div>
        <!-- weight bar (sm+ only) -->
        <div class="hidden sm:flex items-center gap-2">
          <div class="flex-1 h-1.5 bg-[var(--vp-c-divider)] rounded overflow-hidden">
            <div
              class="h-full bg-[var(--vp-c-brand-1,#00b8b8)] rounded"
              :style="{ width: barWidth(h.weight_pct) }"
            ></div>
          </div>
          <span class="text-xs tabular-nums text-[var(--vp-c-text-2)] w-12 text-right">{{ h.weight_pct }}%</span>
        </div>
        <span class="text-sm font-medium tabular-nums text-right whitespace-nowrap">
          {{ fmtValue(h.value_usd) }}
        </span>
      </div>
    </div>

    <div v-if="holdings.length > rows.length" class="mt-3 text-xs text-[var(--vp-c-text-3)] text-right">
      Showing top {{ rows.length }} of {{ holdings.length }} positions.
    </div>
  </section>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
