import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import yaml from 'js-yaml'
import { generateTop50, toSlug } from '../../scripts/generate-top50'

function makeRow(over: Partial<{ rank: number; name: string; aum_b: number; period: string; cik: string }> = {}) {
  return {
    rank: 1,
    name: 'Acme Capital LLC',
    aum_b: 100,
    period: '2025-12-31',
    cik: '0001234567',
    ...over,
  }
}

describe('toSlug', () => {
  it('lowercases and dashes', () => {
    expect(toSlug('Acme Capital')).toBe('acme-capital')
  })
  it('strips common company suffixes', () => {
    expect(toSlug('Acme Capital LLC')).toBe('acme-capital')
    expect(toSlug('Foo Bar Inc.')).toBe('foo-bar')
    expect(toSlug('XYZ HOLDINGS LP')).toBe('xyz')
  })
  it('strips state/region tags like /CA/', () => {
    expect(toSlug('PRIMECAP MANAGEMENT CO/CA/')).toBe('primecap-management')
    expect(toSlug('BAMCO INC /NY/')).toBe('bamco')
  })
  it('handles & and parentheses', () => {
    expect(toSlug('DODGE & COX')).toBe('dodge-cox')
    expect(toSlug('Temasek Holdings (Private) Ltd')).toBe('temasek')
  })
})

describe('generateTop50', () => {
  function setupRoot(): string {
    const root = mkdtempSync(join(tmpdir(), 'gen-top50-'))
    mkdirSync(join(root, 'data/investors'), { recursive: true })
    return root
  }

  it('writes one yaml per row when none pre-exist', async () => {
    const root = setupRoot()
    const rows = [
      makeRow({ rank: 1, name: 'Alpha LLC', cik: '0001' }),
      makeRow({ rank: 2, name: 'Beta Inc.',  cik: '0002' }),
    ]
    const report = await generateTop50({ root, rows })
    expect(report.created).toEqual(['alpha', 'beta'])
    const files = readdirSync(join(root, 'data/investors')).sort()
    expect(files).toEqual(['alpha.yaml', 'beta.yaml'])
  })

  it('skips rows whose cik already exists in some yaml', async () => {
    const root = setupRoot()
    // 模拟 buffett 已存在
    writeFileSync(
      join(root, 'data/investors/buffett.yaml'),
      yaml.dump({ slug: 'buffett', cik: '0001067983', display_name: { en: 'Buffett', 'zh-CN': '巴菲特', 'zh-HK': '巴菲特' } }),
    )
    const rows = [
      makeRow({ rank: 4, name: 'BERKSHIRE HATHAWAY INC', cik: '0001067983' }), // 应跳过
      makeRow({ rank: 5, name: 'New Firm LLC', cik: '0009999' }),
    ]
    const report = await generateTop50({ root, rows })
    expect(report.created).toEqual(['new-firm'])
    expect(report.skipped.some((s) => s.includes('0001067983'))).toBe(true)
  })

  it('marks generated yaml as featured: false', async () => {
    const root = setupRoot()
    await generateTop50({ root, rows: [makeRow({ name: 'Gamma Capital', cik: '0003' })] })
    const content = readFileSync(join(root, 'data/investors/gamma-capital.yaml'), 'utf-8')
    const data = yaml.load(content) as any
    expect(data.featured).toBe(false)
  })

  it('produces all required schema fields (display_name, bio, portrait, cik, holdings_source)', async () => {
    const root = setupRoot()
    await generateTop50({ root, rows: [makeRow({ name: 'Delta LP', cik: '0004' })] })
    const data = yaml.load(readFileSync(join(root, 'data/investors/delta.yaml'), 'utf-8')) as any
    expect(data.slug).toBe('delta')
    expect(data.display_name.en).toBe('Delta LP')
    expect(data.display_name['zh-CN']).toBeTypeOf('string')
    expect(data.display_name['zh-HK']).toBeTypeOf('string')
    expect(data.bio.en).toContain('Delta')
    expect(data.portrait).toMatch(/dicebear/i)
    expect(data.cik).toBe('0004')
    expect(data.holdings_source).toBe('13f')
  })
})
