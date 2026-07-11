export type SigningTool = 'cosign' | 'minisign'
export interface SigningProviderConfig { tool: SigningTool; keyRef: string; publicKeyRef: string }
export interface SigningCommandRunner { run(command: string, args: string[], input: string): Promise<{ exitCode: number; stdout: string; stderr: string }> }
export interface SigningProvider { readonly tool: SigningTool; sign(payload: string): Promise<string>; verify(payload: string, signature: string): Promise<boolean> }

/** CI boundary: an external runner owns credentials, shell execution and key storage. */
export function createSigningProvider(config: SigningProviderConfig, runner: SigningCommandRunner): SigningProvider {
  const command = config.tool === 'cosign' ? 'cosign' : 'minisign'
  return { tool: config.tool, sign: async (payload) => { const args = config.tool === 'cosign' ? ['sign-blob', '--key', config.keyRef, '--output-signature', '-', '-'] : ['-Sm', '-', '-s', config.keyRef, '-x', '-']; const result = await runner.run(command, args, payload); if (result.exitCode !== 0 || !result.stdout.trim()) throw new Error(`${command} signing failed: ${result.stderr || 'no signature returned'}`); return result.stdout.trim() }, verify: async (payload, signature) => { const args = config.tool === 'cosign' ? ['verify-blob', '--key', config.publicKeyRef, '--signature', '-', '-'] : ['-Vm', '-', '-p', config.publicKeyRef, '-x', '-']; const result = await runner.run(command, args, `${payload}\n${signature}`); return result.exitCode === 0 } }
}
