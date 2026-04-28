import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NotableHoldings from '@theme/components/NotableHoldings.vue'

describe('NotableHoldings', () => {
  it('renders each notable holding card', () => {
    const holdings = [
      { name: 'Tesla (TSLA)', kind: 'Listed equity', note: { en: 'self-hold 13%', 'zh-CN': '自持 13%', 'zh-HK': '自持 13%' } },
      { name: 'xAI',  kind: 'Private company', note: { en: 'founder stake', 'zh-CN': '创始人持股', 'zh-HK': '創辦人持股' } },
    ]
    const w = mount(NotableHoldings, { props: { holdings, lang: 'en', label: 'Notable', disclaimer: 'Public disclosure' } })
    expect(w.findAll('[data-holding-card]')).toHaveLength(2)
    // 名称展示（ticker 被剥到副标）
    expect(w.text()).toContain('Tesla')
    expect(w.text()).toContain('TSLA')
    expect(w.text()).toContain('xAI')
    // note 仍渲染
    expect(w.text()).toContain('self-hold 13%')
  })

  it('extracts ticker from "Name (TICKER)" and links to longbridge quote page', () => {
    const holdings = [
      { name: 'Tesla (TSLA)', kind: 'Listed equity', note: { en: 'note', 'zh-CN': 'note', 'zh-HK': 'note' } },
    ]
    const w = mount(NotableHoldings, { props: { holdings, lang: 'en', label: 'x', disclaimer: 'x' } })
    // 整张卡片是 longbridge 行情链接
    expect(w.find('a[href*="longbridge.com"][href*="TSLA"]').exists()).toBe(true)
  })

  it('does not render a Source link even when disclosure_url is present', () => {
    const holdings = [{
      name: 'DJT', kind: 'Listed equity',
      note: { en: 'DJT stake', 'zh-CN': '持股', 'zh-HK': '持股' },
      disclosure_url: 'https://sec.example/form4',
    }]
    const w = mount(NotableHoldings, { props: { holdings, lang: 'en', label: 'x', disclaimer: 'x' } })
    expect(w.find('a[href="https://sec.example/form4"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Source')
  })

  it('localizes kind labels', () => {
    const holdings = [
      { name: 'Tesla (TSLA)', kind: 'Listed equity', note: { en: 'n', 'zh-CN': 'n', 'zh-HK': 'n' } },
    ]
    const w = mount(NotableHoldings, { props: { holdings, lang: 'zh-CN', label: 'x', disclaimer: 'x' } })
    expect(w.text()).toContain('上市股票')
    expect(w.text()).not.toContain('Listed equity')
  })
})
