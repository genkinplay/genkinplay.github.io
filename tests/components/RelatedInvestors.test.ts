import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RelatedInvestors from '@theme/components/RelatedInvestors.vue'

const makeInvestor = (slug: string, name: string, tagline: string) => ({
  slug,
  display_name: { en: name, 'zh-CN': name, 'zh-HK': name },
  tagline: { en: tagline, 'zh-CN': tagline, 'zh-HK': tagline },
  portrait: `/portraits/${slug}.png`,
  holdings_source: '13f' as const,
})

const POOL = [
  makeInvestor('a', 'Alice', 'value investor'),
  makeInvestor('b', 'Bob', 'growth investor'),
  makeInvestor('c', 'Charlie', 'macro investor'),
  makeInvestor('d', 'David', 'quant investor'),
  makeInvestor('e', 'Eve', 'venture investor'),
  makeInvestor('f', 'Frank', 'crypto investor'),
]

describe('RelatedInvestors', () => {
  it('shows up to 4 cards by default', () => {
    const w = mount(RelatedInvestors, {
      props: { investors: POOL, currentSlug: 'x', lang: 'en', label: 'Other Investors' },
    })
    expect(w.findAll('[data-related-card]')).toHaveLength(4)
  })

  it('respects custom count', () => {
    const w = mount(RelatedInvestors, {
      props: { investors: POOL, currentSlug: 'x', lang: 'en', label: 'l', count: 2 },
    })
    expect(w.findAll('[data-related-card]')).toHaveLength(2)
  })

  it('renders nothing when pool is empty', () => {
    const w = mount(RelatedInvestors, {
      props: { investors: [], currentSlug: 'x', lang: 'en', label: 'l' },
    })
    expect(w.findAll('[data-related-card]')).toHaveLength(0)
  })

  it('builds locale-prefixed hrefs for non-en pages', () => {
    const w = mount(RelatedInvestors, {
      props: { investors: POOL, currentSlug: 'x', lang: 'zh-CN', label: 'l' },
    })
    const hrefs = w.findAll('[data-related-card]').map((a) => a.attributes('href'))
    for (const h of hrefs) {
      expect(h).toMatch(/^\/zh-CN\/investors\//)
    }
  })

  it('builds bare /investors/ hrefs for en pages', () => {
    const w = mount(RelatedInvestors, {
      props: { investors: POOL, currentSlug: 'x', lang: 'en', label: 'l' },
    })
    const hrefs = w.findAll('[data-related-card]').map((a) => a.attributes('href'))
    for (const h of hrefs) {
      expect(h).toMatch(/^\/investors\//)
    }
  })

  it('always renders exactly `count` cards regardless of shuffle order', () => {
    // 每次 mount 后 onMounted 会用 Math.random 重新洗牌，所以同一 slug 多次
    // mount 不再保证顺序一致；但卡片数量必须稳定。
    const make = () => mount(RelatedInvestors, {
      props: { investors: POOL, currentSlug: 'buffett', lang: 'en', label: 'l', count: 3 },
    })
    expect(make().findAll('[data-related-card]')).toHaveLength(3)
    expect(make().findAll('[data-related-card]')).toHaveLength(3)
  })
})
