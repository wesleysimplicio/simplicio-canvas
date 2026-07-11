import { describe, expect, it } from 'vitest'
import { PUBLIC_DEMO_POLICY } from '../src/domain/demo-policy'

describe('public demo safety policy', () => {
  it('is read-only and exposes only the bundled example', () => {
    expect(PUBLIC_DEMO_POLICY).toEqual({
      canImportFolder: false, canImportGitHub: false, canEditSource: false,
      canSaveSource: false, canMovePieces: false, canRunProcesses: false,
      canReadBundledExample: true,
    })
  })
})
