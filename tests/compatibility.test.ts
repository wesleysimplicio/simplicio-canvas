import { describe, expect, it } from 'vitest'
import { checkCompatibility, portFor, snapPoint } from '../src/domain/compatibility'
describe('port compatibility and snapping', () => {
  it('accepts a controller request to a use-case command', () => { expect(checkCompatibility(portFor('controller', 'a', 'output'), portFor('use-case', 'b', 'input')).compatible).toBe(true) })
  it('explains incompatible and self connections', () => { expect(checkCompatibility(portFor('entity', 'a', 'output'), portFor('screen', 'b', 'input')).reason).toMatch(/not compatible/); expect(checkCompatibility(portFor('service', 'a', 'output'), portFor('service', 'a', 'input')).reason).toMatch(/itself/) })
  it('snaps only within threshold', () => { expect(snapPoint({ x: 0, z: 0 }, { x: .2, z: .2 }).snapped).toBe(true); expect(snapPoint({ x: 0, z: 0 }, { x: 2, z: 2 }).snapped).toBe(false) })
})
