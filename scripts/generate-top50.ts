/**
 * 根据 longbridge investors（默认输出）的 SEC 13F top 50 机构投资者列表，
 * 自动生成每家机构的占位 yaml（保持现有 6 位精选投资人不动）。
 *
 * 设计要点：
 *   - 列表硬编码在脚本里（来自 longbridge investors 的人工抓取），未来要更新
 *     时跑一次 `longbridge investors --format json` 重新粘贴即可。
 *   - 已存在的 cik / slug 不会被覆盖（buffett.yaml 的 BERKSHIRE HATHAWAY 会被自动跳过）
 *   - 生成的 yaml 标 `featured: false`，首页 InvestorsHomePage 只展示 featured 投资人
 *   - portrait 用 DiceBear initials（CC0），无版权风险，每个机构独立色块
 *   - bio / philosophy / quotes / milestones 留占位（philosophy/quotes/milestones 留空数组），
 *     bio 三语化的简短说明 —— 让详情页能正常渲染
 *
 * 用法：
 *   bun run scripts/generate-top50.ts
 *   bun run generate:top50
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'

interface RankingRow {
  rank: number
  name: string
  /** 中文译名（简体）—— 有则覆盖 display_name.zh-CN，否则中文环境 fallback 到 en */
  name_zh_cn?: string
  /** 中文译名（繁体）—— 有则覆盖 display_name.zh-HK，否则中文环境 fallback 到 en */
  name_zh_hk?: string
  aum_b: number
  period: string
  cik: string
}

