import { describe, expect, it } from 'vitest'
import { onboardingAnnouncement, recoveryAnnouncement } from '../src/domain/onboarding-usability'

describe('onboarding and recovery usability states', () => {
  it('offers resumable, skippable and completed tour announcements', () => {
    expect(onboardingAnnouncement({ version: 1, state: 'active', step: 1 }).actionable).toBe(true)
    expect(onboardingAnnouncement({ version: 1, state: 'skipped', step: 0 }).message).toMatch(/pausado/i)
    expect(onboardingAnnouncement({ version: 1, state: 'completed', step: 3 }).actionable).toBe(false)
  })
  it('never offers restore for missing or invalid snapshots', () => {
    expect(recoveryAnnouncement('valid').actions).toContain('restore'); expect(recoveryAnnouncement('missing').actions).not.toContain('restore'); expect(recoveryAnnouncement('corrupt').actions).toEqual(['inspect', 'discard'])
  })
})
