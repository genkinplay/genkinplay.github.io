import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BioSection from '@theme/components/BioSection.vue'

describe('BioSection', () => {
  it('renders bio paragraphs in the given lang', () => {
    const w = mount(BioSection, { props: {
      bio: { en: 'First para.\n\nSecond para.', 'zh-CN': '一段。\n\n二段。', 'zh-HK': '一段。\n\n二段。' },
      lang: 'en',
      label: 'Bio',
    }})
    expect(w.findAll('p')).toHaveLength(2)
    expect(w.text()).toContain('First para.')
    expect(w.text()).toContain('Second para.')
  })
})