// 截至 2026-04-28 longbridge investors 的 top 50 列表（按 AUM 降序）
// 中文译名优先用约定俗成；中等知名度用维基中文译名；小众/无标准译名留空 fallback 到英文
const TOP50: RankingRow[] = [
  { rank: 1,  name: 'Capital International Investors',             name_zh_cn: '资本集团国际投资者',         name_zh_hk: '資本集團國際投資者',         aum_b: 637.97, period: '2025-12-31', cik: '0001562230' },
  { rank: 2,  name: 'Capital Research Global Investors',           name_zh_cn: '资本研究全球投资者',         name_zh_hk: '資本研究全球投資者',         aum_b: 541.73, period: '2025-12-31', cik: '0001422848' },
  { rank: 3,  name: 'CTC LLC',                                     name_zh_cn: 'CTC（芝加哥贸易公司）',      name_zh_hk: 'CTC（芝加哥貿易公司）',      aum_b: 404.44, period: '2025-09-30', cik: '0001445893' },
  { rank: 4,  name: 'BERKSHIRE HATHAWAY INC',                      aum_b: 274.16, period: '2025-12-31', cik: '0001067983' },
  { rank: 5,  name: 'DODGE & COX',                                 name_zh_cn: '道奇·考克斯',                name_zh_hk: '道奇·考克斯',                aum_b: 185.26, period: '2025-12-31', cik: '0000200217' },
  { rank: 6,  name: 'PRIMECAP MANAGEMENT CO/CA/',                  name_zh_cn: '普信资本（PRIMECAP）',       name_zh_hk: '普信資本（PRIMECAP）',       aum_b: 132.11, period: '2025-12-31', cik: '0000763212' },
  { rank: 7,  name: 'STATE FARM MUTUAL AUTOMOBILE INSURANCE CO',   name_zh_cn: '州立农场保险',               name_zh_hk: '州立農場保險',               aum_b: 127.33, period: '2025-12-31', cik: '0000315032' },
  { rank: 8,  name: 'LILLY ENDOWMENT INC',                         name_zh_cn: '礼来基金会',                 name_zh_hk: '禮來基金會',                 aum_b:  99.08, period: '2025-12-31', cik: '0000316011' },
  { rank: 9,  name: 'Sanders Capital, LLC',                        name_zh_cn: '桑德斯资本',                 name_zh_hk: '桑德斯資本',                 aum_b:  86.82, period: '2025-12-31', cik: '0001508097' },
  { rank: 10, name: 'BROOKFIELD Corp /ON/',                        name_zh_cn: '博枫资管',                   name_zh_hk: '博楓資管',                   aum_b:  85.84, period: '2025-12-31', cik: '0001001085' },
  { rank: 11, name: 'HARRIS ASSOCIATES L P',                       name_zh_cn: '哈里斯联营',                 name_zh_hk: '哈里斯聯營',                 aum_b:  79.12, period: '2025-12-31', cik: '0000813917' },
  { rank: 12, name: 'MITSUBISHI UFJ FINANCIAL GROUP INC',          name_zh_cn: '三菱日联金融集团',           name_zh_hk: '三菱日聯金融集團',           aum_b:  66.94, period: '2025-12-31', cik: '0000067088' },
  { rank: 13, name: 'Artisan Partners Limited Partnership',        name_zh_cn: '工匠资本',                   name_zh_hk: '工匠資本',                   aum_b:  66.79, period: '2025-12-31', cik: '0001466153' },
  { rank: 14, name: 'ALKEON CAPITAL MANAGEMENT LLC',               name_zh_cn: '阿尔康资本',                 name_zh_hk: '阿爾康資本',                 aum_b:  63.13, period: '2025-12-31', cik: '0001230239' },
  { rank: 15, name: 'GQG Partners LLC',                            name_zh_cn: 'GQG 合伙人',                 name_zh_hk: 'GQG 合夥人',                 aum_b:  60.72, period: '2025-12-31', cik: '0001697233' },
  { rank: 16, name: 'TCI Fund Management Ltd',                     name_zh_cn: '儿童投资基金（TCI）',        name_zh_hk: '兒童投資基金（TCI）',        aum_b:  53.65, period: '2025-12-31', cik: '0001647251' },
  { rank: 17, name: 'Aristotle Capital Management, LLC',           name_zh_cn: '亚里士多德资本',             name_zh_hk: '亞里士多德資本',             aum_b:  49.96, period: '2025-12-31', cik: '0000860644' },
  { rank: 18, name: 'WCM INVESTMENT MANAGEMENT, LLC',              name_zh_cn: 'WCM 投资管理',               name_zh_hk: 'WCM 投資管理',               aum_b:  48.57, period: '2025-12-31', cik: '0001061186' },
  { rank: 19, name: 'Ninety One UK Ltd',                           aum_b:  46.64, period: '2025-12-31', cik: '0001418329' },
  { rank: 20, name: 'Alecta Tjanstepension Omsesidigt',            name_zh_cn: 'Alecta 养老基金（瑞典）',     name_zh_hk: 'Alecta 退休基金（瑞典）',     aum_b:  45.16, period: '2025-09-30', cik: '0001484429' },
  { rank: 21, name: 'Newport Trust Company, LLC',                  name_zh_cn: '新港信托',                   name_zh_hk: '新港信託',                   aum_b:  41.79, period: '2025-12-31', cik: '0001722329' },
  { rank: 22, name: 'Mastercard Foundation Asset Management Corp', name_zh_cn: '万事达卡基金会资产管理',     name_zh_hk: '萬事達卡基金會資產管理',     aum_b:  41.10, period: '2025-12-31', cik: '0002006397' },
  { rank: 23, name: 'Woodbridge CO LTD',                           name_zh_cn: 'Woodbridge（汤森家族办公室）', name_zh_hk: 'Woodbridge（湯森家族辦公室）', aum_b:  40.54, period: '2025-12-31', cik: '0001397960' },
  { rank: 24, name: 'COATUE MANAGEMENT LLC',                       name_zh_cn: '寇图资本',                   name_zh_hk: '寇圖資本',                   aum_b:  39.96, period: '2025-12-31', cik: '0001135730' },
  { rank: 25, name: 'PARNASSUS INVESTMENTS, LLC',                  name_zh_cn: '帕纳苏斯投资',               name_zh_hk: '帕納蘇斯投資',               aum_b:  38.56, period: '2025-12-31', cik: '0000948669' },
  { rank: 26, name: 'VIKING GLOBAL INVESTORS LP',                  name_zh_cn: '维京全球',                   name_zh_hk: '維京全球',                   aum_b:  37.68, period: '2025-12-31', cik: '0001103804' },
  { rank: 27, name: 'BAMCO INC /NY/',                              name_zh_cn: 'BAMCO（巴龙基金）',          name_zh_hk: 'BAMCO（巴龍基金）',          aum_b:  36.91, period: '2025-12-31', cik: '0001017918' },
  { rank: 28, name: 'WILLIAM BLAIR INVESTMENT MANAGEMENT, LLC',    name_zh_cn: '威廉·布莱尔投资管理',        name_zh_hk: '威廉·布萊爾投資管理',        aum_b:  35.85, period: '2025-12-31', cik: '0001644956' },
  { rank: 29, name: 'GATES FOUNDATION TRUST',                      name_zh_cn: '盖茨基金会信托',             name_zh_hk: '蓋茨基金會信託',             aum_b:  35.36, period: '2025-12-31', cik: '0001166559' },
  { rank: 30, name: 'PFA Pension, Forsikringsaktieselskab',        name_zh_cn: 'PFA 养老金（丹麦）',         name_zh_hk: 'PFA 退休基金（丹麥）',       aum_b:  35.25, period: '2025-12-31', cik: '0001730073' },
  { rank: 31, name: 'HOTCHKIS & WILEY CAPITAL MANAGEMENT LLC',     name_zh_cn: '霍奇基斯·威利资本',          name_zh_hk: '霍奇基斯·威利資本',          aum_b:  33.48, period: '2025-12-31', cik: '0001164833' },
  { rank: 32, name: 'PZENA INVESTMENT MANAGEMENT LLC',             name_zh_cn: '普泽纳投资管理',             name_zh_hk: '普澤納投資管理',             aum_b:  33.40, period: '2025-12-31', cik: '0001027796' },
  { rank: 33, name: 'SANDS CAPITAL MANAGEMENT, LLC',               name_zh_cn: '桑兹资本',                   name_zh_hk: '桑茲資本',                   aum_b:  32.88, period: '2025-12-31', cik: '0001020066' },
  { rank: 34, name: 'EAGLE CAPITAL MANAGEMENT LLC',                name_zh_cn: '鹰冠资本',                   name_zh_hk: '鷹冠資本',                   aum_b:  32.11, period: '2025-12-31', cik: '0000945631' },
  { rank: 35, name: 'Temasek Holdings (Private) Ltd',              name_zh_cn: '淡马锡',                     name_zh_hk: '淡馬錫',                     aum_b:  31.57, period: '2025-12-31', cik: '0001021944' },
  { rank: 36, name: 'BARROW HANLEY MEWHINNEY & STRAUSS LLC',       name_zh_cn: '巴罗·汉利',                  name_zh_hk: '巴羅·漢利',                  aum_b:  30.52, period: '2025-12-31', cik: '0000313028' },
  { rank: 37, name: 'Winslow Capital Management, LLC',             name_zh_cn: '温斯洛资本',                 name_zh_hk: '溫斯洛資本',                 aum_b:  29.80, period: '2025-12-31', cik: '0000900973' },
  { rank: 38, name: 'TIGER GLOBAL MANAGEMENT LLC',                 name_zh_cn: '老虎全球',                   name_zh_hk: '老虎全球',                   aum_b:  29.71, period: '2025-12-31', cik: '0001167483' },
  { rank: 39, name: 'FULLER & THALER ASSET MANAGEMENT, INC.',      name_zh_cn: '富勒·塞勒资管',              name_zh_hk: '富勒·塞勒資管',              aum_b:  29.10, period: '2025-12-31', cik: '0001082327' },
  { rank: 40, name: 'AKUNA SECURITIES LLC',                        aum_b:  26.24, period: '2025-12-31', cik: '0001529090' },
  { rank: 41, name: 'Polar Capital Holdings Plc',                  name_zh_cn: '极地资本',                   name_zh_hk: '極地資本',                   aum_b:  25.88, period: '2025-12-31', cik: '0001837309' },
  { rank: 42, name: 'Rokos Capital Management LLP',                name_zh_cn: '罗科斯资本',                 name_zh_hk: '羅科斯資本',                 aum_b:  25.66, period: '2025-12-31', cik: '0001666335' },
  { rank: 43, name: 'Blackstone Inc.',                             name_zh_cn: '黑石集团',                   name_zh_hk: '黑石集團',                   aum_b:  25.31, period: '2025-12-31', cik: '0001393818' },
  { rank: 44, name: 'FLOSSBACH VON STORCH SE',                     name_zh_cn: 'Flossbach von Storch（德国）', name_zh_hk: 'Flossbach von Storch（德國）', aum_b:  25.23, period: '2025-12-31', cik: '0001575677' },
  { rank: 45, name: 'Castle Hook Partners LP',                     aum_b:  24.07, period: '2025-12-31', cik: '0001687241' },
  { rank: 46, name: 'WESTFIELD CAPITAL MANAGEMENT CO LP',          name_zh_cn: '韦斯特菲尔德资本',           name_zh_hk: '韋斯特菲爾德資本',           aum_b:  24.01, period: '2025-12-31', cik: '0001177719' },
  { rank: 47, name: 'Orbis Allan Gray Ltd',                        aum_b:  23.87, period: '2025-12-31', cik: '0001663865' },
  { rank: 48, name: 'POLEN CAPITAL MANAGEMENT LLC',                name_zh_cn: '波伦资本',                   name_zh_hk: '波倫資本',                   aum_b:  23.42, period: '2025-12-31', cik: '0001034524' },
  { rank: 49, name: 'EARNEST PARTNERS LLC',                        aum_b:  23.34, period: '2025-12-31', cik: '0001102578' },
  { rank: 50, name: 'Select Equity Group, L.P.',                   name_zh_cn: 'Select Equity 精选股权',     name_zh_hk: 'Select Equity 精選股權',     aum_b:  23.20, period: '2025-12-31', cik: '0001592643' },
]

