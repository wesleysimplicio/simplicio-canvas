import { describe, expect, it } from 'vitest'
import { CONFIRM_APPLY, previewApply } from '../src/domain/apply-gate'
const plan = { version: 1 as const, operations: [], files: ['a.ts'], symbols: [], imports: [], tests: [], summary: '', readonly: true as const }
describe('explicit apply gate', () => { it('requires exact confirmation and validates diff', () => { expect(previewApply({ plan, diffs: [{ path: 'a.ts', before: 'a', after: 'b' }], confirmation: 'yes' }).allowed).toBe(false); expect(previewApply({ plan, diffs: [{ path: 'a.ts', before: 'a', after: 'b' }], confirmation: CONFIRM_APPLY }).allowed).toBe(true) }) })
