import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChangesPanel from '@theme/components/ChangesPanel.vue'

const CHANGES = {
  added: 14,
  changes: [
    { action: 'NEW', name: 'NYT', cusip: '650111107', shares: 5_065_744, value_usd: 351_663_948, delta_pct: 'NEW', delta_usd: 351_663_948, prev_shares: 0, prev_value_usd: 0 },
    { action: 'ADDED', name: 'OXY', cusip: '674599105', shares: 25_000_000, value_usd: 1_200_000_000, delta_pct: '+5.2', delta_usd: 60_000_000, prev_shares: 23_800_000, prev_value_usd: 1_140_000_000 },
    { action: 'REDUCED', name: 'C', cusip: '172967424', shares: 40_000_000, value_usd: 3_000_000_000, delta_pct: '-12.4', delta_usd: -425_000_000, prev_shares: 45_700_000, prev_value_usd: 3_425_000_000 },
    { action: 'EXITED', name: 'HPQ', cusip: '40434L105', shares: 0, value_usd: 0, delta_pct: 'EXITED', delta_usd: -1_800_000_000, prev_shares: 104_500_000, prev_value_usd: 1_800_000_000 },
  ],
}

describe('ChangesPanel', () => {
  it('shows four action counts', () => {
    const w = mount(ChangesPanel, { props: { data: CHANGES, label: 'Changes' }})
    expect(w.text()).toMatch(/NEW.*1/)
    expect(w.text()).toMatch(/ADDED.*1/)
    expect(w.text()).toMatch(/REDUCED.*1/)
    expect(w.text()).toMatch(/EXITED.*1/)
  })

  it('defaults to filtering by NEW (shows NYT, hides others)', () => {
    const w = mount(ChangesPanel, { props: { data: CHANGES, label: 'Changes' }})
    expect(w.text()).toContain('NYT')
    expect(w.text()).not.toContain('OXY')
    expect(w.text()).not.toContain('HPQ')
  })

  it('switches list when clicking another action card', async () => {
    const w = mount(ChangesPanel, { props: { data: CHANGES, label: 'Changes' }})
    const buttons = w.findAll('button')
    const addedBtn = buttons.find((b) => b.text().includes('ADDED'))
    expect(addedBtn).toBeDefined()
    await addedBtn!.trigger('click')
    expect(w.text()).toContain('OXY')
    expect(w.text()).not.toContain('NYT')
  })
})