// 把机构名 normalize 成稳定的 slug。不依赖手工列表 —— 自动剥离常见公司后缀，
// 转 dash-case，处理 & / 空格 / 标点。
const SUFFIX_TOKENS = new Set([
  'inc', 'incorporated', 'llc', 'lp', 'l.p.', 'l p',
  'ltd', 'limited', 'co', 'corp', 'corporation',
  'company', 'plc', 'gmbh', 'se', 'ag', 'sa',
  'llp', 'lllp', 'ag', 'aktiebolaget', 'foundation',
  'trust', 'holdings', 'group',
])

export function toSlug(name: string): string {
  // 去掉国家/州后缀 /CA/ /NY/ /ON/ /DE/
  let s = name.replace(/\/[A-Z]{2,3}\//g, '')
  // 去掉 (Private) 之类括号说明
  s = s.replace(/\([^)]*\)/g, '')
  // & → and 不需要，直接去掉
  s = s.replace(/&/g, '-')
  // 把标点 / 逗号 / 句号 / 空格统一变 dash
  s = s.replace(/[,.]/g, '')
  s = s.toLowerCase()
  // tokens 去掉常见公司后缀
  const tokens = s.split(/[\s/-]+/).filter(Boolean)
  const filtered: string[] = []
  for (const t of tokens) {
    if (SUFFIX_TOKENS.has(t)) continue
    filtered.push(t)
  }
  return filtered.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// 三语 tagline / role / bio 占位
function buildPlaceholderInvestor(row: RankingRow, slug: string) {
  const aum = `$${row.aum_b.toFixed(2)}B`
  return {
    slug,
    display_name: {
      en: row.name,
      'zh-CN': row.name_zh_cn ?? row.name,
      'zh-HK': row.name_zh_hk ?? row.name,
    },
    tagline: {
      en: `SEC 13F filer · AUM ${aum}`,
      'zh-CN': `SEC 13F 机构 · 管理资产 ${aum}`,
      'zh-HK': `SEC 13F 機構 · 管理資產 ${aum}`,
    },
    role: {
      en: `Institutional investor (rank #${row.rank}, CIK ${row.cik})`,
      'zh-CN': `机构投资者（排名 #${row.rank}，CIK ${row.cik}）`,
      'zh-HK': `機構投資者（排名 #${row.rank}，CIK ${row.cik}）`,
    },
    born: 0,
    portrait: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}&backgroundColor=00b8b8,4781ff,ff7333,9d4edd&radius=50&fontWeight=700&size=400`,
    cik: row.cik,
    holdings_source: '13f' as const,
    featured: false,
    // 首页用 rank 升序排列；批量机构 fetch holdings 后 holdings.total_value_usd 是更准确的 AUM
    rank: row.rank,
    aum_usd: Math.round(row.aum_b * 1e9),
    bio: {
      en: `${row.name} is an institutional investor managing approximately ${aum} in disclosed U.S. equity holdings as of ${row.period}, ranking #${row.rank} among SEC 13F filers.`,
      'zh-CN': `${row.name_zh_cn ?? row.name} 是一家机构投资者，截至 ${row.period} 公开披露的美股持仓约 ${aum}，在 SEC 13F 机构中排名 #${row.rank}。`,
      'zh-HK': `${row.name_zh_hk ?? row.name} 是一家機構投資者，截至 ${row.period} 公開披露的美股持倉約 ${aum}，在 SEC 13F 機構中排名 #${row.rank}。`,
    },
    philosophy: [],
    quotes: [],
    milestones: [],
  }
}

