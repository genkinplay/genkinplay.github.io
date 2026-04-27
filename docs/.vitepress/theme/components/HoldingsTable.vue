<script setup lang="ts">
import { computed } from 'vue'

interface Holding {
  cusip: string
  name: string
  share_type: string
  shares: number
  value_usd: number
  weight_pct: string
}

const props = defineProps<{
  holdings: Holding[]
  topN: number
  label: string
  periodLabel: string
}>()

const rows = computed(() => props.holdings.slice(0, props.topN))
const fmtB = (v: number) => `$${(v / 1e9).toFixed(2)}B`
const pctBarWidth = (pct: string) => {
  const n = parseFloat(pct)
  return `${Math.max(2, Math.min(100, n * 4))}px`
}
</script>

<template>
  <section class="max-w-5xl mx-auto px-6 py-12">
    <div class="flex items-baseline justify-between mb-4">
      <div class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-text-2)]">{{ label }}</div>
      <div class="text-xs text-[var(--vp-c-text-2)]">{{ periodLabel }}</div>
    </div>
    <table class="w-full text-sm">
      <thead class="text-xs uppercase tracking-wider text-[var(--vp-c-text-2)]">
        <tr>
          <th class="text-left py-2">Security</th>
          <th class="text-left py-2">Weight</th>
          <th class="text-right py-2">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in rows" :key="h.cusip" class="border-t border-[var(--vp-c-divider)]">
          <td class="py-3 font-medium">{{ h.name }}</td>
          <td class="py-3">
            <span class="inline-block align-middle h-2 bg-[var(--vp-c-brand-1,#00b8b8)] rounded mr-2" :style="{ width: pctBarWidth(h.weight_pct) }"></span>
            {{ h.weight_pct }}%
          </td>
          <td class="py-3 text-right tabular-nums">{{ fmtB(h.value_usd) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
