import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bootstrapBios } from '@scripts/bootstrap-bios'

const TMP = join(__dirname, '../../.tmp-bootstrap')
const SKILL_MD = `---
name: buffett-skill
description: 扮演沃伦·巴菲特进行价值投资对话
---

# 巴菲特人格

你就是巴菲特。

**经典金句**：
- "Only when the tide goes out do you discover who's been swimming naked."
- "市场先生每天给你报价。"
`

const EMPTY_YAML = `
slug: buffett
display_name: { en: Warren Buffett, zh-CN: 沃伦·巴菲特, zh-HK: 華倫·巴菲特 }
tagline:      { en: "", zh-CN: "", zh-HK: "" }
role:         { en: CEO, zh-CN: CEO, zh-HK: CEO }
born: 1930
portrait: /portraits/buffett.jpg
cik: "0001067983"
holdings_source: "13f"
skill_file: buffett-skill.skill
bio: { en: "", zh-CN: "", zh-HK: "" }
philosophy: []
quotes: []
milestones: []
`

describe('bootstrapBios', () => {
  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(join(TMP, 'skills/buffett-skill'), { recursive: true })
    mkdirSync(join(TMP, 'data/investors'), { recursive: true })
    writeFileSync(join(TMP, 'skills/buffett-skill/SKILL.md'), SKILL_MD)
    writeFileSync(join(TMP, 'data/investors/buffett.yaml'), EMPTY_YAML)
  })
  afterEach(() => rmSync(TMP, { recursive: true, force: true }))

  it('fills empty tagline from SKILL.md description', async () => {
    await bootstrapBios({ root: TMP })
    const out = readFileSync(join(TMP, 'data/investors/buffett.yaml'), 'utf-8')
    expect(out).toContain('沃伦·巴菲特')
  })

  it('fills empty quotes from extracted quote candidates', async () => {
    await bootstrapBios({ root: TMP })
    const out = readFileSync(join(TMP, 'data/investors/buffett.yaml'), 'utf-8')
    expect(out).toContain('tide goes out')
  })

  it('is idempotent — running twice produces same output', async () => {
    await bootstrapBios({ root: TMP })
    const first = readFileSync(join(TMP, 'data/investors/buffett.yaml'), 'utf-8')
    await bootstrapBios({ root: TMP })
    const second = readFileSync(join(TMP, 'data/investors/buffett.yaml'), 'utf-8')
    expect(first).toBe(second)
  })

  it('does not overwrite non-empty fields', async () => {
    const FILLED = EMPTY_YAML.replace(
      'tagline:      { en: "", zh-CN: "", zh-HK: "" }',
      'tagline:      { en: Original, zh-CN: 原稿, zh-HK: 原稿 }',
    )
    writeFileSync(join(TMP, 'data/investors/buffett.yaml'), FILLED)
    await bootstrapBios({ root: TMP })
    const out = readFileSync(join(TMP, 'data/investors/buffett.yaml'), 'utf-8')
    expect(out).toContain('Original')
  })
})
