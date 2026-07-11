import { describe, expect, it } from 'vitest'
import { DEFAULT_WORKSPACE, IDE_ACTIVITIES, nextActivity } from '../src/domain/ide-shell'

describe('VS Code-like workspace shell', () => {
  it('opens the official simplicio-loop repository as the default example', () => {
    expect(DEFAULT_WORKSPACE).toEqual({ owner: 'wesleysimplicio', repository: 'simplicio-loop', url: 'https://github.com/wesleysimplicio/simplicio-loop' })
  })

  it('offers the standard MVP activity surfaces', () => {
    expect(IDE_ACTIVITIES.map((activity) => activity.id)).toEqual(['explorer', 'search', 'source-control', 'run', 'extensions'])
  })

  it('toggles an active activity closed and opens another activity', () => {
    expect(nextActivity('explorer', 'explorer')).toBeNull()
    expect(nextActivity(null, 'search')).toBe('search')
  })
})
