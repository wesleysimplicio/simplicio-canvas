import { describe, expect, it } from 'vitest'
import { nextCameraView } from '../src/domain/camera-view'

describe('architecture camera view', () => {
  it('toggles between perspective and top-down views', () => {
    expect(nextCameraView('perspective')).toBe('top')
    expect(nextCameraView('top')).toBe('perspective')
  })
})
