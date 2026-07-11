import { describe, expect, it } from 'vitest'
import { clusterExplorerItems, expandCluster, renderDetail, type ExplorerItem } from '../src/domain/explorer-controls'

function fixture(size = 5000): ExplorerItem[] { return Array.from({ length: size }, (_, index) => ({ id: `file:${index}`, name: `file-${index}.ts`, path: `module-${index % 25}/file-${index}.ts`, layer: index % 2 ? 'application' : 'domain', kind: 'module' })) }

describe('renderer large-graph benchmark fixture', () => {
  it('clusters and expands a deterministic 5k-node workspace within the interaction budget', () => {
    const nodes = fixture(); const started = performance.now(); const clusters = clusterExplorerItems(nodes, 500); const elapsed = performance.now() - started
    expect(nodes).toHaveLength(5000); expect(clusters).toHaveLength(25); expect(clusters.every((cluster) => cluster.items.length <= 500)).toBe(true); expect(clusters.flatMap((cluster) => expandCluster(cluster))).toHaveLength(5000)
    // This is a generous CI guard for clustering work, not a device FPS claim.
    expect(elapsed).toBeLessThan(250); expect(renderDetail(.1)).toBe('cluster'); expect(renderDetail(.8)).toBe('symbol')
    console.info(`render benchmark: 5,000 nodes -> ${clusters.length} clusters in ${elapsed.toFixed(1)}ms`)
  })
})
