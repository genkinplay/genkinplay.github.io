import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HoldingsTable from '@theme/components/HoldingsTable.vue'

const HOLDINGS = [
  { cusip: '037833100', name: 'APPLE INC',       share_type: 'SH', shares: 227917808, value_usd: 61961735283, weight_pct: '22.60' },
  { cusip: '025816109', name: 'AMERICAN EXPRESS', share_type: 'SH', shares: 151610700, value_usd: 56088378465, weight_pct: '20.46' },
]

describe('HoldingsTable', () => {
  it('renders top N rows with name, weight, value', () => {
    const w = mount(HoldingsTable, { props: { holdings: HOLDINGS, topN: 2, label: 'Top Holdings', periodLabel: 'as of 2025-12-31' }})
    expect(w.findAll('[data-holding]')).toHaveLength(2)
    expect(w.text()).toContain('APPLE INC')
    expect(w.text()).toContain('22.60%')
    expect(w.text()).toMatch(/\$61\.\d+B/)
  })

  it('caps at topN', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      cusip: String(i), name: `STOCK ${i}`, share_type: 'SH',
      shares: 1000, value_usd: 1_000_000_000, weight_pct: '1.00',
    }))
    const w = mount(HoldingsTable, { props: { holdings: many, topN: 20, label: 'x', periodLabel: 'x' }})
    expect(w.findAll('[data-holding]')).toHaveLength(20)
  })
})
