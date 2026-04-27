import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BioSection from '@theme/components/BioSection.vue'

describe('BioSection', () => {
  it('shows only the first paragraph by default and reveals the rest after toggle', async () => {
    const w = mount(BioSection, {
      props: {
        bio: {
          en: 'First para.\n\nSecond para.',
          'zh-CN': '一段。\n\n二段。',
          'zh-HK': '一段。\n\n二段。',
        },
        lang: 'en',
        label: 'Bio',
      },
    })

    // 默认折叠：只渲染第一段
    expect(w.findAll('p')).toHaveLength(1)
    expect(w.text()).toContain('First para.')
    expect(w.text()).not.toContain('Second para.')

    // 点击展开后两段都出来
    await w.find('button').trigger('click')
    expect(w.findAll('p')).toHaveLength(2)
    expect(w.text()).toContain('First para.')
    expect(w.text()).toContain('Second para.')
  })

  it('does not show the toggle button when bio has only one paragraph', () => {
    const w = mount(BioSection, {
      props: {
        bio: { en: 'Only one paragraph.', 'zh-CN': '只有一段。', 'zh-HK': '只有一段。' },
        lang: 'en',
        label: 'Bio',
      },
    })

    expect(w.findAll('p')).toHaveLength(1)
    expect(w.find('button').exists()).toBe(false)
  })
})
