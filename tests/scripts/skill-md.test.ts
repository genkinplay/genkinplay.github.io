import { describe, it, expect } from 'vitest'
import { parseSkillMd, extractQuotes } from '@scripts/lib/skill-md'

const SAMPLE = `---
name: buffett-skill
description: 扮演沃伦·巴菲特
---

# 巴菲特人格

你就是沃伦·巴菲特。

## 你实际说话的方式

**他经常用的比喻**：
- “Only when the tide goes out do you discover who's been swimming naked.”
- “市场先生每天给你报价。”
`

describe('parseSkillMd', () => {
  it('returns frontmatter name and description', () => {
    const parsed = parseSkillMd(SAMPLE)
    expect(parsed.name).toBe('buffett-skill')
    expect(parsed.description).toContain('沃伦·巴菲特')
  })

  it('returns body without frontmatter', () => {
    const parsed = parseSkillMd(SAMPLE)
    expect(parsed.body.startsWith('# 巴菲特人格')).toBe(true)
    expect(parsed.body).not.toContain('---')
  })
})

describe('extractQuotes', () => {
  it('finds double-quoted lines as quote candidates', () => {
    const parsed = parseSkillMd(SAMPLE)
    const quotes = extractQuotes(parsed.body)
    expect(quotes).toContain('Only when the tide goes out do you discover who\'s been swimming naked.')
    expect(quotes).toContain('市场先生每天给你报价。')
  })

  it('returns empty when no quotes found', () => {
    expect(extractQuotes('# Title\n\nNo quotes here.')).toEqual([])
  })
})
