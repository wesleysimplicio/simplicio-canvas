#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'

const repair = process.argv.includes('--repair')
const dryRun = process.argv.includes('--dry-run') || !repair
const root = dirname(new URL(import.meta.url).pathname)
const repo = dirname(root)
const command = (name) => {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null
}
const skillCandidates = [
  join(repo, '.claude', 'skills', 'simplicio-loop', 'SKILL.md'),
  join(repo, '.agents', 'skills', 'simplicio-loop', 'SKILL.md'),
  join(repo, '..', 'simplicio-loop', '.claude', 'skills', 'simplicio-loop', 'SKILL.md'),
  join(repo, '..', 'simplicio-loop', '.agents', 'skills', 'simplicio-loop', 'SKILL.md'),
  join(homedir(), '.claude', 'skills', 'simplicio-loop', 'SKILL.md'),
  join(homedir(), '.agents', 'skills', 'simplicio-loop', 'SKILL.md'),
]
const mapper = command('simplicio-mapper')
const loop = command('simplicio-loop')
const skill = skillCandidates.find((candidate) => existsSync(candidate)) ?? null
const receipt = {
  schema: 'simplicio-canvas.bootstrap/v1',
  platform: platform(),
  mode: dryRun ? 'dry-run' : 'repair',
  mapper: { available: Boolean(mapper), path: mapper, version: mapper ? spawnSync(mapper, ['--version'], { encoding: 'utf8' }).stdout.trim() : null },
  loop: { available: Boolean(loop), path: loop, version: loop ? spawnSync(loop, ['--version'], { encoding: 'utf8' }).stdout.trim() : null },
  skill: { available: Boolean(skill), path: skill },
  defaultExample: 'wesleysimplicio/simplicio-loop',
  nextAction: mapper && loop && skill ? 'ready' : 'run: python3 -m pip install simplicio-cli simplicio-loop',
}
if (!dryRun && receipt.nextAction !== 'ready') {
  const install = spawnSync('python3', ['-m', 'pip', 'install', '--user', 'simplicio-cli', 'simplicio-loop'], { stdio: 'inherit' })
  if (install.status !== 0) process.exit(install.status ?? 1)
}
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`)
