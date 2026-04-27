import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadInvestorYaml, validateInvestor, type Investor } from './lib/investor-data'
import { runInvestorsCli } from './lib/cli'
import { runInsiderTrades, filterByOwner, type InsiderTrade } from './lib/insider-trades'

export interface FetchReport {
  successes: string[]
  fallbacks: string[]
  failures: string[]
  skipped: string[]
  insider_successes: string[]
  insider_failures: string[]
}

export interface FetchOptions {
  root?: string
  runCli?: (cik: string, opts: { sub?: 'changes' }) => Promise<unknown>
  runInsider?: (symbol: string, count?: number) => Promise<InsiderTrade[]>
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

async function fetchInsider(
  inv: Investor,
  runInsider: NonNullable<FetchOptions['runInsider']>,
  root: string,
  report: FetchReport,
): Promise<void> {
  if (!inv.insider_ticker) return

  const path = join(root, 'data/insider-trades', `${inv.slug}.json`)
  const cache = join(root, '.cache/insider-trades', `${inv.slug}.json`)

  try {
    const raw = await runInsider(inv.insider_ticker, 200)
    const trades = inv.insider_owner_match
      ? filterByOwner(raw, inv.insider_owner_match)
      : raw
    const payload = {
      ticker: inv.insider_ticker,
      owner_match: inv.insider_owner_match ?? null,
      fetched_at: new Date().toISOString(),
      total_count: trades.length,
      trades,
    }
    const json = JSON.stringify(payload, null, 2)
    writeFileSync(path, json)
    ensureDir(join(root, '.cache/insider-trades'))
    writeFileSync(cache, json)
    report.insider_successes.push(inv.slug)
  } catch (err) {
    if (existsSync(cache)) {
      copyFileSync(cache, path)
      report.insider_successes.push(`${inv.slug} (cache)`)
      console.warn(`[fetch-data] ${inv.slug} insider fell back to cache: ${(err as Error).message}`)
    } else {
      report.insider_failures.push(inv.slug)
      console.error(`[fetch-data] ${inv.slug} insider failed without cache: ${(err as Error).message}`)
    }
  }
}

export async function fetchAllInvestors(opts: FetchOptions = {}): Promise<FetchReport> {
  const root = opts.root ?? process.cwd()
  const runCli = opts.runCli ?? ((cik, o) => runInvestorsCli(cik, o as never))
  const runInsider = opts.runInsider ?? ((sym, count) => runInsiderTrades(sym, { count }))

  ensureDir(join(root, 'data/holdings'))
  ensureDir(join(root, 'data/changes'))
  ensureDir(join(root, 'data/insider-trades'))

  const report: FetchReport = {
    successes: [],
    fallbacks: [],
    failures: [],
    skipped: [],
    insider_successes: [],
    insider_failures: [],
  }
  const investors = loadAllInvestors(join(root, 'data/investors'))
  for (const inv of investors) {
    await fetchOne(inv, runCli, root, report)
    await fetchInsider(inv, runInsider, root, report)
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
