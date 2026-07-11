import { describe, expect, it } from 'vitest'
import { editorMode } from '../src/domain/project-access'

describe('project editor access', () => {
  it('enables disk saving only when a writable handle exists for the selected file', () => {
    expect(editorMode('src/main.ts', new Set(['src/main.ts']))).toBe('writable')
    expect(editorMode('src/main.ts', new Set())).toBe('download-only')
  })
})