// 列出 data/investors 目录里所有已有 yaml 的 cik 集合（按文件读取）
function loadExistingCiks(dir: string): Set<string> {
  const out = new Set<string>()
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.yaml'))) {
    const content = readFileSync(join(dir, f), 'utf-8')
    const inv = yaml.load(content) as { cik?: string } | null
    if (inv?.cik) out.add(inv.cik)
  }
  return out
}

export interface GenerateOpts {
  root?: string
  rows?: RankingRow[]
}

export interface GenerateReport {
  created: string[]
  skipped: string[]
}

export async function generateTop50(opts: GenerateOpts = {}): Promise<GenerateReport> {
  const root = opts.root ?? process.cwd()
  const rows = opts.rows ?? TOP50
  const dir = join(root, 'data/investors')
  const existingCiks = loadExistingCiks(dir)

  const created: string[] = []
  const skipped: string[] = []

  for (const row of rows) {
    if (existingCiks.has(row.cik)) {
      skipped.push(`${row.cik} (${row.name})`)
      continue
    }
    const slug = toSlug(row.name) || `cik-${row.cik}`
    const path = join(dir, `${slug}.yaml`)
    if (existsSync(path)) {
      skipped.push(`${slug} (path exists)`)
      continue
    }
    const data = buildPlaceholderInvestor(row, slug)
    // 用 js-yaml 写 yaml；保持稳定缩进
    const content = yaml.dump(data, { lineWidth: 120, noRefs: true })
    writeFileSync(path, content)
    created.push(slug)
  }

  return { created, skipped }
}

if (import.meta.main) {
  const report = await generateTop50()
  console.log(`[generate-top50] created ${report.created.length}, skipped ${report.skipped.length}`)
  if (report.created.length > 0) {
    console.log('  created:', report.created.join(', '))
  }
  if (report.skipped.length > 0) {
    console.log('  skipped:', report.skipped.slice(0, 5).join(', '), report.skipped.length > 5 ? `... +${report.skipped.length - 5} more` : '')
  }
}
