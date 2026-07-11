export type WorkspaceEvent = { path: string; kind: 'create' | 'change' | 'delete' | 'rename'; oldPath?: string }
export type WorkspaceScanner = (events: WorkspaceEvent[]) => void | Promise<void>

/** Coalesces bursts from editor file watchers; source truth remains on disk. */
export class IncrementalWorkspaceWatcher {
  private queue = new Map<string, WorkspaceEvent>()
  private timer: ReturnType<typeof setTimeout> | undefined
  constructor(private readonly scan: WorkspaceScanner, private readonly debounceMs = 50) {}
  enqueue(event: WorkspaceEvent): void {
    this.queue.set(event.path, event)
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; void this.flush() }, this.debounceMs)
  }
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined }
    const events = Array.from(this.queue.values()); this.queue.clear()
    if (events.length) await this.scan(events)
  }
  dispose(): void { if (this.timer) clearTimeout(this.timer); this.timer = undefined; this.queue.clear() }
}
