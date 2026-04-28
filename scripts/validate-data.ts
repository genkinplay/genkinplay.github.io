/**
 * 数据核验脚本：在 build 前/手动调用，扫描 data/holdings 和 data/changes 下所有
 * JSON 文件，按 schema + 一致性规则报告问题。
 *
 *   error   → 必报；存在任何 error 时 process.exit(1)，build 中断
 *   warning → 仅 stderr 输出，不阻断 build（典型场景：longbridge CLI 把
 *             "shares 没变但市值变了"的条目误标为 ADDED/REDUCED）
 *
 * 使用：
 *   bun run scripts/validate-data.ts
 *   bun run validate
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export type IssueLevel = 'error' | 'warning'
export interface Issue {
  level: IssueLevel
  file: string
  code: string
  message: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const VALID_ACTIONS = new Set(['NEW', 'ADDED', 'REDUCED', 'EXITED'])

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(p, 'utf-8'))
}

/** 校验单个 holdings JSON 文件 */
export function validateHoldingsFile(file: string, data: unknown): Issue[] {
  const out: Issue[] = []
  if (!data || typeof data !== 'object') {
    return [{ level: 'error', file, code: 'shape', message: 'root is not an object' }]
  }
  const d = data as Record<string, unknown>

  if (typeof d.period !== 'string' || !DATE_RE.test(d.period)) {
    out.push({ level: 'error', file, code: 'period', message: `invalid period: ${d.period}` })
  }
  if (typeof d.total_value_usd !== 'number' || d.total_value_usd <= 0) {
    out.push({ level: 'error', file, code: 'total_value_usd', message: `must be positive number, got ${d.total_value_usd}` })
  }
  if (!Array.isArray(d.holdings)) {
    out.push({ level: 'error', file, code: 'holdings', message: 'must be array' })
    return out
  }

  for (const h of d.holdings as Record<string, unknown>[]) {
    const id = (h.ticker as string) ?? (h.cusip as string) ?? (h.name as string) ?? '<unknown>'
    if (typeof h.name !== 'string' || h.name.trim() === '') {
      out.push({ level: 'error', file, code: 'holding.name', message: `${id}: missing name` })
    }
    if (typeof h.shares !== 'number' || (h.shares as number) < 0) {
      out.push({ level: 'error', file, code: 'holding.shares', message: `${id}: invalid shares=${h.shares}` })
    }
    if (typeof h.value_usd !== 'number' || (h.value_usd as number) < 0) {
      out.push({ level: 'error', file, code: 'holding.value_usd', message: `${id}: invalid value_usd=${h.value_usd}` })
    }
    const w = parseFloat(String(h.weight_pct))
    if (!Number.isFinite(w) || w < 0 || w > 100) {
      out.push({ level: 'error', file, code: 'holding.weight_pct', message: `${id}: invalid weight_pct=${h.weight_pct}` })
    }
  }

  return out
}

/** 校验单个 changes JSON 文件 */
export function validateChangesFile(file: string, data: unknown): Issue[] {
  const out: Issue[] = []
  if (!data || typeof data !== 'object') {
    return [{ level: 'error', file, code: 'shape', message: 'root is not an object' }]
  }
  const d = data as Record<string, unknown>

  if (typeof d.period !== 'string' || !DATE_RE.test(d.period)) {
    out.push({ level: 'error', file, code: 'period', message: `invalid period: ${d.period}` })
  }
  if (d.prev_report_date !== undefined && (typeof d.prev_report_date !== 'string' || !DATE_RE.test(d.prev_report_date))) {
    out.push({ level: 'error', file, code: 'prev_report_date', message: `invalid prev_report_date: ${d.prev_report_date}` })
  }
  if (!Array.isArray(d.changes)) {
    out.push({ level: 'error', file, code: 'changes', message: 'must be array' })
    return out
  }

  let zeroDelta = 0
  for (const ch of d.changes as Record<string, unknown>[]) {
    const id = (ch.ticker as string) ?? (ch.cusip as string) ?? (ch.name as string) ?? '<unknown>'
    const action = ch.action as string
    if (!VALID_ACTIONS.has(action)) {
      out.push({ level: 'error', file, code: 'change.action', message: `${id}: invalid action=${action}` })
    }
    if (typeof ch.shares !== 'number' || (ch.shares as number) < 0) {
      out.push({ level: 'error', file, code: 'change.shares', message: `${id}: invalid shares=${ch.shares}` })
    }
    const prev = (ch.prev_shares as number | undefined) ?? 0
    if (typeof prev !== 'number' || prev < 0) {
      out.push({ level: 'error', file, code: 'change.prev_shares', message: `${id}: invalid prev_shares=${prev}` })
    }
    if (typeof ch.delta_usd !== 'number') {
      out.push({ level: 'error', file, code: 'change.delta_usd', message: `${id}: missing or non-number delta_usd` })
    }

    // 跨字段一致性
    if (action === 'NEW' && prev !== 0) {
      out.push({ level: 'error', file, code: 'change.NEW_with_prev', message: `${id}: action=NEW but prev_shares=${prev}` })
    }
    if (action === 'EXITED' && (ch.shares as number) !== 0) {
      out.push({ level: 'error', file, code: 'change.EXITED_with_shares', message: `${id}: action=EXITED but shares=${ch.shares}` })
    }

    // 估值波动误标：shares 没变但被标成 ADDED/REDUCED（前端会过滤这类条目）
    if ((action === 'ADDED' || action === 'REDUCED') && (ch.shares as number) === prev) {
      zeroDelta++
    }
  }

  if (zeroDelta > 0) {
    out.push({
      level: 'warning',
      file,
      code: 'change.zero_share_delta',
      message: `${zeroDelta} ADDED/REDUCED entries have shares == prev_shares (mark-to-market revaluation, filtered out in UI)`,
    })
  }

  return out
}

/** 遍历指定 root 下的 data/holdings + data/changes，汇总所有 issue */
export async function validateAll(rootDir: string = process.cwd()): Promise<Issue[]> {
  const issues: Issue[] = []
  const dataDir = join(rootDir, 'data')

  const holdingsDir = join(dataDir, 'holdings')
  if (existsSync(holdingsDir)) {
    for (const f of readdirSync(holdingsDir).filter((x) => x.endsWith('.json'))) {
      issues.push(...validateHoldingsFile(`data/holdings/${f}`, readJson(join(holdingsDir, f))))
    }
  }

  const changesDir = join(dataDir, 'changes')
  if (existsSync(changesDir)) {
    for (const f of readdirSync(changesDir).filter((x) => x.endsWith('.json'))) {
      issues.push(...validateChangesFile(`data/changes/${f}`, readJson(join(changesDir, f))))
    }
  }

  return issues
}

// CLI 入口
if (import.meta.main) {
  const issues = await validateAll()
  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')

  for (const w of warnings) {
    console.warn(`[validate] ⚠  ${w.file} :: ${w.code} :: ${w.message}`)
  }
  for (const e of errors) {
    console.error(`[validate] ✖  ${e.file} :: ${e.code} :: ${e.message}`)
  }

  if (errors.length > 0) {
    console.error(`\n[validate] ${errors.length} error(s), ${warnings.length} warning(s) — build aborted.`)
    process.exit(1)
  }
  console.log(`[validate] ✓ all data files passed (${warnings.length} warning(s))`)
}
