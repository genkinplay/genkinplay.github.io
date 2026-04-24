import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PhilosophyCards from '@theme/components/PhilosophyCards.vue'

describe('PhilosophyCards', () => {
  it('renders each philosophy item with icon/title/body', () => {
    const items = [
      {
        icon: '🌊',
        title: { en: 'Mr. Market', 'zh-CN': '市场先生', 'zh-HK': '市場先生' },
        body:  { en: 'Moody partner', 'zh-CN': '情绪合伙人', 'zh-HK': '情緒合夥人' },
      },
      {
        icon: '🏰',
        title: { en: 'Moat', 'zh-CN': '护城河', 'zh-HK': '護城河' },
        body:  { en: 'Pricing power', 'zh-CN': '定价权', 'zh-HK': '定價權' },
      },
    ]
    const w = mount(PhilosophyCards, { props: { items, lang: 'zh-CN', label: '哲学' } })
    expect(w.findAll('[data-philosophy-item]')).toHaveLength(2)
    expect(w.text()).toContain('市场先生')
    expect(w.text()).toContain('情绪合伙人')
  })
})
