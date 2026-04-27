import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { normalize, resolveTicker } from '@scripts/lib/ticker-resolver'

const TMP = join(__dirname, '../../.tmp-ticker-resolver')
const SEC_PATH = join(TMP, 'data/sec-tickers.json')

const FAKE_SEC = {
  '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
  '1': { cik_str: 1652044, ticker: 'GOOGL', title: 'Alphabet Inc.' },
  '2': { cik_str: 1318605, ticker: 'TSLA', title: 'Tesla, Inc.' },
}

function setup() {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(join(TMP, 'data'), { recursive: true })
  writeFileSync(SEC_PATH, JSON.stringify(FAKE_SEC))
}

describe('normalize', () => {
  it('strips suffixes and punctuation', () => {
    expect(normalize('Apple Inc.')).toBe('APPLE')
    expect(normalize('Tesla, Inc.')).toBe('TESLA')
    expect(normalize('CHEVRON CORP NEW')).toBe('CHEVRON')
    expect(normalize("Moody's Corp")).toBe('MOODY S')
  })

  it('strips OF for matching "Bank of America" → "Bank America"', () => {
    expect(normalize('Bank of America Corporation')).toBe('BANK AMERICA')
  })
})

describe('resolveTicker', () => {
  it('matches by normalized title', () => {
    setup()
    expect(resolveTicker('APPLE INC', { secTickersPath: SEC_PATH })).toBe('AAPL')
    expect(resolveTicker('Tesla Inc', { secTickersPath: SEC_PATH })).toBe('TSLA')
    expect(resolveTicker('ALPHABET INC', { secTickersPath: SEC_PATH })).toBe('GOOGL')
  })

  it('falls back to override map when SEC title differs', () => {
    setup()
    // MASTERCARD INCORPORATED 不在 fake SEC 数据里，但在 OVERRIDES 里
    expect(resolveTicker('MASTERCARD INCORPORATED', { secTickersPath: SEC_PATH })).toBe('MA')
    // BERKSHIRE HATHAWAY INC 也只通过 OVERRIDES 兜底
    expect(resolveTicker('BERKSHIRE HATHAWAY INC', { secTickersPath: SEC_PATH })).toBe('BRK.B')
  })

  it('handles SEC titles with state codes and abbreviations', () => {
    setup()
    // SEC 数据里没这些条目，所以这里只是验证 normalize 不会因为这些写法而崩
    expect(normalize('LOUISIANA-PACIFIC CORP')).toBe('LOUISIANA PACIFIC')
    expect(normalize('CHARTER COMMUNICATIONS, INC. /MO/')).toBe('CHARTER COMMUNICATIONS')
    expect(normalize('ALLY FINL INC')).toBe('ALLY FINANCIAL')
    expect(normalize('OCCIDENTAL PETE CORP')).toBe('OCCIDENTAL PETROLEUM')
  })

  it('returns null when neither SEC nor override has it', () => {
    setup()
    expect(resolveTicker('SOME UNKNOWN HOLDING', { secTickersPath: SEC_PATH })).toBeNull()
  })
})
