import yaml from 'js-yaml'

export type Lang = 'en' | 'zh-CN' | 'zh-HK'
export type LocalizedString = Record<Lang, string>
export type HoldingsSource = '13f' | 'curated'

export interface PhilosophyItem {
  icon: string
  title: LocalizedString
  body: LocalizedString
}

export interface QuoteItem {
  text: LocalizedString
  source?: string
  year?: number
}

export interface MilestoneItem {
  year: number
  event: LocalizedString
}

export interface NotableHolding {
  name: string
  kind: string
  note: LocalizedString
  disclosure_url?: string
}

export interface Investor {
  slug: string
  display_name: LocalizedString
  tagline: LocalizedString
  role: LocalizedString
  born: number
  portrait: string
  cik: string
  holdings_source: HoldingsSource
  /** 编辑精选投资人有手工整理的 .skill 文件可下载；批量生成的机构默认没有 */
  skill_file?: string
  /** false 表示批量生成、未由编辑团队精选 —— 首页只展示 featured !== false 的人物 */
  featured?: boolean
  bio: LocalizedString
  philosophy: PhilosophyItem[]
  quotes: QuoteItem[]
  milestones: MilestoneItem[]
  notable_holdings?: NotableHolding[]
  // Optional: when this investor is also a Form 4 insider (officer/director/10%+ owner)
  // of a listed company, set ticker (e.g. "NVDA.US") and an owner-name substring
  // used to filter the SEC Form 4 feed to this person's trades.
  insider_ticker?: string
  insider_owner_match?: string
}

export function loadInvestorYaml(content: string): Investor {
  const raw = yaml.load(content) as Record<string, unknown>
  return raw as unknown as Investor
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

export function validateInvestor(inv: Investor): ValidationResult {
  const errors: string[] = []

  if (!inv.slug) errors.push('slug is required')
  if (!inv.display_name?.en) errors.push('display_name.en is required')
  if (!inv.display_name?.['zh-CN']) errors.push('display_name.zh-CN is required')
  if (!inv.display_name?.['zh-HK']) errors.push('display_name.zh-HK is required')
  // skill_file 仅 featured 投资人需要 —— 批量生成的机构没有手工整理的 skill
  if (inv.featured !== false && !inv.skill_file) errors.push('skill_file is required for featured investors')

  if (inv.holdings_source === '13f') {
    if (!inv.cik) errors.push('cik is required when holdings_source=13f')
  } else if (inv.holdings_source === 'curated') {
    if (!inv.notable_holdings || inv.notable_holdings.length === 0) {
      errors.push('notable_holdings must be non-empty when holdings_source=curated')
    }
  } else {
    errors.push(`unknown holdings_source: ${String(inv.holdings_source)}`)
  }

  return { ok: errors.length === 0, errors }
}
