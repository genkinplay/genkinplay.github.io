/**
 * 从维基百科拉机构投资者的简介写进 yaml 的 bio 字段。
 *
 *   - 仅处理 featured === false 的批量生成机构（避免覆盖手工策展的 6 位）
 *   - 英文走 en.wikipedia.org，中文走 zh.wikipedia.org（用 variant=zh-cn / zh-hk
 *     让维基自动做简繁转换）
 *   - 先用 opensearch 找最相关页面，再用 query API 取 lead-section extract
 *   - 没有维基页面 / extract 太短的，保留原 yaml 里的占位 bio
 *   - 有页面就把 wiki_url 也写进 yaml，方便事后审查或纠正错误的页面匹配
 *
 * 用法：
 *   bun run scripts/fetch-wiki-bios.ts
 *   bun run wiki:bios
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'

const UA = 'longbridge-investors/1.0 (research; data fetched once and cached)'
// extract 至少这么长才算可用，太短的是消歧义页或 stub
const MIN_EXTRACT_LEN = 80

interface InvestorYaml {
  slug: string
  display_name: { en: string; 'zh-CN': string; 'zh-HK': string }
  bio: { en: string; 'zh-CN': string; 'zh-HK': string }
  featured?: boolean
  wiki_url?: { en?: string; zh?: string }
  [k: string]: unknown
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** opensearch 找最匹配的维基页面标题；返回 null 表示没找到 */
async function searchTitleOnce(lang: 'en' | 'zh', query: string): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json&origin=*`
  const data = await fetchJson(url)
  if (!Array.isArray(data) || !Array.isArray(data[1])) return null
  return data[1][0] ?? null
}

/**
 * 把机构名展开成多个候选查询，按"特异度由高到低"试。
 * 解决 "Polen Capital Management LLC" 在维基找不到、但 "Polen Capital" 能命中的问题。
 */
function expandQueries(raw: string): string[] {
  const candidates = new Set<string>()
  const original = raw.trim()
  candidates.add(original)

  // 去掉国家/州后缀 /CA/ /NY/
  let s = original.replace(/\/[A-Z]{2,3}\//g, '').trim()
  candidates.add(s)
  // 去掉括号说明
  s = s.replace(/\([^)]*\)/g, '').trim()
  candidates.add(s)

  // 去末尾的常见公司后缀 token 一层一层试
  const suffixes = [
    'LLC', 'L.L.C.', 'INC', 'INC.', 'LTD', 'LTD.', 'LP', 'L.P.', 'LLP', 'PLC',
    'CO', 'CO.', 'CORP', 'CORPORATION', 'GROUP', 'HOLDINGS', 'TRUST',
    'COMPANY', 'PARTNERSHIP', 'L P', 'SE', 'GMBH', 'AG', 'BV',
    'MANAGEMENT', 'INVESTMENTS', 'INVESTMENT', 'FUNDS', 'FUND',
    'SECURITIES', 'PARTNERS', 'ASSOCIATES',
  ]
  let working = s
  for (let i = 0; i < 4; i++) {
    const upper = working.toUpperCase()
    let cut = false
    for (const suf of suffixes) {
      const re = new RegExp(`\\s+${suf.replace(/\./g, '\\.')}\\.?$`, 'i')
      if (re.test(working)) {
        working = working.replace(re, '').trim().replace(/[,]+$/, '').trim()
        cut = true
        break
      }
      if (upper.endsWith(' ' + suf)) {
        working = working.slice(0, working.length - suf.length - 1).trim().replace(/[,]+$/, '').trim()
        cut = true
        break
      }
    }
    if (!cut) break
    candidates.add(working)
  }

  // 也尝试 Title Case 后的版本 —— 维基对 "ALKEON CAPITAL" 类大写不匹配
  const arr = Array.from(candidates)
  for (const c of arr) {
    if (c === c.toUpperCase() && c.length > 4) {
      const titleCase = c.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())
      candidates.add(titleCase)
    }
  }

  return Array.from(candidates).filter(Boolean)
}

/**
 * 防止剥后缀剥过头之后命中无关条目（"Sands Capital" 一路剥到 "Sands"
 * 后命中了"capitalism"之类无关页）。
 *
 * - 英文 wiki：要求返回标题至少包含原始查询的首词（品牌名 Sands/Polen/Coatue）
 * - 中文 wiki：要求返回标题至少包含原始查询的前 2 个汉字（"黑石集团"→"黑石"）
 */
function titleMatchesQuery(lang: 'en' | 'zh', title: string, originalQuery: string): boolean {
  // 直接拒绝消歧义页（"TCI", "Newport" 这种通用词容易匹配到无关条目）
  if (/\(disambiguation\)/i.test(title) || /^[A-Z]{2,5}$/.test(title)) {
    return false
  }
  // 拒绝带 v.（法律案件 "X v. Y"）/ College / University / Restoration / War 等显然非投资机构的标题
  if (/\bv\.\b|\bCollege\b|\bUniversity\b|\bRestoration\b|\bMonastery\b/.test(title)) {
    return false
  }

  if (lang === 'en') {
    const firstWord = originalQuery.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
    if (firstWord.length < 3) return true
    return title.toLowerCase().includes(firstWord)
  }
  // 中文：取前两个汉字作匹配 token
  const cjk = originalQuery.match(/[一-鿿]/g)
  if (!cjk || cjk.length < 2) return true
  const token = cjk.slice(0, 2).join('')
  return title.includes(token)
}

/** 多候选查询逐个尝试，第一个命中且能通过 guard 的才返回 */
async function searchTitle(lang: 'en' | 'zh', rawQuery: string): Promise<string | null> {
  for (const q of expandQueries(rawQuery)) {
    const title = await searchTitleOnce(lang, q)
    if (title && titleMatchesQuery(lang, title, rawQuery)) return title
    await new Promise((r) => setTimeout(r, 50))
  }
  return null
}

/**
 * 拉 lead-section 纯文本 extract。优先用 REST `/page/summary/` 端点
 * （比 action=query&prop=extracts 稳定，支持 redirects、disambiguation 标识）。
 *
 * 中文 wiki 的 summary 端点也可用，加 ?variant= 不一定生效（REST 端点不一定
 * 支持），所以中文我们 fallback 到 query+extracts 仍带 variant 参数。
 */
async function fetchExtract(lang: 'en' | 'zh', title: string, variant?: 'zh-cn' | 'zh-hk'): Promise<string | null> {
  // 先试 REST summary 端点
  const restUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  const restData = await fetchJson(restUrl)
  if (restData) {
    // disambiguation / no-extract 跳过
    if (restData.type !== 'disambiguation') {
      const extract = (restData.extract as string | undefined)?.trim() ?? ''
      if (extract.length >= MIN_EXTRACT_LEN) {
        // REST summary 不支持 variant，中文要 zh-cn / zh-hk 时另走 query API
        if (lang === 'zh' && variant) {
          // 同 title 走 action=query 拿 variant 转换的版本
          const queryUrl = `https://zh.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&redirects=1&variant=${variant}&titles=${encodeURIComponent(title)}&origin=*`
          const qd = await fetchJson(queryUrl)
          const pages = qd?.query?.pages
          if (pages) {
            const ex = (Object.values(pages)[0] as { extract?: string } | undefined)?.extract?.trim() ?? ''
            if (ex.length >= MIN_EXTRACT_LEN) return ex
          }
        }
        return extract
      }
    }
  }

  // fallback：旧的 query+extracts
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    redirects: '1',
    titles: title,
    origin: '*',
  })
  if (variant) params.set('variant', variant)
  const url = `https://${lang}.wikipedia.org/w/api.php?${params}`
  const data = await fetchJson(url)
  const pages = data?.query?.pages
  if (!pages) return null
  const first = Object.values(pages)[0] as { extract?: string } | undefined
  const extract = first?.extract?.trim() ?? ''
  return extract.length >= MIN_EXTRACT_LEN ? extract : null
}

