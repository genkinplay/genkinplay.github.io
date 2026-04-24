import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadInvestorYaml, validateInvestor, type Investor } from './lib/investor-data'
import { runInvestorsCli } from './lib/cli'

export interface FetchReport {
  successes: string[]
  fallbacks: string[]
  failures: string[]
  skipped: string[]
}

export interface FetchOptions {
  root?: string
  runCli?: (cik: string, opts: { sub?: 'changes' }) => Promise<unknown>
}

function ensureDir(p: string): void {
  mkdirSync(p, { recursive: true })
}

function loadAllInvestors(investorsDir: string): Investor[] {
  return readdirSync(investorsDir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const inv = loadInvestorYaml(readFileSync(join(investorsDir, f), 'utf-8'))
      const { ok, errors } = validateInvestor(inv)
      if (!ok) throw new Error(`Invalid YAML ${f}: ${errors.join(', ')}`)
      return inv
    })
}

async function fetchOne(
  inv: Investor,
  runCli: FetchOptions['runCli'],
  root: string,
  report: FetchReport,
): Promise<void> {
  if (inv.holdings_source === 'curated') {
    report.skipped.push(inv.slug)
    return
  }

  const holdingsPath = join(root, 'data/holdings', `${inv.slug}.json`)
  const changesPath = join(root, 'data/changes', `${inv.slug}.json`)
  const holdingsCache = join(root, '.cache/holdings', `${inv.slug}.json`)
  const changesCache = join(root, '.cache/changes', `${inv.slug}.json`)

  try {
    const [holdings, changes] = await Promise.all([
      runCli!(inv.cik, {}),
      runCli!(inv.cik, { sub: 'changes' }),
    ])
    writeFileSync(holdingsPath, JSON.stringify(holdings, null, 2))
    writeFileSync(changesPath, JSON.stringify(changes, null, 2))
    ensureDir(join(root, '.cache/holdings'))
    ensureDir(join(root, '.cache/changes'))
    writeFileSync(holdingsCache, JSON.stringify(holdings, null, 2))
    writeFileSync(changesCache, JSON.stringify(changes, null, 2))
    report.successes.push(inv.slug)
  } catch (err) {
    const hasCache = existsSync(holdingsCache) && existsSync(changesCache)
    if (hasCache) {
      copyFileSync(holdingsCache, holdingsPath)
      copyFileSync(changesCache, changesPath)
      report.fallbacks.push(inv.slug)
      console.warn(`[fetch-data] ${inv.slug} fell back to cache (CLI failed: ${(err as Error).message})`)
    } else {
      report.failures.push(inv.slug)
      console.error(`[fetch-data] ${inv.slug} failed without cache: ${(err as Error).message}`)
    }
  }
}

export async function fetchAllInvestors(opts: FetchOptions = {}): Promise<FetchReport> {
  const root = opts.root ?? process.cwd()
  const runCli = opts.runCli ?? ((cik, o) => runInvestorsCli(cik, o as never))

  ensureDir(join(root, 'data/holdings'))
  ensureDir(join(root, 'data/changes'))

  const report: FetchReport = { successes: [], fallbacks: [], failures: [], skipped: [] }
  const investors = loadAllInvestors(join(root, 'data/investors'))
  for (const inv of investors) {
    await fetchOne(inv, runCli, root, report)
  }

  console.log('[fetch-data]', report)
  return report
}

if (import.meta.main) {
  fetchAllInvestors().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
