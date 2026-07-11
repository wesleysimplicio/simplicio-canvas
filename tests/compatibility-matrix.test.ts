import { describe, expect, it } from 'vitest'
import matrix from '../fixtures/compatibility-matrix.json'

describe('public compatibility matrix contract', () => {
  it('covers representative Python, TypeScript, .NET, Java and polyglot repositories', () => {
    expect(matrix.schema).toBe('simplicio-canvas-compatibility-matrix'); expect(matrix.repositories.length).toBeGreaterThanOrEqual(5)
    expect(new Set(matrix.repositories.map((entry) => entry.stack))).toEqual(new Set(['Python', 'TypeScript', '.NET', 'Java', 'polyglot']))
    expect(matrix.repositories.every((entry) => /^(verified|partial|planned)$/.test(entry.status))).toBe(true)
  })
  it('stores metadata only and never redistributes repository source', () => {
    expect(matrix.repositories.every((entry) => entry.sourcePolicy === 'metadata-only' && /^\w[\w.-]+\/\w[\w.-]+$/.test(entry.repository))).toBe(true)
  })
})
