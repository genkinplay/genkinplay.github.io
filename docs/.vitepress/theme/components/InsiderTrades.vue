<script setup lang="ts">
import { computed } from 'vue'

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

const rowsToShow = computed(() => props.rows ?? 8)

const recent = computed(() =>
  [...props.data.trades]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, rowsToShow.value),
)

const typeColor: Record<string, string> = {
  BUY:      'text-[var(--vp-c-brand-1,#00b8b8)]',
  GRANT:    'text-[var(--vp-c-brand-1,#00b8b8)]',
  EXERCISE: 'text-[#4781ff]',
  SELL:     'text-[#ff5000]',
  DISP:     'text-[#ff7333]',
  TAX:      'text-[var(--vp-c-text-3)]',
  GIFT:     'text-[var(--vp-c-text-3)]',
  J:        'text-[var(--vp-c-text-3)]',
}

const fmtShares = (n: number): string => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

const fmtValue = (v: number | undefined): string => {
  if (!v) return '—'
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v}`
}
</script>

<template>
  <section class="max-w-5xl mx-auto px-6 py-12">
    <div class="flex items-baseline justify-between mb-4 flex-wrap gap-2">
      <div class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-text-2)]">
        {{ label }}
      </div>
      <div class="text-xs text-[var(--vp-c-text-2)]">
        {{ ticker_label }} {{ data.ticker }} · {{ data.total_count }} filings · SEC Form 4
      </div>
    </div>

    <table class="w-full text-sm">
      <thead class="text-xs uppercase tracking-wider text-[var(--vp-c-text-2)]">
        <tr>
          <th class="text-left py-2">Date</th>
          <th class="text-left py-2">Type</th>
          <th class="text-right py-2">Shares</th>
          <th class="text-right py-2 hidden sm:table-cell">Price</th>
          <th class="text-right py-2">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(t, i) in recent"
          :key="`${t.date}-${i}`"
          class="border-t border-[var(--vp-c-divider)]"
        >
          <td class="py-3 tabular-nums">{{ t.date }}</td>
          <td class="py-3">
            <span :class="['text-xs font-bold uppercase', typeColor[t.type] ?? 'text-[var(--vp-c-text-2)]']">
              {{ t.type }}
            </span>
          </td>
          <td class="py-3 text-right tabular-nums">{{ fmtShares(t.shares) }}</td>
          <td class="py-3 text-right tabular-nums hidden sm:table-cell">
            {{ t.price ? `$${t.price.toFixed(2)}` : '—' }}
          </td>
          <td class="py-3 text-right tabular-nums">{{ fmtValue(t.value) }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="data.total_count > rowsToShow" class="mt-3 text-xs text-[var(--vp-c-text-3)]">
      Showing {{ rowsToShow }} of {{ data.total_count }} most recent transactions.
    </div>
  </section>
</template>
