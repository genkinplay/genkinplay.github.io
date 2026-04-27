import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InvestorHero from '@theme/components/InvestorHero.vue'

describe('InvestorHero', () => {
  it('renders name, tagline, role, portrait + en stats with localized date', () => {
    const w = mount(InvestorHero, { props: {
      investor: {
        display_name: { en: 'WB', 'zh-CN': 'WB', 'zh-HK': 'WB' },
        tagline:      { en: 'Oracle', 'zh-CN': '先知', 'zh-HK': '先知' },
        role:         { en: 'CEO BRK', 'zh-CN': 'CEO', 'zh-HK': 'CEO' },
        portrait: '/p.jpg',
        holdings_source: '13f' as const,
        cik: '0001067983',
      },
      lang: 'en' as const,
      period: '2025-12-31',
      aum: 274160086701,
    }})
    expect(w.text()).toContain('WB')
    expect(w.text()).toContain('Oracle')
    expect(w.text()).toContain('CEO BRK')
    expect(w.find('img').attributes('src')).toBe('/p.jpg')
    expect(w.text()).toMatch(/274\.\d+B/)
    expect(w.text()).toContain('0001067983')
    // en：日期格式化为 "Dec 31, 2025" + 标签 "as of"
    expect(w.text()).toContain('As of')
    expect(w.text()).toContain('Dec 31, 2025')
  })

  it('formats period and as-of label per locale (zh-CN)', () => {
    const w = mount(InvestorHero, { props: {
      investor: {
        display_name: { en: 'WB', 'zh-CN': 'WB', 'zh-HK': 'WB' },
        tagline:      { en: 't', 'zh-CN': 't', 'zh-HK': 't' },
        role:         { en: 'r', 'zh-CN': 'r', 'zh-HK': 'r' },
        portrait: '/p.jpg',
        holdings_source: '13f' as const,
        cik: '0001067983',
      },
      lang: 'zh-CN' as const,
      period: '2025-12-31',
      aum: 274160086701,
    }})
    expect(w.text()).toContain('截至')
    expect(w.text()).toContain('2025 年 12 月 31 日')
    expect(w.text()).not.toContain('As of')
  })

  it('omits 13F stats when source=curated', () => {
    const w = mount(InvestorHero, { props: {
      investor: {
        display_name: { en: 'Musk', 'zh-CN': 'Musk', 'zh-HK': 'Musk' },
        tagline:      { en: 't', 'zh-CN': 't', 'zh-HK': 't' },
        role:         { en: 'r', 'zh-CN': 'r', 'zh-HK': 'r' },
        portrait: '/p.jpg',
        holdings_source: 'curated' as const,
        cik: '',
      },
      lang: 'en' as const,
    }})
    expect(w.text()).not.toMatch(/\$\d+B/)
  })
})
