import { describe, expect, it } from 'vitest'
import { responsiveLayout } from '../src/domain/responsive-layout'

describe('responsive canvas layout', () => {
  it('uses a phone canvas with a bottom-sheet inspector in portrait', () => {
    expect(responsiveLayout(390, 844)).toEqual({ mode: 'mobile', inspector: 'bottom-sheet', legend: 'hidden', hud: 'compact' })
  })

  it('uses a compact profile for short landscape phones', () => {
    expect(responsiveLayout(844, 390)).toEqual({ mode: 'compact', inspector: 'bottom-sheet', legend: 'hidden', hud: 'minimal' })
  })

  it('uses a tablet profile without showing both desktop rails', () => {
    expect(responsiveLayout(1024, 768)).toEqual({ mode: 'tablet', inspector: 'sidebar', legend: 'drawer', hud: 'compact' })
  })

  it('keeps desktop side panels at standard desktop viewports', () => {
    expect(responsiveLayout(1440, 900)).toEqual({ mode: 'desktop', inspector: 'sidebar', legend: 'sidebar', hud: 'full' })
  })

  it('expands rails on ultrawide viewports', () => {
    expect(responsiveLayout(2560, 1440)).toEqual({ mode: 'wide', inspector: 'sidebar', legend: 'sidebar', hud: 'full' })
  })
})