function urlForTitle(lang: 'en' | 'zh', title: string): string {
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

interface PerInvestorReport {
  slug: string
  en: 'ok' | 'miss'
  zhCN: 'ok' | 'miss'
  zhHK: 'ok' | 'miss'
}

async function processOne(invPath: string): Promise<PerInvestorReport | null> {
  const inv = yaml.load(readFileSync(invPath, 'utf-8')) as InvestorYaml
  if (inv.featured !== false) return null

  const enQuery = inv.display_name.en
  const zhQueryCN = inv.display_name['zh-CN']
  const zhQueryHK = inv.display_name['zh-HK']

  // 英文：搜索 + 抓 extract
  const enTitle = await searchTitle('en', enQuery)
  const enExtract = enTitle ? await fetchExtract('en', enTitle) : null

  // 中文：先用 zh-CN 名搜，落空再 fallback 到 zh-HK，再 fallback 到英文标题
  let zhTitle = await searchTitle('zh', zhQueryCN)
  if (!zhTitle && zhQueryHK !== zhQueryCN) zhTitle = await searchTitle('zh', zhQueryHK)
  if (!zhTitle && enTitle) zhTitle = await searchTitle('zh', enTitle)

  const zhCNExtract = zhTitle ? await fetchExtract('zh', zhTitle, 'zh-cn') : null
  const zhHKExtract = zhTitle ? await fetchExtract('zh', zhTitle, 'zh-hk') : null

  let touched = false
  if (enExtract) { inv.bio.en = enExtract; touched = true }
  if (zhCNExtract) { inv.bio['zh-CN'] = zhCNExtract; touched = true }
  if (zhHKExtract) { inv.bio['zh-HK'] = zhHKExtract; touched = true }

  if (enTitle || zhTitle) {
    inv.wiki_url = {
      ...(enTitle ? { en: urlForTitle('en', enTitle) } : {}),
      ...(zhTitle ? { zh: urlForTitle('zh', zhTitle) } : {}),
    }
    touched = true
  }

  if (touched) {
    writeFileSync(invPath, yaml.dump(inv, { lineWidth: 1000, noRefs: true }))
  }

  return {
    slug: inv.slug,
    en: enExtract ? 'ok' : 'miss',
    zhCN: zhCNExtract ? 'ok' : 'miss',
    zhHK: zhHKExtract ? 'ok' : 'miss',
  }
}

export async function fetchWikiBios(rootDir: string = process.cwd()) {
  const dir = join(rootDir, 'data/investors')
  const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'))
  const reports: PerInvestorReport[] = []

  for (const f of files) {
    const r = await processOne(join(dir, f))
    if (!r) continue
    const tag = `${r.en === 'ok' ? '✓en' : '·en'} ${r.zhCN === 'ok' ? '✓zh' : '·zh'}`
    console.log(`[wiki] ${r.slug.padEnd(45)} ${tag}`)
    reports.push(r)
    // 礼貌延迟，避免 Wikipedia API 限流（每秒 5 个请求左右）
    await new Promise((r) => setTimeout(r, 200))
  }

  const enHits = reports.filter((r) => r.en === 'ok').length
  const zhHits = reports.filter((r) => r.zhCN === 'ok').length
  console.log(`\n[fetch-wiki-bios] ${reports.length} processed; en hits=${enHits}/${reports.length}, zh hits=${zhHits}/${reports.length}`)
  return reports
}

if (import.meta.main) {
  fetchWikiBios().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
