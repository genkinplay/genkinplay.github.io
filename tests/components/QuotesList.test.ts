import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import QuotesList from '@theme/components/QuotesList.vue'

describe('QuotesList', () => {
  it('renders each quote with source + year', () => {
    const quotes = [
      { text: { en: 'tide', 'zh-CN': '潮', 'zh-HK': '潮' }, source: 'Letter', year: 2001 },
      { text: { en: 'price', 'zh-CN': '价', 'zh-HK': '價' }, source: 'Letter', year: 2008 },
    ]
    const w = mount(QuotesList, { props: { quotes, lang: 'en', label: 'Quotes' } })
    expect(w.findAll('blockquote')).toHaveLength(2)
    expect(w.text()).toContain('tide')
    expect(w.text()).toContain('2001')
  })
})
