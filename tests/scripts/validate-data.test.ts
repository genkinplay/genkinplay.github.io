import { describe, it, expect } from 'vitest'
import { validateHoldingsFile, validateChangesFile } from '../../scripts/validate-data'

describe('validate-data: holdings', () => {
  const validHoldings = {
    period: '2025-12-31',
    total_value_usd: 1_000_000_000,
    holdings: [
      { name: 'Apple Inc', cusip: '037833100', ticker: 'AAPL', shares: 1000, value_usd: 200_000, weight_pct: '0.02' },
    ],
  }

  it('passes a clean holdings file', () => {
    expect(validateHoldingsFile('a.json', validHoldings)).toEqual([])
  })

  it('flags negative shares', () => {
    const issues = validateHoldingsFile('a.json', {
      ...validHoldings,
      holdings: [{ ...validHoldings.holdings[0], shares: -1 }],
    })
    expect(issues.some((i) => i.code === 'holding.shares' && i.level === 'error')).toBe(true)
  })

  it('flags weight_pct out of range', () => {
    const issues = validateHoldingsFile('a.json', {
      ...validHoldings,
      holdings: [{ ...validHoldings.holdings[0], weight_pct: '150' }],
    })
    expect(issues.some((i) => i.code === 'holding.weight_pct' && i.level === 'error')).toBe(true)
  })

  it('flags invalid period format', () => {
    const issues = validateHoldingsFile('a.json', { ...validHoldings, period: 'Q4 2025' })
    expect(issues.some((i) => i.code === 'period' && i.level === 'error')).toBe(true)
  })

  it('flags non-positive total_value_usd', () => {
    const issues = validateHoldingsFile('a.json', { ...validHoldings, total_value_usd: 0 })
    expect(issues.some((i) => i.code === 'total_value_usd' && i.level === 'error')).toBe(true)
  })
})

describe('validate-data: changes', () => {
  const baseChange = {
    cusip: '037833100',
    name: 'Apple Inc',
    ticker: 'AAPL',
    delta_pct: '+5.0',
    delta_usd: 1_000_000,
  }

  const wrap = (changes: unknown[]) => ({
    period: '2025-12-31',
    prev_report_date: '2025-09-30',
    changes,
  })

  it('passes a clean changes file', () => {
    expect(
      validateChangesFile('c.json', wrap([
        { ...baseChange, action: 'ADDED', shares: 100, prev_shares: 90 },
        { ...baseChange, action: 'NEW', shares: 50, prev_shares: 0 },
        { ...baseChange, action: 'EXITED', shares: 0, prev_shares: 100 },
      ])),
    ).toEqual([])
  })

  it('errors when NEW has prev_shares > 0', () => {
    const issues = validateChangesFile('c.json', wrap([
      { ...baseChange, action: 'NEW', shares: 50, prev_shares: 10 },
    ]))
    expect(issues.some((i) => i.code === 'change.NEW_with_prev' && i.level === 'error')).toBe(true)
  })

  it('errors when EXITED has shares > 0', () => {
    const issues = validateChangesFile('c.json', wrap([
      { ...baseChange, action: 'EXITED', shares: 5, prev_shares: 100 },
    ]))
    expect(issues.some((i) => i.code === 'change.EXITED_with_shares' && i.level === 'error')).toBe(true)
  })

  it('errors on invalid action enum', () => {
    const issues = validateChangesFile('c.json', wrap([
      { ...baseChange, action: 'BOUGHT', shares: 10, prev_shares: 0 },
    ]))
    expect(issues.some((i) => i.code === 'change.action' && i.level === 'error')).toBe(true)
  })

  it('warns (not errors) when ADDED/REDUCED has shares == prev_shares', () => {
    const issues = validateChangesFile('c.json', wrap([
      { ...baseChange, action: 'ADDED', shares: 100, prev_shares: 100 },
      { ...baseChange, action: 'REDUCED', shares: 100, prev_shares: 100 },
    ]))
    const w = issues.find((i) => i.code === 'change.zero_share_delta')
    expect(w).toBeDefined()
    expect(w?.level).toBe('warning')
    // 关键：mark-to-market 误标只 warn 不 error
    expect(issues.some((i) => i.level === 'error' && i.code === 'change.zero_share_delta')).toBe(false)
  })

  it('errors when delta_usd is missing', () => {
    const issues = validateChangesFile('c.json', wrap([
      { ...baseChange, action: 'ADDED', shares: 10, prev_shares: 5, delta_usd: undefined },
    ]))
    expect(issues.some((i) => i.code === 'change.delta_usd' && i.level === 'error')).toBe(true)
  })
})
