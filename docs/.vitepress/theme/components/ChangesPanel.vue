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
  ticker?: string | null
}

const props = defineProps<{
  data: { added: number; changes: ChangeItem[] }
  label: string
}>()

const counts = computed(() => {
  const c: Record<Action, number> = { NEW: 0, ADDED: 0, REDUCED: 0, EXITED: 0 }
  for (const ch of props.data.changes) c[ch.action]++
  return c
})

const actionColor: Record<Action, string> = {
  NEW:     'text-[var(--vp-c-brand-1,#00b8b8)]',
  ADDED:   'text-[#4781ff]',
  REDUCED: 'text-[#ff7333]',
  EXITED:  'text-[#ff5000]',
}

const actionRing: Record<Action, string> = {
  NEW:     'border-[var(--vp-c-brand-1,#00b8b8)]',
  ADDED:   'border-[#4781ff]',
  REDUCED: 'border-[#ff7333]',
  EXITED:  'border-[#ff5000]',
}

// 鼠标悬停某个 action 卡片时，下方列表只展示该 action 的明细。
// 行为是"粘性"的：鼠标移出卡片后保持过滤，直到 hover 到另一个卡片才切换。
// 默认显示 NEW（最关键的"新进仓位"）。
const hoverAction = ref<Action>('NEW')

const displayedChanges = computed(() =>
  props.data.changes.filter((ch) => ch.action === hoverAction.value).slice(0, 10),
)

const { lang } = useData()
const longbridgeLang = computed(() => {
  if (lang.value === 'zh-CN') return 'zh-CN'
  if (lang.value === 'zh-HK') return 'zh-HK'
  return 'en'
})
const quoteUrl = (ticker: string): string =>
  `https://longbridge.com/${longbridgeLang.value}/quote/${ticker}.US/topics`
</script>

<template>
  <section class="max-w-5xl mx-auto px-6 py-7">
    <div class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-4">{{ label }}</div>

    <div class="grid grid-cols-4 gap-4 mb-6">
      <button
        v-for="k in ['NEW','ADDED','REDUCED','EXITED'] as const"
        :key="k"
        type="button"
        class="rounded-xl border p-4 text-center transition-all cursor-default"
        :class="[
          hoverAction === k
            ? `${actionRing[k]} shadow-md -translate-y-0.5 bg-[var(--vp-c-bg-soft)]`
            : 'border-[var(--vp-c-divider)] hover:border-[var(--vp-c-text-3)]',
        ]"
        @mouseenter="hoverAction = k"
        @focus="hoverAction = k"
      >
        <div :class="['text-xs font-bold uppercase', actionColor[k]]">{{ k }}</div>
        <div class="text-2xl font-bold mt-2 tabular-nums">{{ counts[k] }}</div>
      </button>
    </div>

    <div class="divide-y divide-[var(--vp-c-divider)] text-sm min-h-[2.5rem]">
      <div
        v-for="(ch, i) in displayedChanges"
        :key="ch.cusip + i"
        class="py-2 flex items-center justify-between"
      >
        <div class="min-w-0">
          <span :class="['text-xs font-bold uppercase mr-2', actionColor[ch.action]]">{{ ch.action }}</span>
          <a
            v-if="ch.ticker"
            :href="quoteUrl(ch.ticker)"
            target="_blank"
            rel="noopener"
            class="hover:text-[var(--vp-c-brand-1,#00b8b8)] transition-colors"
          >{{ ch.name }} <span class="text-xs font-mono text-[var(--vp-c-text-3)]">{{ ch.ticker }}</span></a>
          <span v-else>{{ ch.name }}</span>
        </div>
        <span class="text-[var(--vp-c-text-2)] tabular-nums">{{ ch.delta_pct }}</span>
      </div>

      <!-- 当 hover 某个 action 但该类无明细时，给个友好占位 -->
      <div
        v-if="hoverAction && displayedChanges.length === 0"
        class="py-3 text-xs text-[var(--vp-c-text-3)] italic"
      >
        No {{ hoverAction }} positions this quarter.
      </div>
    </div>
  </section>
</template>
