export interface InsightTiming { startedAt: number; completedAt?: number; durationMs?: number; insight: 'project-loaded' | 'flow-focused' | 'source-opened'; withinBudget?: boolean }
export const FIRST_INSIGHT_BUDGET_MS = 10_000
export function startInsightTiming(now = Date.now()): InsightTiming { return { startedAt: now, insight: 'project-loaded' } }
export function completeInsightTiming(timing: InsightTiming, insight: InsightTiming['insight'], now = Date.now(), budgetMs = FIRST_INSIGHT_BUDGET_MS): InsightTiming { const durationMs = Math.max(0, now - timing.startedAt); return { ...timing, completedAt: now, durationMs, insight, withinBudget: durationMs <= budgetMs } }
