import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DownloadSkillCTA from '@theme/components/DownloadSkillCTA.vue'

describe('DownloadSkillCTA', () => {
  it('renders download link with correct href', () => {
    const w = mount(DownloadSkillCTA, { props: {
      skillFile: 'buffett-skill.skill',
      title: 'Download Skill',
      description: 'Import this skill',
      ctaLabel: 'Download .skill',
    }})
    expect(w.find('a').attributes('href')).toBe('/skills/buffett-skill.skill')
    expect(w.text()).toContain('Download Skill')
  })

  it('has download attribute so browser downloads instead of navigating', () => {
    const w = mount(DownloadSkillCTA, { props: {
      skillFile: 'musk-skill.skill', title: 'x', description: 'x', ctaLabel: 'x'
    }})
    expect(w.find('a').attributes('download')).toBeDefined()
  })
})
