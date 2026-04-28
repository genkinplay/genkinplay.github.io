import { describe, it, expect } from 'vitest'
import { loadInvestorYaml, validateInvestor, type Investor } from '@scripts/lib/investor-data'

const BUFFETT_YAML = `
slug: buffett
display_name:
  en: Warren Buffett
  zh-CN: 沃伦·巴菲特
  zh-HK: 華倫·巴菲特
tagline:
  en: Oracle of Omaha
  zh-CN: 奥马哈的先知
  zh-HK: 奧馬哈的先知
role:
  en: CEO, Berkshire Hathaway
  zh-CN: 伯克希尔 CEO
  zh-HK: 伯克希爾 CEO
born: 1930
portrait: /portraits/buffett.jpg
cik: "0001067983"
holdings_source: "13f"
skill_file: buffett.zip
bio:
  en: Three paragraph intro.
  zh-CN: 三段介绍。
  zh-HK: 三段介紹。
philosophy:
  - icon: 🌊
    title: { en: Mr. Market, zh-CN: 市场先生, zh-HK: 市場先生 }
    body:  { en: Treat market as moody partner, zh-CN: 把市场当作情绪化的合伙人, zh-HK: 把市場當作情緒化的合夥人 }
quotes:
  - text: { en: The tide goes out., zh-CN: 退潮了。, zh-HK: 退潮了。 }
    source: 2001 shareholder letter
    year: 2001
milestones:
  - year: 1965
    event: { en: Took control of Berkshire, zh-CN: 接管伯克希尔, zh-HK: 接管伯克希爾 }
`

describe('loadInvestorYaml', () => {
  it('parses a complete YAML into typed object', () => {
    const inv = loadInvestorYaml(BUFFETT_YAML)
    expect(inv.slug).toBe('buffett')
    expect(inv.cik).toBe('0001067983')
    expect(inv.holdings_source).toBe('13f')
    expect(inv.display_name['zh-CN']).toBe('沃伦·巴菲特')
    expect(inv.philosophy).toHaveLength(1)
    expect(inv.quotes[0]?.year).toBe(2001)
    expect(inv.milestones[0]?.year).toBe(1965)
  })
})

describe('validateInvestor', () => {
  it('returns ok for a valid investor', () => {
    const inv = loadInvestorYaml(BUFFETT_YAML)
    const res = validateInvestor(inv)
    expect(res.ok).toBe(true)
  })

  it('rejects investor with 13f source but missing cik', () => {
    const inv = loadInvestorYaml(BUFFETT_YAML.replace('cik: "0001067983"', 'cik: ""'))
    const res = validateInvestor(inv)
    expect(res.ok).toBe(false)
    expect(res.errors.some((e) => e.includes('cik'))).toBe(true)
  })

  it('requires notable_holdings when source is curated', () => {
    const curated: Investor = {
      ...loadInvestorYaml(BUFFETT_YAML),
      holdings_source: 'curated',
      cik: '',
      notable_holdings: [],
    }
    const res = validateInvestor(curated)
    expect(res.ok).toBe(false)
    expect(res.errors.some((e) => e.includes('notable_holdings'))).toBe(true)
  })
})
