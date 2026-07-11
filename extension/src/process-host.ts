import type { ProcessRunner, TerminalRequest } from '../../src/domain/terminal-adapter'

export interface HostProcessHandle { kill(): void }
export interface ProcessFactory { spawn(request: TerminalRequest, onData: (chunk: string) => void, onExit: (exitCode: number) => void): HostProcessHandle }

/** Bridges a trusted VS Code/Cursor PTY into the domain runner contract. */
export function createHostProcessRunner(factory: ProcessFactory): ProcessRunner {
  return (request, onChunk, signal) => new Promise<number>((resolve) => {
    let settled = false; let handle: HostProcessHandle | undefined
    const finish = (exitCode: number) => { if (!settled) { settled = true; resolve(exitCode) } }
    handle = factory.spawn(request, onChunk, finish)
    if (signal.aborted) { handle.kill(); finish(130); return }
    signal.addEventListener('abort', () => { handle?.kill(); finish(130) }, { once: true })
  })
}
