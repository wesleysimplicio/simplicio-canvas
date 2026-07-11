import { describe, expect, it } from 'vitest'
import { SIMPLICIO_LOOP_FILES } from '../src/example'

describe('bundled simplicio-loop example', () => {
  it('contains safe source text for every rendered example file', () => {
    expect(SIMPLICIO_LOOP_FILES.length).toBeGreaterThan(5)
    expect(SIMPLICIO_LOOP_FILES.every((file) => file.path && file.content && file.size > 0)).toBe(true)
    expect(SIMPLICIO_LOOP_FILES.some((file) => file.content.includes('import '))).toBe(true)
  })
})
