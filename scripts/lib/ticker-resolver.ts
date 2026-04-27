import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface SecTickerEntry {
  cik_str: number
  ticker: string
  title: string
}

// 13F 持仓 name 与 SEC company_tickers.json title 的差异点：
//   - SEC 形如 "L3HARRIS TECHNOLOGIES, INC. /DE/"，结尾带州/国家代码
//   - 13F 形如 "LOUISIANA PAC CORP"、"ALLY FINL INC" 用缩写
// normalize 把两边都做以下处理：
//   1. 全大写 + 去标点（. , ' " & - /）
//   2. 去州/国代码块（/DE/、/NEW/ 等）
//   3. 把常见缩写替换回全称（FINL→FINANCIAL，PAC→PACIFIC，HLDGS→HOLDINGS）
//   4. 去常见组织后缀（INC / CORP / CO / LIMITED / LTD ...）
//   5. 去单独的 OF / NEW / N
//   6. 折叠空白
function normalize(s: string): string {
  let n = s.toUpperCase()
  // 去 /DE/ /NEW/ /MO/ 等 SEC 标记
  n = n.replace(/\/[A-Z]+\/?/g, ' ')
  // 标点 + 连字符 → 空格
  n = n.replace(/[.,'"&\-/]/g, ' ')
  // 缩写 → 全称
  n = n.replace(/\bFINL\b/g, 'FINANCIAL')
  n = n.replace(/\bPAC\b/g, 'PACIFIC')
  n = n.replace(/\bHLDGS\b/g, 'HOLDINGS')
  n = n.replace(/\bPETE\b/g, 'PETROLEUM')
  n = n.replace(/\bCOMM\b/g, 'COMMUNICATIONS')
  n = n.replace(/\bINTL\b/g, 'INTERNATIONAL')
  n = n.replace(/\bTECH\b/g, 'TECHNOLOGY')
  // 去组织后缀
  n = n.replace(
    /\b(INCORPORATED|INC|CORPORATION|CORP|COMPANY|CO|LIMITED|LTD|HOLDINGS|GROUP|PLC|CL\s+[A-Z]+|CLASS\s+[A-Z]+|SHARES|LLC)\b/g,
    '',
  )
  // 单独的 OF / NEW / N（13F 末尾常见，"CHARTER COMMUNICATIONS INC N"）
  n = n.replace(/\b(OF|NEW|N|THE)\b/g, '')
  // 折叠空白
  n = n.replace(/\s+/g, ' ').trim()
  return n
}

/**
 * 13F 名称里 SEC 自动匹配不到的常见缩写——补一张人工映射表。
 * key 用 normalize() 之后的名字（避免空格 / 大小写差异）。
 */
// normalize() 之后仍然匹配不到的 → 手工兜底。
// 这里的 key 必须是经过 normalize() 后的字符串。
const OVERRIDES: Record<string, string> = {
  // SEC 缺收录或品牌名变化的常见标的
  'MASTERCARD':              'MA',     // 13F: MASTERCARD INCORPORATED
  'VERISIGN':                'VRSN',
  'NEW YORK TIMES':          'NYT',    // 13F: NEW YORK TIMES CO
  'LIBERTY LIVE':            'LLYVA',  // 13F: LIBERTY LIVE HOLDINGS INC
  'LIBERTY MEDIA DEL':       'LLYVK',  // 13F: LIBERTY MEDIA CORP DEL (Delaware 后缀)
  'BERKSHIRE HATHAWAY':      'BRK.B',
  // ETF / 指数产品 SEC tickers JSON 收录不全
  'VANGUARD GROWTH ETF':     'VUG',
  'ISHARES RUSSELL 1000 ETF': 'IWB',
  'ISHARES RUSSELL 2000 ETF': 'IWM',
  'SPDR S&P 500 ETF':        'SPY',
}

interface ResolverCache {
  byTitle: Map<string, string>
  byOverride: Map<string, string>
  path: string
}
let cached: ResolverCache | null = null

function loadMap(secTickersPath: string): ResolverCache {
  if (cached && cached.path === secTickersPath) return cached
  const raw = JSON.parse(readFileSync(secTickersPath, 'utf-8')) as Record<string, SecTickerEntry>
  const byTitle = new Map<string, string>()
  for (const it of Object.values(raw)) {
    const key = normalize(it.title)
    // 不要让后来的同名条目覆盖已存在的（保留先到的，通常是主要 class A 股）
    if (!byTitle.has(key)) byTitle.set(key, it.ticker)
  }
  const byOverride = new Map<string, string>(Object.entries(OVERRIDES))
  cached = { byTitle, byOverride, path: secTickersPath }
  return cached
}

export interface ResolveOptions {
  secTickersPath?: string
  root?: string
}

/**
 * 给定 13F 持仓的 name，返回对应美股 ticker（如 "AAPL"），找不到返回 null。
 * 优先用 SEC company_tickers.json 自动匹配；漏掉的常见缩写靠人工 OVERRIDES 兜底。
 */
export function resolveTicker(name: string, opts: ResolveOptions = {}): string | null {
  const root = opts.root ?? process.cwd()
  const path = opts.secTickersPath ?? join(root, 'data/sec-tickers.json')
  const { byTitle, byOverride } = loadMap(path)
  const n = normalize(name)
  return byOverride.get(n) ?? byTitle.get(n) ?? null
}

// for tests
export { normalize, OVERRIDES }
