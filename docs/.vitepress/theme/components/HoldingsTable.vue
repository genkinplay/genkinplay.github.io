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
  /** SEC report period in YYYY-MM-DD format（HoldingsTable 内部格式化） */
  period?: string
}>()

// 用当前路由 lang 拼 longbridge 行情页 URL，并用 lang 做 i18n 切换
const { lang } = useData()
const longbridgeLang = computed(() => {
  // longbridge.com 支持 zh-CN / zh-HK / en；其它降级到 en
  if (lang.value === 'zh-CN') return 'zh-CN'
  if (lang.value === 'zh-HK') return 'zh-HK'
  return 'en'
})

const quoteUrl = (ticker: string): string =>
  `https://longbridge.com/${longbridgeLang.value}/quote/${ticker}.US/topics`

// 股票 logo（lbkrs CDN）。CDN 对任意 ticker 字符串都返回 PNG（不识别时给到一个
// 灰底首字母圆形占位），所以没识别到 ticker 时用 name 的第一个字母重复 5 次拼一个
// "AAAAA.png" 这样的字符串 —— 既不会跟真实 ticker（如 "A" = Agilent）冲突，
// CDN 又能识别首字母给到对应的占位图。
const tickerIconUrl = (ticker: string | null | undefined, name?: string): string => {
  if (ticker) return `https://assets.lbkrs.com/ticker/ST/US/${ticker}.png`
  const initial =
    (name ?? '').replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || 'X'
  return `https://assets.lbkrs.com/ticker/ST/US/${initial.repeat(5)}.png`
}

// 把 YYYY-MM-DD 格式化为 locale 友好的写法，并拼上 "As of / 截至" 前缀
const periodText = computed<string | null>(() => {
  if (!props.period) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(props.period)
  const dateText = m
    ? (lang.value === 'zh-CN' || lang.value === 'zh-HK')
      ? `${m[1]} 年 ${parseInt(m[2]!, 10)} 月 ${parseInt(m[3]!, 10)} 日`
      : `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m[2]!, 10) - 1]} ${parseInt(m[3]!, 10)}, ${m[1]}`
    : props.period
  const prefix = (lang.value === 'zh-CN' || lang.value === 'zh-HK') ? '截至 ' : 'As of '
  return prefix + dateText
})

// "X positions · $Y.YB shown" 的本地化版本
function metaText(count: number, totalB: number): string {
  const v = totalB.toFixed(1)
  if (lang.value === 'zh-CN') return `${count} 只持仓 · 共 $${v}B`
  if (lang.value === 'zh-HK') return `${count} 隻持倉 · 共 $${v}B`
  return `${count} positions · $${v}B shown`
}

// "shares" 单位 i18n
const sharesUnit = computed(() => {
  if (lang.value === 'zh-CN' || lang.value === 'zh-HK') return '股'
  return 'shares'
})

// "Showing top X of Y positions" 三语
function footerText(shown: number, total: number): string {
  if (lang.value === 'zh-CN') return `仅显示前 ${shown} 只，共 ${total} 只持仓`
  if (lang.value === 'zh-HK') return `僅顯示前 ${shown} 隻，共 ${total} 隻持倉`
  return `Showing top ${shown} of ${total} positions.`
}

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

// Top 3 用三种颜色区分重要性
// 顺序：橙 / 金 / 青 —— 让最关键的 #1 用最显眼的暖色，#2 金色，#3 收回品牌主色
const TOP3_COLORS = [
  '#ff7333', // 第 1 名：橙（brand orange）
  '#f5c518', // 第 2 名：金（brand yellow）
  '#00b8b8', // 第 3 名：teal（brand 主色）
]

// 4 名以后：圆形徽章 + 白字，背景 teal 主色随权重渐变透明度
function restCircleStyle(pct: string): { backgroundColor: string } {
  const w = parseFloat(pct) || 0
  // top1 权重作上限；本行权重 / 上限 → 0..1，再映射到 0.35..0.95 透明度
  const alpha = Math.max(0.35, Math.min(0.95, 0.35 + (w / maxWeight.value) * 0.6))
  return { backgroundColor: `rgba(0, 184, 184, ${alpha.toFixed(2)})` }
}
</script>

