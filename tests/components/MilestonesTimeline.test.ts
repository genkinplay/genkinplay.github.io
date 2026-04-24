import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MilestonesTimeline from '@theme/components/MilestonesTimeline.vue'

describe('MilestonesTimeline', () => {
  it('renders items sorted by year ascending', () => {
    const ms = [
      { year: 2016, event: { en: 'Apple', 'zh-CN': '苹果', 'zh-HK': '蘋果' } },
      { year: 1965, event: { en: 'Berkshire', 'zh-CN': '接管', 'zh-HK': '接管' } },
    ]
    const w = mount(MilestonesTimeline, { props: { milestones: ms, lang: 'en', label: 'Milestones' } })
    const items = w.findAll('[data-milestone]')
    expect(items[0]?.text()).toContain('1965')
    expect(items[1]?.text()).toContain('2016')
  })
})
