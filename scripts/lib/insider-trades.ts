import { spawn } from 'node:child_process'
import { CliExecutionError, CliUnavailableError, type ExecFn } from './cli'

export interface InsiderTrade {
  date: string
  filing_date?: string
  owner: string
  title?: string
  type: string
  code: string
  shares: number
  price?: number
  value?: number
  shares_after?: number
}

export interface RunInsiderTradesOptions {
  exec?: ExecFn
  count?: number
}

const defaultExec: ExecFn = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (b: Buffer) => { stdout += b.toString() })
    child.stderr.on('data', (b: Buffer) => { stderr += b.toString() })
    child.on('error', reject)
    child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }))
  })

/**
 * Pulls SEC Form 4 insider transactions for a US-listed ticker via
 * `longbridge insider-trades <SYMBOL> --format json`.
 */
export async function runInsiderTrades(
  symbol: string,
  opts: RunInsiderTradesOptions = {},
): Promise<InsiderTrade[]> {
  const exec = opts.exec ?? defaultExec
  const count = opts.count ?? 200
  const args = ['insider-trades', symbol, '--format', 'json', '--count', String(count)]

  let result
  try {
    result = await exec('longbridge', args)
  } catch (err) {
    const e = err as NodeJS.ErrnoException
    if (e.code === 'ENOENT') {
      throw new CliUnavailableError('longbridge CLI binary not found on PATH')
    }
    throw err
  }

  if (result.code !== 0) {
    throw new CliExecutionError(
      result.code,
      result.stderr ?? '',
      `longbridge ${args.join(' ')} exited with ${result.code}: ${result.stderr ?? ''}`,
    )
  }

  return JSON.parse(result.stdout) as InsiderTrade[]
}

/**
 * Filter the raw Form 4 feed to entries where `owner` includes the given
 * substring (case-insensitive). Used to narrow a ticker's full feed
 * (e.g. all NVDA insider activity) to one specific person's trades.
 */
export function filterByOwner(
  trades: InsiderTrade[],
  ownerMatch: string,
): InsiderTrade[] {
  const needle = ownerMatch.trim().toLowerCase()
  if (!needle) return trades
  return trades.filter((t) => (t.owner ?? '').toLowerCase().includes(needle))
}
