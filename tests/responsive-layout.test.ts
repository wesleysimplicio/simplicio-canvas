import { describe, expect, it } from 'vitest'
import { responsiveLayout } from '../src/domain/responsive-layout'

describe('responsive canvas layout', () => {
  it('uses a mobile canvas with a bottom-sheet inspector below 850px', () => {
    expect(responsiveLayout(390)).toEqual({ mode: 'mobile', inspector: 'bottom-sheet', legend: 'hidden' })
  })

  it('keeps desktop side panels at wider viewports', () => {
    expect(responsiveLayout(1200)).toEqual({ mode: 'desktop', inspector: 'sidebar', legend: 'sidebar' })
  })
})
