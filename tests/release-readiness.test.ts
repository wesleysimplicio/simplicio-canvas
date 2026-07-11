import { describe, expect, it } from 'vitest'
import readiness from '../fixtures/release-readiness.json'

describe('release readiness scorecard', () => {
  it('covers every maturity category with explicit evidence and boundary', () => {
    expect(readiness.schema).toBe('simplicio-canvas-readiness/v1')
    expect(new Set(readiness.categories.map((category) => category.id))).toEqual(new Set(['security', 'privacy', 'performance', 'accessibility', 'compatibility', 'recovery', 'distribution']))
    expect(readiness.categories.every((category) => category.evidence && category.boundary)).toBe(true)
  })
  it('records explicit status for compatibility and distribution gates', () => {
    expect(['partial', 'verified']).toContain(readiness.categories.find((category) => category.id === 'compatibility')?.status)
    expect(['partial', 'verified']).toContain(readiness.categories.find((category) => category.id === 'distribution')?.status)
  })
})
