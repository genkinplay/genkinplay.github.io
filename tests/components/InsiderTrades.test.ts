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
    { date: '2025-12-20', owner: 'HUANG JEN HSUN', type: 'SELL', code: 'S', shares: 30_000, price: 138, value: 4_140_000 },
    { date: '2025-12-19', owner: 'HUANG JEN HSUN', type: 'SELL', code: 'S', shares: 50_000, price: 140, value: 7_000_000 },
    { date: '2025-12-18', owner: 'HUANG JEN HSUN', type: 'SELL', code: 'S', shares: 100_000, price: 145.5, value: 14_550_000 },
  ],
}

describe('InsiderTrades', () => {
  it('renders SELL transactions by default with negative-signed shares', () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker' },
    })
    // 默认 SELL 分类，FEED 里有 3 条 SELL
    expect(w.findAll('[data-trade]').length).toBe(3)
    // SELL 是减仓方向，股数应带 unicode minus
    expect(w.text()).toMatch(/−100\.\d+K/)
    // 类型 badge 仍可见
    expect(w.text()).toContain('SELL')
  })

  it('shows ticker, total count, and date range in header', () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker' },
    })
    expect(w.text()).toContain('NVDA.US')
    expect(w.text()).toContain('12 filings')
    // 区间：first 2025-12-18 → last 2026-03-18
    expect(w.text()).toContain('Dec 18, 2025')
    expect(w.text()).toContain('Mar 18, 2026')
  })

  it('shows all four category cards with counts', () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker' },
    })
    const text = w.text()
    expect(text).toMatch(/BUY.*0/s)     // FEED 没有 BUY
    expect(text).toMatch(/SELL.*3/s)    // 3 条 SELL
    expect(text).toMatch(/GRANT.*1/s)   // 1 条 GRANT
    expect(text).toMatch(/OTHER.*1/s)   // 1 条 TAX 归到 OTHER
  })

  it('switches list when clicking another category card', async () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker' },
    })
    const grantBtn = w.findAll('button').find((b) => b.text().includes('GRANT'))
    expect(grantBtn).toBeDefined()
    await grantBtn!.trigger('click')
    // GRANT 类别下只有 1 条，应该是 GRANT 58.96M（带正号）
    expect(w.findAll('[data-trade]')).toHaveLength(1)
    expect(w.text()).toMatch(/\+58\.\d+M/)
  })

  it('caps rows by `rows` prop within selected category', () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker', rows: 2 },
    })
    // SELL 有 3 条，cap 到 2
    expect(w.findAll('[data-trade]')).toHaveLength(2)
  })

  it('sorts trades by date desc (most recent first)', () => {
    const w = mount(InsiderTrades, {
      props: { data: FEED, label: 'Form 4', ticker_label: 'Ticker' },
    })
    const firstRow = w.findAll('[data-trade]')[0]?.text() ?? ''
    expect(firstRow).toContain('Dec 20, 2025')
  })
})
