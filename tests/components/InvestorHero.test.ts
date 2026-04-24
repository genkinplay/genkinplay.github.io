import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InvestorHero from '@theme/components/InvestorHero.vue'

describe('InvestorHero', () => {
  it('renders name, tagline, role, portrait', () => {
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
    expect(w.text()).toContain('2025-12-31')
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
