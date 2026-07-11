import { describe, expect, it } from 'vitest'
import { completeInsightTiming, FIRST_INSIGHT_BUDGET_MS, startInsightTiming } from '../src/domain/onboarding-metrics'

describe('local onboarding time-to-first-insight metric', () => {
  it('records only duration and insight category, never source content', () => { const result = completeInsightTiming(startInsightTiming(100), 'flow-focused', 1_250); expect(result).toMatchObject({ durationMs: 1_150, withinBudget: true, insight: 'flow-focused' }); expect(JSON.stringify(result)).not.toMatch(/password|sourceBody|path/i) })
  it('marks slow first insight without blocking onboarding', () => { expect(completeInsightTiming(startInsightTiming(0), 'project-loaded', FIRST_INSIGHT_BUDGET_MS + 1).withinBudget).toBe(false) })
})
