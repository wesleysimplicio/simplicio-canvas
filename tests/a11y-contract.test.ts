import { describe, expect, it } from 'vitest'
import { ACCESSIBILITY_CONTRACT } from '../src/domain/a11y'

describe('Canvas accessibility contract', () => {
  it('ships labels for primary interactive surfaces and focus styling', () => {
    expect(ACCESSIBILITY_CONTRACT.requiredRegions).toEqual(expect.arrayContaining(['Ferramentas do workspace', 'Minimapa da arquitetura'])); expect(ACCESSIBILITY_CONTRACT.liveRegion).toBe('polite')
  })
  it('honors reduced-motion preferences in the renderer shell', () => { expect(ACCESSIBILITY_CONTRACT.reducedMotionMediaQuery).toContain('prefers-reduced-motion') })
})
