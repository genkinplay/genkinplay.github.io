import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InvestorCard from '@theme/components/InvestorCard.vue'

const BUFFETT = {
  slug: 'buffett',
  display_name: { en: 'Warren Buffett', 'zh-CN': '沃伦·巴菲特', 'zh-HK': '華倫·巴菲特' },
  tagline:      { en: 'Oracle of Omaha', 'zh-CN': '奥马哈的先知', 'zh-HK': '奧馬哈的先知' },
  role:         { en: 'CEO, Berkshire', 'zh-CN': '伯克希尔 CEO', 'zh-HK': '伯克希爾 CEO' },
  portrait: '/portraits/buffett.jpg',
  holdings_source: '13f' as const,
  total_value_usd: 274160086701,
}

describe('InvestorCard', () => {
  it('renders investor name in English by default', () => {
    const w = mount(InvestorCard, { props: { investor: BUFFETT, lang: 'en' } })
    expect(w.text()).toContain('Warren Buffett')
    expect(w.text()).toContain('Oracle of Omaha')
  })

  it('renders Simplified Chinese when lang=zh-CN', () => {
    const w = mount(InvestorCard, { props: { investor: BUFFETT, lang: 'zh-CN' } })
    expect(w.text()).toContain('沃伦·巴菲特')
    expect(w.text()).toContain('奥马哈的先知')
  })

  it('renders 13F AUM badge when holdings_source=13f', () => {
    const w = mount(InvestorCard, { props: { investor: BUFFETT, lang: 'en' } })
    expect(w.text()).toMatch(/\$274\.\d+B/)
    expect(w.text()).toContain('13F')
  })

  it('renders Notable Holdings badge for curated investors', () => {
    const curated = { ...BUFFETT, holdings_source: 'curated' as const, total_value_usd: 0 }
    const w = mount(InvestorCard, { props: { investor: curated, lang: 'en' } })
    expect(w.text()).toContain('Notable Holdings')
  })

  it('links to /investors/{slug}/ (no lang prefix when en)', () => {
    const w = mount(InvestorCard, { props: { investor: BUFFETT, lang: 'en' } })
    expect(w.find('a').attributes('href')).toBe('/investors/buffett/')
  })

  it('links to /zh-CN/investors/{slug}/ when lang=zh-CN', () => {
    const w = mount(InvestorCard, { props: { investor: BUFFETT, lang: 'zh-CN' } })
    expect(w.find('a').attributes('href')).toBe('/zh-CN/investors/buffett/')
  })
})
