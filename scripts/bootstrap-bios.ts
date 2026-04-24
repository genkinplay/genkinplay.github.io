import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'
import { parseSkillMd, extractQuotes } from './lib/skill-md'
import { loadInvestorYaml, type Investor } from './lib/investor-data'

export interface BootstrapOptions {
  root?: string
}

function isEmptyLocalized(
  obj: { en?: string; 'zh-CN'?: string; 'zh-HK'?: string } | undefined,
): boolean {
  if (!obj) return true
  return !obj.en && !obj['zh-CN'] && !obj['zh-HK']
}

export async function bootstrapBios(opts: BootstrapOptions = {}): Promise<string[]> {
  const root = opts.root ?? process.cwd()
  const investorsDir = join(root, 'data/investors')
  const skillsDir = join(root, 'skills')

  const touched: string[] = []
  for (const f of readdirSync(investorsDir).filter((x) => x.endsWith('.yaml'))) {
    const slug = f.replace(/\.yaml$/, '')
    const yamlPath = join(investorsDir, f)
    const skillPath = join(skillsDir, `${slug}-skill`, 'SKILL.md')
    if (!existsSync(skillPath)) continue

    const inv = loadInvestorYaml(readFileSync(yamlPath, 'utf-8'))
    const skill = parseSkillMd(readFileSync(skillPath, 'utf-8'))

    let changed = false

    if (isEmptyLocalized(inv.tagline)) {
      // 回退到 description — 所有三语占同一描述，由人工后续翻译
      inv.tagline = {
        en: skill.description,
        'zh-CN': skill.description,
        'zh-HK': skill.description,
      }
      changed = true
    }

    if (!inv.quotes || inv.quotes.length === 0) {
      const quotes = extractQuotes(skill.body).slice(0, 5)
      if (quotes.length > 0) {
        inv.quotes = quotes.map((q) => ({
          text: { en: q, 'zh-CN': q, 'zh-HK': q },
        }))
        changed = true
      }
    }

    if (changed) {
      writeFileSync(
        yamlPath,
        yaml.dump(inv, { lineWidth: -1, quotingType: '"', forceQuotes: false }),
      )
      touched.push(slug)
    }
  }

  console.log(`[bootstrap-bios] touched ${touched.length} YAML(s): ${touched.join(', ')}`)
  return touched
}

if (import.meta.main) {
  bootstrapBios().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

// used by tests
export { loadInvestorYaml } from './lib/investor-data'
export type { Investor }
