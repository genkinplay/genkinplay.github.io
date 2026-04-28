<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

interface InsiderTrade {
  date: string
  filing_date?: string
  owner: string
  title?: string
  type: string
  code: string
  shares: number
  price?: number
  value?: number
  shares_after?: number
}

const props = defineProps<{
  data: {
    ticker: string
    owner_match: string | null
    fetched_at: string
    total_count: number
    trades: InsiderTrade[]
  }
  label: string
  ticker_label: string
  rows?: number
}>()

// SEC Form 4 transaction type 太杂（BUY/SELL/DISP/GRANT/EXERCISE/TAX/GIFT/J），
// 业务上归并成 4 类，对应 ChangesPanel 的视觉模式
type Group = 'BUY' | 'SELL' | 'GRANT' | 'OTHER'
const GROUPS: Group[] = ['BUY', 'SELL', 'GRANT', 'OTHER']

const GROUP_OF: Record<string, Group> = {
  BUY:      'BUY',
  SELL:     'SELL',
  DISP:     'SELL',
  GRANT:    'GRANT',
  EXERCISE: 'GRANT',
  TAX:      'OTHER',
  GIFT:     'OTHER',
  J:        'OTHER',
}
function groupOf(type: string): Group {
  return GROUP_OF[type] ?? 'OTHER'
}

const GROUP_COLOR: Record<Group, string> = {
  BUY:   '#00b8b8',
  SELL:  '#ff5000',
  GRANT: '#4781ff',
  OTHER: '#8a8a8a',
}

// 方向推断：决定股数 / 金额带正还是带负号
//   ADDITIVE     → 内部人股权增加（买入 / 激励授予 / 行权获得）
//   SUBTRACTIVE  → 内部人股权减少（卖出 / 处置 / 扣税 / 赠出）
const ADDITIVE = new Set(['BUY', 'GRANT', 'EXERCISE'])
const SUBTRACTIVE = new Set(['SELL', 'DISP', 'TAX', 'GIFT'])

function deltaShares(t: InsiderTrade): number {
  if (SUBTRACTIVE.has(t.type)) return -t.shares
  if (ADDITIVE.has(t.type)) return t.shares
  return t.shares
}
function deltaValue(t: InsiderTrade): number | null {
  if (typeof t.value !== 'number' || t.value === 0) return null
  return SUBTRACTIVE.has(t.type) ? -t.value : t.value
}

// 按 date desc 全排序，再按当前 group 切片展示
const sortedTrades = computed(() =>
  [...props.data.trades].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
)

const counts = computed(() => {
  const c: Record<Group, number> = { BUY: 0, SELL: 0, GRANT: 0, OTHER: 0 }
  for (const t of sortedTrades.value) c[groupOf(t.type)]++
  return c
})

// 默认选有数据的第一个组（SELL 优先级最高 —— 高管减持是市场最关注的信号）
const PREFERENCE: Group[] = ['SELL', 'BUY', 'GRANT', 'OTHER']
const initialGroup: Group = (() => {
  for (const g of PREFERENCE) {
    if (counts.value[g] > 0) return g
  }
  return 'SELL'
})()
const selectedGroup = ref<Group>(initialGroup)

const rowsToShow = computed(() => props.rows ?? 10)

const filtered = computed(() =>
  sortedTrades.value.filter((t) => groupOf(t.type) === selectedGroup.value),
)
const displayed = computed(() => filtered.value.slice(0, rowsToShow.value))

const { lang } = useData()

// 三语日期格式化
function fmtDate(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) return d
  if (lang.value === 'zh-CN' || lang.value === 'zh-HK') {
    return `${m[1]}-${m[2]}-${m[3]}`
  }
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m[2]!, 10) - 1]} ${parseInt(m[3]!, 10)}, ${m[1]}`
}

// 数据时间区间："First → Last" 或单点
const rangeText = computed<string | null>(() => {
  const dates = props.data.trades.map((t) => t.date).filter(Boolean).sort()
  if (dates.length === 0) return null
  const first = fmtDate(dates[0]!)
  const last = fmtDate(dates[dates.length - 1]!)
  return first === last ? last : `${first} → ${last}`
})

const totalText = computed(() => {
  const n = props.data.total_count
  if (lang.value === 'zh-CN') return `共 ${n} 笔`
  if (lang.value === 'zh-HK') return `共 ${n} 筆`
  return `${n} filings`
})

const sharesUnit = computed(() => {
  if (lang.value === 'zh-CN' || lang.value === 'zh-HK') return '股'
  return 'shares'
})

const fmtSignedShares = (n: number): string => {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  const sign = n > 0 ? '+' : '−'
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`
  return `${sign}${abs.toLocaleString()}`
}

const fmtSignedValue = (v: number | null): string => {
  if (v === null || v === 0) return '—'
  const abs = Math.abs(v)
  const sign = v > 0 ? '+' : '−'
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  return `${sign}$${abs}`
}

function priceText(t: InsiderTrade): string {
  if (typeof t.price !== 'number' || t.price === 0) return '—'
  return `$${t.price.toFixed(2)}`
}

// 类别卡片底下的本地化标签
function groupLabel(g: Group): string {
  if (lang.value === 'zh-CN') {
    return { BUY: '买入', SELL: '卖出', GRANT: '授予', OTHER: '其他' }[g]
  }
  if (lang.value === 'zh-HK') {
    return { BUY: '買入', SELL: '賣出', GRANT: '授予', OTHER: '其他' }[g]
  }
  return g
}

