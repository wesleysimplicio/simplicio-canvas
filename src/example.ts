const PATHS = [
  'adapters/vscode/extension.ts', 'adapters/cursor/install.py', 'adapters/claude/README.md',
  'simplicio_loop/cli.py', 'simplicio_loop/orchestrator.py', 'simplicio_loop/runtime/task_service.py',
  'simplicio_loop/domain/task.py', 'simplicio_loop/domain/workflow.py', 'simplicio_loop/application/run_use_case.py',
  'simplicio_loop/_bundle/skills/simplicio-loop/SKILL.md', 'hooks/loop_stop.py', 'hooks/loop_capture.py',
  'scripts/impact_audit.py', 'scripts/flow_audit.py', 'scripts/watcher_verify.py',
  'tests/test_loop_e2e.py', 'tests/test_task_anchor.py', 'tests/test_watcher_verify.py',
  'docs/ARCHITECTURE.md', 'docs/SIMPLICIO_OPERATIONAL_MANUAL.md', 'pyproject.toml', '.github/workflows/ci.yml',
]

const specific: Record<string, string> = {
  'adapters/vscode/extension.ts': `import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand('simplicio.openCanvas', () => {
    vscode.window.showInformationMessage('Opening Simplicio Canvas')
  })
  context.subscriptions.push(command)
}`,
  'simplicio_loop/domain/task.py': `from dataclasses import dataclass
from enum import Enum

class TaskStatus(str, Enum):
    READY = "ready"
    RUNNING = "running"
    DONE = "done"

@dataclass
class Task:
    id: str
    title: str
    status: TaskStatus = TaskStatus.READY`,
  'simplicio_loop/application/run_use_case.py': `from simplicio_loop.domain.task import Task, TaskStatus
from simplicio_loop.runtime.task_service import TaskService

class RunTask:
    def __init__(self, service: TaskService):
        self.service = service

    async def execute(self, task: Task) -> Task:
        task.status = TaskStatus.RUNNING
        return await self.service.run(task)`,
  'simplicio_loop/runtime/task_service.py': `from simplicio_loop.domain.task import Task, TaskStatus

class TaskService:
    async def run(self, task: Task) -> Task:
        # Runtime execution would collect evidence before completion.
        task.status = TaskStatus.DONE
        return task`,
  'docs/ARCHITECTURE.md': `# Architecture

The example demonstrates the evidence-gated execution flow:

CLI → Orchestrator → RunTask → TaskService → Task

\`\`\`mermaid
flowchart LR
  CLI --> Orchestrator --> RunTask --> TaskService --> Task
\`\`\``,
  'adapters/claude/README.md': `# Claude adapter

Prompt → Adapter → Orchestrator → Evidence → Result

This is representative demo content bundled with Simplicio Canvas.`,
  'pyproject.toml': `[project]
name = "simplicio-loop-demo"
version = "0.1.0"
requires-python = ">=3.11"

[tool.pytest.ini_options]
testpaths = ["tests"]`,
  '.github/workflows/ci.yml': `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python -m pytest`,
}

function fallback(path: string): string {
  if (path.endsWith('.md')) return `# ${path.split('/').pop()}\n\nRepresentative documentation for the Simplicio Canvas demo.`
  if (path.includes('/test_') || path.startsWith('tests/')) return `from simplicio_loop.domain.task import Task\n\ndef test_example_contract():\n    assert Task(id="T1", title="Demo").id == "T1"`
  if (path.endsWith('.py')) return `from simplicio_loop.domain.task import Task\n\ndef inspect(task: Task) -> str:\n    return task.id`
  return `// Representative source bundled for the visual demo.\nexport const moduleName = ${JSON.stringify(path)}\n`
}

export const SIMPLICIO_LOOP_FILES = PATHS.map((path) => {
  const content = specific[path] ?? fallback(path)
  return { path, content, size: content.length }
})

export const SIMPLICIO_LOOP_PATHS = SIMPLICIO_LOOP_FILES.map((file) => file.path)
