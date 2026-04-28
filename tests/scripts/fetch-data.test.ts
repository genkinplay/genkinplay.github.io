import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fetchAllInvestors } from '@scripts/fetch-data'

const TMP = join(__dirname, '../../.tmp-fetch-test')

const investorYaml = (slug: string, source: '13f' | 'curated', cik = '') => `
slug: ${slug}
display_name: { en: X, zh-CN: X, zh-HK: X }
tagline:      { en: t, zh-CN: t, zh-HK: t }
role:         { en: r, zh-CN: r, zh-HK: r }
born: 1970
portrait: /portraits/${slug}.jpg
cik: "${cik}"
holdings_source: "${source}"
skill_file: ${slug}.zip
bio: { en: b, zh-CN: b, zh-HK: b }
philosophy: []
quotes: []
milestones: []
${source === 'curated' ? 'notable_holdings:\n  - name: X\n    kind: Equity\n    note: { en: n, zh-CN: n, zh-HK: n }\n' : ''}
`

describe('fetchAllInvestors', () => {
  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(join(TMP, 'data/investors'), { recursive: true })
    mkdirSync(join(TMP, 'data/holdings'), { recursive: true })
    mkdirSync(join(TMP, 'data/changes'), { recursive: true })
    mkdirSync(join(TMP, '.cache/holdings'), { recursive: true })
    mkdirSync(join(TMP, '.cache/changes'), { recursive: true })
  })
  afterEach(() => rmSync(TMP, { recursive: true, force: true }))

  it('writes holdings+changes for 13F investor when CLI succeeds', async () => {
    writeFileSync(join(TMP, 'data/investors/buffett.yaml'), investorYaml('buffett', '13f', '0001067983'))
    const fakeCli = vi.fn()
      .mockResolvedValueOnce({ cik: '0001067983', holdings: [], period: '2025-12-31' })
      .mockResolvedValueOnce({ added: 0, changes: [] })

    const report = await fetchAllInvestors({ root: TMP, runCli: fakeCli })

    expect(existsSync(join(TMP, 'data/holdings/buffett.json'))).toBe(true)
    expect(existsSync(join(TMP, 'data/changes/buffett.json'))).toBe(true)
    expect(report.successes).toContain('buffett')
    expect(fakeCli).toHaveBeenCalledTimes(2)
  })

  it('skips CLI for curated investor', async () => {
    writeFileSync(join(TMP, 'data/investors/musk.yaml'), investorYaml('musk', 'curated'))
    const fakeCli = vi.fn()

    const report = await fetchAllInvestors({ root: TMP, runCli: fakeCli })

    expect(fakeCli).not.toHaveBeenCalled()
    expect(report.skipped).toContain('musk')
  })

  it('falls back to cache when CLI fails but cache exists', async () => {
    writeFileSync(join(TMP, 'data/investors/buffett.yaml'), investorYaml('buffett', '13f', '0001067983'))
    writeFileSync(join(TMP, '.cache/holdings/buffett.json'), JSON.stringify({ cached: true }))
    writeFileSync(join(TMP, '.cache/changes/buffett.json'), JSON.stringify({ cached: true }))
    const fakeCli = vi.fn().mockRejectedValue(new Error('boom'))

    const report = await fetchAllInvestors({ root: TMP, runCli: fakeCli })

    expect(report.fallbacks).toContain('buffett')
    expect(JSON.parse(readFileSync(join(TMP, 'data/holdings/buffett.json'), 'utf-8'))).toEqual({
      cached: true,
    })
  })

  it('records failure when CLI fails and no cache exists', async () => {
    writeFileSync(join(TMP, 'data/investors/buffett.yaml'), investorYaml('buffett', '13f', '0001067983'))
    const fakeCli = vi.fn().mockRejectedValue(new Error('boom'))

    const report = await fetchAllInvestors({ root: TMP, runCli: fakeCli })

    expect(report.failures).toContain('buffett')
    expect(existsSync(join(TMP, 'data/holdings/buffett.json'))).toBe(false)
  })
})