// 行内 type code 的本地化
function typeLabel(type: string): string {
  if (lang.value === 'en') return type
  const en2zh: Record<string, string> = {
    BUY: '买入', SELL: '卖出', DISP: '处置',
    GRANT: '授予', EXERCISE: '行权',
    TAX: '扣税', GIFT: '赠与', J: '其他',
  }
  return en2zh[type] ?? type
}

const emptyText = computed(() => {
  if (lang.value === 'zh-CN') return `本期没有${groupLabel(selectedGroup.value)}记录。`
  if (lang.value === 'zh-HK') return `本期沒有${groupLabel(selectedGroup.value)}記錄。`
  return `No ${selectedGroup.value} transactions in this period.`
})

function footerText(shown: number, total: number, group: Group): string {
  if (lang.value === 'zh-CN') return `仅显示前 ${shown} 笔，共 ${total} 笔${groupLabel(group)}`
  if (lang.value === 'zh-HK') return `僅顯示前 ${shown} 筆，共 ${total} 筆${groupLabel(group)}`
  return `Showing top ${shown} of ${total} ${group} transactions.`
}
</script>

<template>
  <section class="max-w-7xl mx-auto px-6 py-5">
    <div class="flex items-baseline justify-between mb-3 flex-wrap gap-2">
      <div class="text-xl font-bold text-[var(--vp-c-text-1)]">{{ label }}</div>
      <div class="text-sm text-[var(--vp-c-text-2)]">
        {{ data.ticker }}<span v-if="rangeText"> · {{ rangeText }}</span> · {{ totalText }}
      </div>
    </div>

    <!-- 顶部 group segmented pill：紧凑横排，让下方列表成为视觉重心 -->
    <div class="flex flex-wrap gap-2 mb-3">
      <button
        v-for="g in GROUPS"
        :key="g"
        type="button"
        class="action-pill inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm transition-all cursor-pointer focus-visible:outline-none"
        :class="selectedGroup === g
          ? 'font-bold shadow-sm'
          : 'border-[var(--vp-c-divider)] text-[var(--vp-c-text-2)] hover:bg-[var(--vp-c-bg-soft)]'"
        :style="selectedGroup === g
          ? { backgroundColor: GROUP_COLOR[g] + '1F', borderColor: GROUP_COLOR[g] + '66', color: GROUP_COLOR[g] }
          : {}"
        @click="selectedGroup = g"
      >
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :style="{ backgroundColor: GROUP_COLOR[g] }"
        ></span>
        <!-- 中文环境直接显示中文（"卖出"），英文环境显示大写英文（"SELL"），不再混排 -->
        <span
          class="font-semibold tracking-wide"
          :class="lang === 'en' ? 'uppercase' : ''"
        >{{ groupLabel(g) }}</span>
        <span class="tabular-nums">{{ counts[g] }}</span>
      </button>
    </div>

    <!-- 列表：跟 HoldingsTable / ChangesPanel 一致的圆角 border + divide -->
    <div
      v-if="displayed.length > 0"
      class="rounded-xl border border-[var(--vp-c-divider)] divide-y divide-[var(--vp-c-divider)] overflow-hidden"
    >
      <div
        v-for="(t, i) in displayed"
        :key="`${t.date}-${i}`"
        data-trade
        class="grid grid-cols-[6rem_1fr_auto] sm:grid-cols-[6.5rem_4.5rem_1fr_4.5rem_5.5rem] items-center gap-2.5 px-4 py-1.5 hover:bg-[var(--vp-c-bg-soft)] transition-colors"
      >
        <!-- 日期 -->
        <div class="text-sm text-[var(--vp-c-text-2)] tabular-nums whitespace-nowrap">
          {{ fmtDate(t.date) }}
        </div>

        <!-- 类型 badge（sm+ 独占一列；移动端塞进股数行的小字标签里）-->
        <span
          class="hidden sm:inline-flex justify-center items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide text-white whitespace-nowrap"
          :style="{ backgroundColor: GROUP_COLOR[groupOf(t.type)] }"
        >{{ t.type }}</span>

        <!-- 股数 + 头衔 -->
        <div class="min-w-0">
          <div
            class="text-sm font-semibold tabular-nums whitespace-nowrap"
            :style="{ color: GROUP_COLOR[groupOf(t.type)] }"
          >
            <span class="sm:hidden mr-2 text-xs uppercase opacity-80">{{ typeLabel(t.type) }}</span>
            {{ fmtSignedShares(deltaShares(t)) }}
            <span class="text-[var(--vp-c-text-3)] font-normal">{{ sharesUnit }}</span>
          </div>
          <div v-if="t.title" class="text-xs text-[var(--vp-c-text-3)] truncate">{{ t.title }}</div>
        </div>

        <!-- 单价（sm+）-->
        <span class="hidden sm:inline text-sm tabular-nums text-right text-[var(--vp-c-text-2)]">
          {{ priceText(t) }}
        </span>

        <!-- 总值（带方向 + action 主色）-->
        <span
          class="text-sm font-bold tabular-nums text-right whitespace-nowrap"
          :style="{ color: GROUP_COLOR[groupOf(t.type)] }"
        >{{ fmtSignedValue(deltaValue(t)) }}</span>
      </div>
    </div>

    <!-- 空态 -->
    <div
      v-else
      class="rounded-xl border border-[var(--vp-c-divider)] px-4 py-6 text-sm text-[var(--vp-c-text-3)] italic text-center"
    >
      {{ emptyText }}
    </div>

    <div
      v-if="filtered.length > displayed.length"
      class="mt-3 text-sm text-[var(--vp-c-text-3)] text-right"
    >
      {{ footerText(displayed.length, filtered.length, selectedGroup) }}
    </div>
  </section>
</template>
