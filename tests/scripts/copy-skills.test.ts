import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { copySkills } from '@scripts/copy-skills'

const TMP = join(__dirname, '../../.tmp-copy-skills')

describe('copySkills', () => {
  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(join(TMP, 'skills'), { recursive: true })
    mkdirSync(join(TMP, 'public'), { recursive: true })
    writeFileSync(join(TMP, 'skills/buffett.skill'), 'binary-content-1')
    writeFileSync(join(TMP, 'skills/musk.skill'), 'binary-content-2')
  })
  afterEach(() => rmSync(TMP, { recursive: true, force: true }))

  it('copies every .skill file from skills/ to public/install/', async () => {
    const copied = await copySkills({ root: TMP })
    expect(copied).toHaveLength(2)
    expect(existsSync(join(TMP, 'public/install/buffett.skill'))).toBe(true)
    expect(existsSync(join(TMP, 'public/install/musk.skill'))).toBe(true)
    expect(readFileSync(join(TMP, 'public/install/buffett.skill'), 'utf-8')).toBe('binary-content-1')
  })

  it('creates public/install/ if missing', async () => {
    rmSync(join(TMP, 'public'), { recursive: true, force: true })
    await copySkills({ root: TMP })
    expect(existsSync(join(TMP, 'public/install'))).toBe(true)
  })

  it('ignores non-.skill files', async () => {
    writeFileSync(join(TMP, 'skills/readme.md'), 'not a skill')
    const copied = await copySkills({ root: TMP })
    expect(copied).not.toContain('readme.md')
  })
})
