import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InsiderTrades from '@theme/components/InsiderTrades.vue'

const FEED = {
  ticker: 'NVDA.US',
  owner_match: 'huang jen',
  fetched_at: '2026-04-27T00:00:00Z',
  total_count: 12,
  trades: [
    { date: '2026-03-18', owner: 'HUANG JEN HSUN', type: 'GRANT', code: 'A', shares: 58_962_602, value: 0 },
    { date: '2026-03-18', owner: 'HUANG JEN HSUN', type: 'TAX', code: 'F', shares: 437_908, value: 79_700_000 },
    { date: '2025-12-18', owner: 'HUANG JEN HSUN', type: 'SELL', code: 'S', shares: 100_000, price: 145.5, value: 14_550_000 },
  ],
}

describe('InsiderTrades', () => {
  it('renders top recent trades with formatted shares + value', () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker' },
    })
    expect(w.findAll('tbody tr').length).toBeGreaterThan(0)
    expect(w.text()).toContain('GRANT')
    expect(w.text()).toContain('SELL')
    expect(w.text()).toContain('NVDA.US')
    expect(w.text()).toContain('12 filings')
  })

  it('formats large share counts with M / K suffix', () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker' },
    })
    // 58_962_602 → 58.96M, 437_908 → 437.9K (or similar), 100_000 → 100.0K
    expect(w.text()).toMatch(/58\.\d+M/)
    expect(w.text()).toMatch(/100\.\d+K/)
  })

  it('caps rows by `rows` prop', () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker', rows: 1 },
    })
    expect(w.findAll('tbody tr')).toHaveLength(1)
  })

  it('sorts by date desc (most recent first)', () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker' },
    })
    const firstRow = w.findAll('tbody tr')[0]?.text() ?? ''
    expect(firstRow).toContain('2026-03-18')
  })
})
