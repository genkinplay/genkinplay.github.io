import { spawn } from 'node:child_process'

export class CliUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CliUnavailableError'
  }
}

export class CliExecutionError extends Error {
  constructor(
    public code: number,
    public stderr: string,
    message: string,
  ) {
    super(message)
    this.name = 'CliExecutionError'
  }
}

export interface ExecResult {
  stdout: string
  stderr?: string
  code: number
}

export type ExecFn = (cmd: string, args: string[]) => Promise<ExecResult>

const defaultExec: ExecFn = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (b: Buffer) => {
      stdout += b.toString()
    })
    child.stderr.on('data', (b: Buffer) => {
      stderr += b.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }))
  })

export interface RunOptions {
  exec?: ExecFn
  sub?: 'changes'
}

export async function runInvestorsCli<T = unknown>(
  cik: string,
  opts: RunOptions = {},
): Promise<T> {
  const exec = opts.exec ?? defaultExec
  const args =
    opts.sub === 'changes'
      ? ['investors', 'changes', cik, '--format', 'json']
      : ['investors', cik, '--format', 'json']

  let result: ExecResult
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

  return JSON.parse(result.stdout) as T
}
