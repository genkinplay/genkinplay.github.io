import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveTicker } from './lib/ticker-resolver'

interface Row {
  name: string
  ticker?: string | null
  [k: string]: unknown
}

interface HoldingsFile {
  holdings?: Row[]
  changes?: Row[]
  [k: string]: unknown
}

function enrichFile(path: string, root: string): { matched: number; missed: number } {
  const data = JSON.parse(readFileSync(path, 'utf-8')) as HoldingsFile
  const rows = (data.holdings ?? data.changes) as Row[] | undefined
  if (!rows) return { matched: 0, missed: 0 }

  let matched = 0
  let missed = 0
  for (const row of rows) {
    const tk = resolveTicker(row.name, { root })
    row.ticker = tk
    if (tk) matched++
    else missed++
  }

  writeFileSync(path, JSON.stringify(data, null, 2))
  return { matched, missed }
}

function enrichDir(dir: string, root: string): void {
  const fullDir = join(root, dir)
  let files: string[]
  try {
    files = readdirSync(fullDir).filter((f) => f.endsWith('.json'))
  } catch {
    console.warn(`[enrich-tickers] ${dir} missing — skipped`)
    return
  }
  for (const f of files) {
    const { matched, missed } = enrichFile(join(fullDir, f), root)
    console.log(`[enrich-tickers] ${dir}/${f}: ${matched} matched, ${missed} missed`)
  }
}

export function enrichAll(opts: { root?: string } = {}): void {
  const root = opts.root ?? process.cwd()
  enrichDir('data/holdings', root)
  enrichDir('data/changes', root)
}

if (import.meta.main) {
  enrichAll()
}
