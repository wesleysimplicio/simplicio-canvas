import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

describe('WebGL instancing benchmark contract', () => {
  it('builds 5k renderable pieces as one InstancedMesh within the setup budget', () => {
    const started = performance.now(); const geometry = new THREE.BoxGeometry(1, .3, 1); const material = new THREE.MeshBasicMaterial(); const mesh = new THREE.InstancedMesh(geometry, material, 5_000); const transform = new THREE.Object3D()
    for (let index = 0; index < 5_000; index += 1) { transform.position.set(index % 100, 0, Math.floor(index / 100)); transform.updateMatrix(); mesh.setMatrixAt(index, transform.matrix) }
    mesh.instanceMatrix.needsUpdate = true; const elapsed = performance.now() - started
    expect(mesh.count).toBe(5_000); expect(mesh.instanceMatrix.count).toBe(5_000); expect(elapsed).toBeLessThan(500)
    console.info(`instancing benchmark: ${mesh.count.toLocaleString()} pieces in ${elapsed.toFixed(1)}ms; one draw object`)
    geometry.dispose(); material.dispose()
  })
})
