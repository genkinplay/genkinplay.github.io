import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NotableHoldings from '@theme/components/NotableHoldings.vue'

describe('NotableHoldings', () => {
  it('renders each notable holding card', () => {
    const holdings = [
      { name: 'TSLA', kind: 'Equity', note: { en: 'self-hold 13%', 'zh-CN': '自持 13%', 'zh-HK': '自持 13%' } },
      { name: 'xAI',  kind: 'Private', note: { en: 'founder stake', 'zh-CN': '创始人持股', 'zh-HK': '創辦人持股' } },
    ]
    const w = mount(NotableHoldings, { props: { holdings, lang: 'en', label: 'Notable', disclaimer: 'Public disclosure' } })
    expect(w.findAll('[data-holding-card]')).toHaveLength(2)
    expect(w.text()).toContain('TSLA')
    expect(w.text()).toContain('self-hold 13%')
  })

  it('links to disclosure_url when present', () => {
    const holdings = [{
      name: 'DJT', kind: 'Equity',
      note: { en: 'DJT stake', 'zh-CN': '持股', 'zh-HK': '持股' },
      disclosure_url: 'https://sec.example/form4',
    }]
    const w = mount(NotableHoldings, { props: { holdings, lang: 'en', label: 'x', disclaimer: 'x' } })
    expect(w.find('a[href="https://sec.example/form4"]').exists()).toBe(true)
  })
})
