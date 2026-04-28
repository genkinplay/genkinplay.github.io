<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

// 数据卫生：剔除 shares 等于 prev_shares 的条目。
// longbridge CLI 会把"shares 没变但股价波动 → 市值变化"的条目误标成 ADDED/REDUCED，
// 这种条目本质是 mark-to-market 估值波动，不是实际买卖，不应混在"季度变化"里。
// 重新分类基于股数变化方向，让 NEW/ADDED/REDUCED/EXITED 跟实际操作方向一致。
const reclassified = computed<ChangeItem[]>(() =>
  props.data.changes
    .filter((ch) => ch.shares !== (ch.prev_shares ?? 0))
    .map((ch) => ({ ...ch, action: classify(ch) })),
)

const counts = computed(() => {
  const c: Record<Action, number> = { NEW: 0, ADDED: 0, REDUCED: 0, EXITED: 0 }
  for (const ch of reclassified.value) c[ch.action]++
  return c
})

// 默认显示 NEW（最关键的"新进仓位"），点击切换到其它动作
const selectedAction = ref<Action>('NEW')

// 折叠：每个分类下超过 10 条默认收起，按钮展开。切换分类时自动重置。
const COLLAPSED_LIMIT = 10
const expanded = ref(false)
watch(selectedAction, () => {
  expanded.value = false
})

const filteredByAction = computed(() =>
  reclassified.value.filter((ch) => ch.action === selectedAction.value),
)

const totalForSelected = computed(() => filteredByAction.value.length)

const collapsible = computed(() => totalForSelected.value > COLLAPSED_LIMIT)

const displayedChanges = computed(() => {
  if (!collapsible.value || expanded.value) return filteredByAction.value
  return filteredByAction.value.slice(0, COLLAPSED_LIMIT)
})

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

// 空态文案
const emptyText = computed(() => {
  const a = selectedAction.value
  if (lang.value === 'zh-CN') return `本季度没有${actionLabel(a)}持仓。`
  if (lang.value === 'zh-HK') return `本季度沒有${actionLabel(a)}持倉。`
  return `No ${a} positions this quarter.`
})

// 展开/收起按钮文案
const toggleLabel = computed(() => {
  const a = selectedAction.value
  const total = totalForSelected.value
  if (lang.value === 'zh-CN') return expanded.value ? '收起' : `展开全部 ${total} 项${actionLabel(a)}`
  if (lang.value === 'zh-HK') return expanded.value ? '收起' : `展開全部 ${total} 項${actionLabel(a)}`
  return expanded.value ? 'Show less' : `Show all ${total} ${a}`
})

</script>

<template>
  <section class="max-w-7xl mx-auto px-6 py-5">
    <div class="flex items-baseline justify-between mb-3 flex-wrap gap-2">
      <div class="text-xl font-bold text-[var(--vp-c-text-1)]">{{ label }}</div>
      <div class="text-sm text-[var(--vp-c-text-2)]">
        <span v-if="periodText">{{ periodText }} · </span>
        {{ totalChangesText }}
      </div>
    </div>

    <!-- ───── 顶部 action segmented pill：紧凑横排，让下方列表成为视觉重心 ───── -->
    <div class="flex flex-wrap gap-2 mb-3">
      <button
        v-for="k in ACTIONS"
        :key="k"
        type="button"
        class="action-pill inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm transition-all cursor-pointer focus-visible:outline-none"
        :class="selectedAction === k
          ? 'font-bold shadow-sm'
          : 'border-[var(--vp-c-divider)] text-[var(--vp-c-text-2)] hover:bg-[var(--vp-c-bg-soft)]'"
        :style="selectedAction === k
          ? { backgroundColor: ACTION_COLOR[k] + '1F', borderColor: ACTION_COLOR[k] + '66', color: ACTION_COLOR[k] }
          : {}"
        @click="selectedAction = k"
      >
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :style="{ backgroundColor: ACTION_COLOR[k] }"
        ></span>
        <!-- 中文环境直接显示中文（"加仓"），英文环境显示大写英文（"ADDED"），不再混排 -->
        <span
          class="font-semibold tracking-wide"
          :class="lang === 'en' ? 'uppercase' : ''"
        >{{ actionLabel(k) }}</span>
        <span class="tabular-nums">{{ counts[k] }}</span>
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
        class="change-row no-underline grid grid-cols-[2rem_1.75rem_1fr_auto] sm:grid-cols-[2rem_1.75rem_1fr_7rem_7rem] items-center gap-2.5 px-4 py-1.5 hover:bg-[var(--vp-c-bg-soft)] transition-colors text-[var(--vp-c-text-1)]"
      >
        <!-- 序号圆形 badge：背景色 = action 主色 -->
        <span
          class="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold tabular-nums text-white"
          :style="{ backgroundColor: ACTION_COLOR[ch.action] }"
        >{{ i + 1 }}</span>

        <!-- 股票 logo（无 ticker 时 lbkrs CDN 用 name 首字母兜底）-->
        <img
          :src="tickerIconUrl(ch.ticker, ch.name)"
          :alt="ch.name"
          class="w-7 h-7 rounded-full object-cover bg-[var(--vp-c-bg-soft)]"
          loading="lazy"
        />

        <!-- ticker + 弱化公司名（leading-tight 让两行紧贴）-->
        <div class="min-w-0 leading-tight">
          <div class="font-bold text-sm truncate tabular-nums">
            <span v-if="ch.ticker" class="text-[#4781ff] mr-1">US</span>
            <span>{{ ch.ticker || ch.name }}</span>
          </div>
          <div v-if="ch.ticker" class="text-[11px] text-[var(--vp-c-text-3)] truncate mt-0.5">
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

    <!-- 展开/收起按钮（仅当此分类下超过 10 项时显示）-->
    <div v-if="collapsible" class="mt-3">
      <button
        type="button"
        class="changes-toggle text-sm font-semibold cursor-pointer hover:underline focus-visible:underline focus-visible:outline-none"
        @click="expanded = !expanded"
      >
        {{ toggleLabel }}
        <span aria-hidden="true" class="ml-0.5">{{ expanded ? '↑' : '↓' }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.changes-toggle {
  color: var(--vp-c-brand-1, #00b8b8);
}
</style>