<template>
  <section class="max-w-7xl mx-auto px-6 py-7">
    <div class="flex items-baseline justify-between mb-6 flex-wrap gap-2">
      <div class="text-xl font-bold text-[var(--vp-c-text-1)]">
        {{ label }}
      </div>
      <div class="text-sm text-[var(--vp-c-text-2)]">
        <span v-if="periodText">{{ periodText }} · </span>
        {{ metaText(holdings.length, totalShown / 1e9) }}
      </div>
    </div>

    <!-- ───── Top 3 highlighted cards (橙 / 金 / 青)：整卡可点击 ───── -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <component
        v-for="(h, i) in top3"
        :is="h.ticker ? 'a' : 'div'"
        :key="h.cusip"
        :href="h.ticker ? quoteUrl(h.ticker) : undefined"
        :target="h.ticker ? '_blank' : undefined"
        :rel="h.ticker ? 'noopener' : undefined"
        data-holding
        class="holding-top-card no-underline relative rounded-2xl border border-[var(--vp-c-divider)] bg-transparent p-5 block hover:bg-[var(--vp-c-bg-soft)] hover:shadow-md hover:-translate-y-0.5 focus-visible:bg-[var(--vp-c-bg-soft)] focus-visible:shadow-md focus-visible:outline-none transition-all text-[var(--vp-c-text-1)]"
      >
        <!-- 顶部 rank badge -->
        <div class="mb-4">
          <span
            class="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold tabular-nums text-white"
            :style="{ backgroundColor: TOP3_COLORS[i] }"
          >{{ i + 1 }}</span>
        </div>

        <!-- 股票 logo + Market/Code（重点）+ name（弱化）一组 -->
        <div class="flex items-center gap-3 mb-5 min-w-0">
          <img
            :src="tickerIconUrl(h.ticker, h.name)"
            :alt="h.name"
            class="w-10 h-10 rounded-full object-cover bg-[var(--vp-c-bg-soft)] shrink-0"
            loading="lazy"
          />
          <div class="leading-tight min-w-0 flex-1">
            <div class="text-2xl font-bold tabular-nums">
              <span v-if="h.ticker" class="text-[#4781ff] font-semibold mr-1.5">US</span>
              <span>{{ h.ticker || h.name }}</span>
            </div>
            <div v-if="h.ticker" class="text-sm text-[var(--vp-c-text-3)] mt-1 truncate">
              {{ h.name }}
            </div>
          </div>
        </div>

        <!-- 权重百分比与进度条融为一体；bar 宽度等于实际权重 % -->
        <div>
          <div
            class="relative h-10 rounded-lg overflow-hidden"
            :style="{ backgroundColor: 'var(--vp-c-bg-alt, var(--vp-c-bg-soft))' }"
          >
            <!-- 进度条按"实际百分比"填充，让 bar 与文字数值视觉一致 -->
            <div
              class="absolute inset-y-0 left-0 rounded-lg transition-all"
              :style="{ width: `${Math.min(100, parseFloat(h.weight_pct) || 0)}%`, backgroundColor: TOP3_COLORS[i], opacity: 0.18 }"
            ></div>
            <!-- 百分比文字浮在上面 -->
            <span
              class="absolute inset-0 flex items-center px-3 text-2xl font-bold tabular-nums leading-none"
              :style="{ color: TOP3_COLORS[i] }"
            >{{ h.weight_pct }}%</span>
          </div>
          <div class="text-sm text-[var(--vp-c-text-2)] tabular-nums mt-2">
            {{ fmtValue(h.value_usd) }} <span class="text-[var(--vp-c-text-3)]">·</span> {{ fmtShares(h.shares) }} {{ sharesUnit }}
          </div>
        </div>
      </component>
    </div>

    <!-- ───── Rest as compact list：整行可点击 ───── -->
    <div v-if="rest.length > 0" class="rounded-xl border border-[var(--vp-c-divider)] divide-y divide-[var(--vp-c-divider)] overflow-hidden">
      <component
        v-for="(h, i) in rest"
        :is="h.ticker ? 'a' : 'div'"
        :key="h.cusip"
        :href="h.ticker ? quoteUrl(h.ticker) : undefined"
        :target="h.ticker ? '_blank' : undefined"
        :rel="h.ticker ? 'noopener' : undefined"
        data-holding
        class="holding-row no-underline grid grid-cols-[2.5rem_2.25rem_1fr_auto] sm:grid-cols-[2.5rem_2.25rem_1fr_8rem_auto] items-center gap-3 px-4 py-3 hover:bg-[var(--vp-c-bg-soft)] transition-colors text-[var(--vp-c-text-1)]"
      >
        <span
          class="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold tabular-nums text-white"
          :style="restCircleStyle(h.weight_pct)"
        >{{ i + 4 }}</span>
        <!-- 股票 logo（无 ticker 时用 name 首字母兜底）-->
        <img
          :src="tickerIconUrl(h.ticker, h.name)"
          :alt="h.name"
          class="w-9 h-9 rounded-full object-cover bg-[var(--vp-c-bg-soft)]"
          loading="lazy"
        />
        <div class="min-w-0">
          <div class="font-bold text-sm truncate tabular-nums">
            <span v-if="h.ticker" class="text-[#4781ff] mr-1">US</span>
            <span>{{ h.ticker || h.name }}</span>
          </div>
          <div v-if="h.ticker" class="text-sm text-[var(--vp-c-text-3)] truncate">
            {{ h.name }}
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
          <span class="text-sm tabular-nums text-[var(--vp-c-text-2)] w-12 text-right">{{ h.weight_pct }}%</span>
        </div>
        <span class="text-sm font-medium tabular-nums text-right whitespace-nowrap">
          {{ fmtValue(h.value_usd) }}
        </span>
      </component>
    </div>

    <div v-if="holdings.length > rows.length" class="mt-3 text-sm text-[var(--vp-c-text-3)] text-right">
      {{ footerText(rows.length, holdings.length) }}
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
