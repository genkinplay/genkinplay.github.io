import { describe, it, expect, vi } from 'vitest'
import {
  runInsiderTrades,
  filterByOwner,
  type InsiderTrade,
} from '@scripts/lib/insider-trades'
import { CliUnavailableError, CliExecutionError } from '@scripts/lib/cli'

describe('runInsiderTrades', () => {
  it('parses JSON insider-trades output for a US symbol', async () => {
    const fakeFeed: InsiderTrade[] = [
      { date: '2026-03-18', owner: 'HUANG JEN HSUN', type: 'GRANT', code: 'A', shares: 1000, value: 0 },
    ]
    const fakeExec = vi.fn().mockResolvedValue({ stdout: JSON.stringify(fakeFeed), code: 0 })
    const trades = await runInsiderTrades('NVDA.US', { exec: fakeExec })
    expect(trades).toHaveLength(1)
    expect(trades[0]?.owner).toBe('HUANG JEN HSUN')
    expect(fakeExec).toHaveBeenCalledWith('longbridge', [
      'insider-trades',
      'NVDA.US',
      '--format',
      'json',
      '--count',
      '200',
    ])
  })

  it('respects the count option', async () => {
    const fakeExec = vi.fn().mockResolvedValue({ stdout: '[]', code: 0 })
    await runInsiderTrades('NVDA.US', { exec: fakeExec, count: 50 })
    expect(fakeExec).toHaveBeenCalledWith('longbridge', [
      'insider-trades',
      'NVDA.US',
      '--format',
      'json',
      '--count',
      '50',
    ])
  })

  it('throws CliUnavailableError when binary is missing', async () => {
    const fakeExec = vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    await expect(runInsiderTrades('NVDA.US', { exec: fakeExec })).rejects.toBeInstanceOf(
      CliUnavailableError,
    )
  })

  it('throws CliExecutionError on non-zero exit', async () => {
    const fakeExec = vi.fn().mockResolvedValue({ stdout: '', stderr: 'no data', code: 1 })
    await expect(runInsiderTrades('XX.US', { exec: fakeExec })).rejects.toBeInstanceOf(
      CliExecutionError,
    )
  })
})

describe('filterByOwner', () => {
  const FEED: InsiderTrade[] = [
    { date: '2026-03-18', owner: 'HUANG JEN HSUN', type: 'GRANT', code: 'A', shares: 100 },
    { date: '2026-03-15', owner: 'Some Other Officer', type: 'SELL', code: 'S', shares: 50 },
    { date: '2026-03-10', owner: 'huang jen hsun', type: 'TAX', code: 'F', shares: 25 },
  ]

  it('case-insensitively filters by owner substring', () => {
    const matches = filterByOwner(FEED, 'huang jen')
    expect(matches).toHaveLength(2)
    expect(matches.every((t) => t.owner.toLowerCase().includes('huang jen'))).toBe(true)
  })

  it('returns all entries when match string is empty', () => {
    expect(filterByOwner(FEED, '   ')).toHaveLength(3)
  })

  it('returns empty when no match', () => {
    expect(filterByOwner(FEED, 'musk')).toHaveLength(0)
  })
})
