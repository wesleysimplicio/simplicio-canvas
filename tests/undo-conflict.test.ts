import { describe, expect, it } from 'vitest'
import { canUndo, snapshotFiles, restoreSnapshot } from '../src/domain/undo-conflict'
describe('checkpoint and conflict recovery', () => { it('restores exact bytes and blocks concurrent edits', () => { const checkpoint = snapshotFiles([{ path: 'a.ts', content: 'before' }], 'cp'); expect(canUndo(checkpoint, [{ path: 'a.ts', content: 'changed' }]).allowed).toBe(false); expect(restoreSnapshot(checkpoint, [{ path: 'a.ts', content: 'changed' }])).toEqual([{ path: 'a.ts', content: 'before' }]) }) })
