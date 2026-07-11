/** Lazy editor host contract. Monaco/CodeMirror adapters implement this without entering domain code. */
export interface EditorEngine { setValue(value: string): void; getValue(): string; reveal(line: number, column: number): void; dispose(): void }
export type EditorEngineLoader = () => Promise<EditorEngine>
export interface LazyEditorState { status: 'idle' | 'loading' | 'ready' | 'failed'; engine?: EditorEngine; error?: string }

export class LazyEditorHost {
  private state: LazyEditorState = { status: 'idle' }
  private loading?: Promise<EditorEngine>
  constructor(private readonly loader: EditorEngineLoader) {}
  getState(): LazyEditorState { return { ...this.state } }
  async open(content: string, line = 1, column = 1): Promise<EditorEngine> {
    if (!this.loading && !this.state.engine) { this.state = { status: 'loading' }; this.loading = this.loader().then((engine) => { this.state = { status: 'ready', engine }; return engine }).catch((error) => { this.state = { status: 'failed', error: String(error) }; throw error }) }
    const engine = this.state.engine ?? await this.loading!; engine.setValue(content); engine.reveal(Math.max(1, line), Math.max(1, column)); return engine
  }
  dispose(): void { this.state.engine?.dispose(); this.state = { status: 'idle' }; this.loading = undefined }
}
