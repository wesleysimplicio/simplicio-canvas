import { describe, expect, it } from 'vitest'
import { nextHandToolState } from '../src/domain/hand-tool'

describe('hand navigation tool', () => {
  it('toggles with H and exits with Escape', () => {
    expect(nextHandToolState(false, 'h')).toBe(true)
    expect(nextHandToolState(true, 'h')).toBe(false)
    expect(nextHandToolState(true, 'escape')).toBe(false)
  })
})
