import { readdirSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

export interface CopySkillsOpts {
  root?: string
}

export async function copySkills(opts: CopySkillsOpts = {}): Promise<string[]> {
  const root = opts.root ?? process.cwd()
  const src = join(root, 'skills')
  const dst = join(root, 'public/skills')
  mkdirSync(dst, { recursive: true })

  const files = readdirSync(src).filter((f) => f.endsWith('.skill'))
  for (const f of files) {
    copyFileSync(join(src, f), join(dst, f))
  }
  console.log(`[copy-skills] copied ${files.length} skill files`)
  return files
}

if (import.meta.main) {
  copySkills().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
