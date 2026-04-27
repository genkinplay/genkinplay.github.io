<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

type Action = 'NEW' | 'ADDED' | 'REDUCED' | 'EXITED'
interface ChangeItem {
  action: Action
  name: string
  cusip: string
  shares: number
  value_usd: number
  delta_pct: string
  delta_usd: number
  prev_shares?: number
  prev_value_usd?: number
  ticker?: string | null
}

const props = defineProps<{
  data: {
    added?: number
    new?: number
    reduced?: number
    exited?: number
    period?: string
    prev_report_date?: string
    changes: ChangeItem[]
  }
  label: string
}>()

const ACTIONS: Action[] = ['NEW', 'ADDED', 'REDUCED', 'EXITED']

// Action 主色：跟旧版一致，用品牌色 + 蓝/橙系区分动作语义
const ACTION_COLOR: Record<Action, string> = {
  NEW:     '#00b8b8',
  ADDED:   '#4781ff',
  REDUCED: '#ff7333',
  EXITED:  '#ff5000',
}

// 13F 数据原始 action 是按"市值变化"分的（股价涨 → 即使减持也算 ADDED），
// 这跟普通读者的"加仓 = 真的加了股数"直觉不一致。
// 这里按股数变化重新分类，让 NEW/ADDED/REDUCED/EXITED 的语义跟实际操作方向一致。
function classify(ch: ChangeItem): Action {
  const prev = ch.prev_shares ?? 0
  if (prev === 0 && ch.shares > 0) return 'NEW'
  if (ch.shares === 0 && prev > 0) return 'EXITED'
  if (ch.shares > prev) return 'ADDED'
  if (ch.shares < prev) return 'REDUCED'
  return ch.action  // 股数无变化的边界情况，沿用上游 action
}

// 重新分类后的全量 changes（ch.action 已被覆盖成基于股数的分类）
const reclassified = computed<ChangeItem[]>(() =>
  props.data.changes.map((ch) => ({ ...ch, action: classify(ch) })),
)

const counts = computed(() => {
  const c: Record<Action, number> = { NEW: 0, ADDED: 0, REDUCED: 0, EXITED: 0 }
  for (const ch of reclassified.value) c[ch.action]++
  return c
})

// 默认显示 NEW（最关键的"新进仓位"），点击切换到其它动作
const selectedAction = ref<Action>('NEW')

const displayedChanges = computed(() =>
  reclassified.value.filter((ch) => ch.action === selectedAction.value).slice(0, 20),
)

const totalForSelected = computed(() =>
  reclassified.value.filter((ch) => ch.action === selectedAction.value).length,
)

