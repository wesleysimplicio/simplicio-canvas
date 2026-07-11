#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const checks = ['test', 'build', 'build:extension', 'verify:pwa']
for (const check of checks) {
  const result = spawnSync('npm', ['run', check], { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
process.stdout.write(JSON.stringify({ schema: 'simplicio-canvas.release-verification/v1', checks, passed: true }) + '\n')
