import { readFile } from 'node:fs/promises'

const readiness = JSON.parse(await readFile(new URL('../fixtures/release-readiness.json', import.meta.url), 'utf8'))
const evidence = JSON.parse(await readFile(new URL('../fixtures/compatibility-evidence.json', import.meta.url), 'utf8'))
const required = ['security', 'privacy', 'performance', 'accessibility', 'compatibility', 'recovery', 'distribution']
const ids = new Set(readiness.categories.map((category) => category.id))
if (readiness.schema !== 'simplicio-canvas-readiness/v1' || required.some((id) => !ids.has(id))) throw new Error('readiness scorecard is incomplete')
if (readiness.categories.some((category) => !category.evidence || !category.boundary)) throw new Error('every readiness category requires evidence and a boundary')
if (readiness.categories.find((category) => category.id === 'compatibility')?.status !== 'partial') throw new Error('compatibility must remain partial until real nightly scans complete')
if (readiness.categories.find((category) => category.id === 'distribution')?.status !== 'partial') throw new Error('distribution must remain partial until signed desktop artifacts complete')
if (evidence.schema !== 'simplicio-canvas-compatibility-evidence/v1' || !evidence.captures.some((capture) => capture.repository === 'wesleysimplicio/simplicio-loop' && capture.status === 'verified')) throw new Error('verified simplicio-loop evidence is missing')
console.log(`readiness verified: ${required.length} categories; ${evidence.captures.length} evidence captures; remaining gates are explicit`)