// 用当前路由 lang 拼 longbridge 行情页 URL
const { lang } = useData()
const longbridgeLang = computed(() => {
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

// "shares" 单位 i18n
const sharesUnit = computed(() => {
  if (lang.value === 'zh-CN' || lang.value === 'zh-HK') return '股'
  return 'shares'
})

// 带正负号的市值（"+$351.66M" / "−$1.80B"），用 unicode minus 让宽度更整齐
const fmtSignedValue = (v: number): string => {
  if (v === 0) return '$0'
  const abs = Math.abs(v)
  const sign = v > 0 ? '+' : '−'
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`
  return `${sign}$${abs.toLocaleString()}`
}

// 带正负号的股数（"+5.07M" / "−104.50M"）
const fmtSignedShares = (n: number): string => {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  const sign = n > 0 ? '+' : '−'
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`
  return `${sign}${abs.toLocaleString()}`
}

// 单条变动对应的"股数变动量" = shares - prev_shares
// 重新分类后这个值的方向永远跟 action 方向一致：
//   NEW(prev=0)    → +shares
//   ADDED          → +Δshares
//   REDUCED        → −Δshares
//   EXITED(cur=0)  → −prev_shares
function deltaShares(ch: ChangeItem): number {
  return ch.shares - (ch.prev_shares ?? 0)
}

// 股数变化百分比（基于 prev_shares）。NEW 没法算（除以 0），EXITED 必然 −100%
// 都不显示，避免噪声。
function sharesChangePct(ch: ChangeItem): string | null {
  const prev = ch.prev_shares ?? 0
  if (prev === 0) return null
  if (ch.shares === 0) return null
  const pct = ((ch.shares - prev) / prev) * 100
  if (!Number.isFinite(pct)) return null
  const sign = pct > 0 ? '+' : '−'
  return `${sign}${Math.abs(pct).toFixed(1)}%`
}

// 把 YYYY-MM-DD 格式化为本地化日期
function fmtDate(d: string | undefined): string | null {
  if (!d) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) return d
  if (lang.value === 'zh-CN' || lang.value === 'zh-HK') {
    return `${m[1]} 年 ${parseInt(m[2]!, 10)} 月 ${parseInt(m[3]!, 10)} 日`
  }
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m[2]!, 10) - 1]} ${parseInt(m[3]!, 10)}, ${m[1]}`
}

// 标题右侧的副信息："Q3 2025 → Q4 2025" 或者 "截至 2025 年 12 月 31 日"
const periodText = computed<string | null>(() => {
  const cur = fmtDate(props.data.period)
  const prev = fmtDate(props.data.prev_report_date)
  if (cur && prev) {
    return `${prev} → ${cur}`
  }
  if (cur) {
    const prefix = (lang.value === 'zh-CN' || lang.value === 'zh-HK') ? '截至 ' : 'As of '
    return prefix + cur
  }
  return null
})

// "X positions changed" 三语
const totalChangesText = computed(() => {
  const n = props.data.changes.length
  if (lang.value === 'zh-CN') return `${n} 项变动`
  if (lang.value === 'zh-HK') return `${n} 項變動`
  return `${n} positions changed`
})

// Action 类别卡 label：英文用 NEW/ADDED/REDUCED/EXITED，中文给到本地化
function actionLabel(a: Action): string {
  if (lang.value === 'zh-CN') {
    return { NEW: '新进', ADDED: '加仓', REDUCED: '减仓', EXITED: '清仓' }[a]
  }
  if (lang.value === 'zh-HK') {
    return { NEW: '新進', ADDED: '加倉', REDUCED: '減倉', EXITED: '清倉' }[a]
  }
  return a
}

// footer 文案
function footerText(shown: number, total: number, action: Action): string {
  if (lang.value === 'zh-CN') return `仅显示前 ${shown} 项，共 ${total} 项${actionLabel(action)}`
  if (lang.value === 'zh-HK') return `僅顯示前 ${shown} 項，共 ${total} 項${actionLabel(action)}`
  return `Showing top ${shown} of ${total} ${action} positions.`
}

// 空态文案
const emptyText = computed(() => {
  const a = selectedAction.value
  if (lang.value === 'zh-CN') return `本季度没有${actionLabel(a)}持仓。`
  if (lang.value === 'zh-HK') return `本季度沒有${actionLabel(a)}持倉。`
  return `No ${a} positions this quarter.`
})

</script>

<template>
  <section class="max-w-7xl mx-auto px-6 py-7">
    <div class="flex items-baseline justify-between mb-6 flex-wrap gap-2">
      <div class="text-xl font-bold text-[var(--vp-c-text-1)]">{{ label }}</div>
      <div class="text-sm text-[var(--vp-c-text-2)]">
        <span v-if="periodText">{{ periodText }} · </span>
        {{ totalChangesText }}
      </div>
    </div>

    <!-- ───── 顶部 4 张 action 类别卡：圆形 badge + 大数字 + 切换 ───── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <button
        v-for="k in ACTIONS"
        :key="k"
        type="button"
        class="action-card no-underline relative rounded-2xl border border-[var(--vp-c-divider)] bg-transparent p-5 block text-left hover:bg-[var(--vp-c-bg-soft)] hover:shadow-md hover:-translate-y-0.5 focus-visible:bg-[var(--vp-c-bg-soft)] focus-visible:shadow-md focus-visible:outline-none transition-all text-[var(--vp-c-text-1)] cursor-pointer"
        :class="selectedAction === k ? 'bg-[var(--vp-c-bg-soft)] shadow-md -translate-y-0.5' : ''"
        @click="selectedAction = k"
      >
        <!-- action 名称（顶部 + colored）-->
        <div
          class="text-sm font-bold uppercase tracking-wide"
          :style="{ color: ACTION_COLOR[k] }"
        >{{ k }}</div>

        <!-- 数量 + 本地化标签 -->
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-bold tabular-nums">{{ counts[k] }}</span>
          <span class="text-sm text-[var(--vp-c-text-3)]">{{ actionLabel(k) }}</span>
        </div>
      </button>
    </div>

    <!-- ───── 下方明细列表：参照 HoldingsTable rest 行样式 ───── -->
    <div
      v-if="displayedChanges.length > 0"
      class="rounded-xl border border-[var(--vp-c-divider)] divide-y divide-[var(--vp-c-divider)] overflow-hidden"
    >
      <component
        v-for="(ch, i) in displayedChanges"
        :is="ch.ticker ? 'a' : 'div'"
        :key="ch.cusip + i"
        :href="ch.ticker ? quoteUrl(ch.ticker) : undefined"
        :target="ch.ticker ? '_blank' : undefined"
        :rel="ch.ticker ? 'noopener' : undefined"
        data-change
        class="change-row no-underline grid grid-cols-[2.5rem_2.25rem_1fr_auto] sm:grid-cols-[2.5rem_2.25rem_1fr_8rem_8rem] items-center gap-3 px-4 py-3 hover:bg-[var(--vp-c-bg-soft)] transition-colors text-[var(--vp-c-text-1)]"
      >
        <!-- 序号圆形 badge：背景色 = action 主色 -->
        <span
          class="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold tabular-nums text-white"
          :style="{ backgroundColor: ACTION_COLOR[ch.action] }"
        >{{ i + 1 }}</span>

        <!-- 股票 logo（无 ticker 时 lbkrs CDN 用 name 首字母兜底）-->
        <img
          :src="tickerIconUrl(ch.ticker, ch.name)"
          :alt="ch.name"
          class="w-9 h-9 rounded-full object-cover bg-[var(--vp-c-bg-soft)]"
          loading="lazy"
        />

        <!-- ticker + 弱化公司名 -->
        <div class="min-w-0">
          <div class="font-bold text-sm truncate tabular-nums">
            <span v-if="ch.ticker" class="text-[#4781ff] mr-1">US</span>
            <span>{{ ch.ticker || ch.name }}</span>
          </div>
          <div v-if="ch.ticker" class="text-sm text-[var(--vp-c-text-3)] truncate">
            {{ ch.name }}
          </div>
        </div>

        <!-- 中间：股数变动 + 百分比（仅 sm+ 显示）-->
        <div class="hidden sm:flex flex-col items-end leading-tight">
          <span
            class="text-sm font-semibold tabular-nums whitespace-nowrap"
            :style="{ color: ACTION_COLOR[ch.action] }"
          >{{ fmtSignedShares(deltaShares(ch)) }} <span class="text-[var(--vp-c-text-3)] font-normal">{{ sharesUnit }}</span></span>
          <span
            v-if="sharesChangePct(ch)"
            class="text-xs text-[var(--vp-c-text-3)] tabular-nums mt-0.5"
          >{{ sharesChangePct(ch) }}</span>
        </div>

        <!-- 右侧：金额变动（统一带正负号 + action 主色）-->
        <span
          class="text-sm font-bold tabular-nums text-right whitespace-nowrap"
          :style="{ color: ACTION_COLOR[ch.action] }"
        >{{ fmtSignedValue(ch.delta_usd) }}</span>
      </component>
    </div>

    <!-- 空态 -->
    <div
      v-else
      class="rounded-xl border border-[var(--vp-c-divider)] px-4 py-6 text-sm text-[var(--vp-c-text-3)] italic text-center"
    >
      {{ emptyText }}
    </div>

    <div
      v-if="totalForSelected > displayedChanges.length"
      class="mt-3 text-sm text-[var(--vp-c-text-3)] text-right"
    >
      {{ footerText(displayedChanges.length, totalForSelected, selectedAction) }}
    </div>
  </section>
</template>
