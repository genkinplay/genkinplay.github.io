import { describe, it, expect, vi } from 'vitest'
import { runInvestorsCli, CliUnavailableError, CliExecutionError } from '@scripts/lib/cli'

describe('runInvestorsCli', () => {
  it('parses JSON from stdout when command succeeds', async () => {
    const fakeExec = vi.fn().mockResolvedValue({
      stdout: JSON.stringify({ cik: '0001067983', firm: 'BRK', holdings: [] }),
      code: 0,
    })
    const res = await runInvestorsCli<{ cik: string; firm: string; holdings: unknown[] }>(
      '0001067983',
      { exec: fakeExec },
    )
    expect(res.firm).toBe('BRK')
    expect(fakeExec).toHaveBeenCalledWith('longbridge', [
      'investors',
      '0001067983',
      '--format',
      'json',
    ])
  })

  it('throws CliUnavailableError when binary is missing', async () => {
    const fakeExec = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    await expect(runInvestorsCli('0001067983', { exec: fakeExec })).rejects.toBeInstanceOf(
      CliUnavailableError,
    )
  })

  it('throws CliExecutionError on non-zero exit', async () => {
    const fakeExec = vi
      .fn()
      .mockResolvedValue({ stdout: '', stderr: 'bad cik', code: 1 })
    await expect(runInvestorsCli('999', { exec: fakeExec })).rejects.toBeInstanceOf(
      CliExecutionError,
    )
  })

  it('supports the "changes" sub-command', async () => {
    const fakeExec = vi
      .fn()
      .mockResolvedValue({ stdout: JSON.stringify({ added: 0, changes: [] }), code: 0 })
    await runInvestorsCli('0001067983', { exec: fakeExec, sub: 'changes' })
    expect(fakeExec).toHaveBeenCalledWith('longbridge', [
      'investors',
      'changes',
      '0001067983',
      '--format',
      'json',
    ])
  })
})
