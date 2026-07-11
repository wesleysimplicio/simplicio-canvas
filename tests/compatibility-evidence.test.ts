import { describe, expect, it } from 'vitest'
import evidence from '../fixtures/compatibility-evidence.json'

describe('compatibility evidence metadata', () => {
  it('records scan, graph, diagnostics and screenshot provenance for verified captures', () => {
    expect(evidence.schema).toBe('simplicio-canvas-compatibility-evidence/v1')
    expect(evidence.captures.length).toBeGreaterThanOrEqual(2)
    for (const capture of evidence.captures) { expect(capture.scanMs).toBeGreaterThanOrEqual(0); expect(capture.nodes).toBeGreaterThan(0); expect(capture.edges).toBeGreaterThanOrEqual(0); expect(capture.flows).toBeGreaterThanOrEqual(0); expect(capture.diagnostics).toBeGreaterThanOrEqual(0); expect(capture.memoryMb).toBeGreaterThan(0); expect(capture.screenshot).toMatch(/^assets\/.+\.png$/) }
  })
  it('keeps the real simplicio-loop capture aligned with README telemetry', () => { const loop = evidence.captures.find((capture) => capture.repository === 'wesleysimplicio/simplicio-loop')!; expect(loop).toMatchObject({ nodes: 22, edges: 18, flows: 4, diagnostics: 0, status: 'verified' }) })
})
