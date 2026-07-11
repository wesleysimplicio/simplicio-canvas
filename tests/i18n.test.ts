import { describe, expect, it } from 'vitest'
import { ACTIVE_LOCALES, ALL_LOCALES, localeLabel, t } from '../src/domain/i18n'

describe('Canvas UI locales', () => {
  it('activates exactly English, Portuguese, Spanish and Simplified Chinese', () => {
    expect(ACTIVE_LOCALES).toEqual(['en', 'pt-BR', 'es', 'zh-CN'])
    expect(ALL_LOCALES).toHaveLength(15)
  })

  it('keeps future locales disabled while translating a core label', () => {
    expect(ALL_LOCALES.filter((locale) => !ACTIVE_LOCALES.includes(locale.code))).toHaveLength(11)
    expect(localeLabel('zh-CN')).toBe('简体中文')
    expect(t('pt-BR', 'openFolder')).toBe('ABRIR PASTA')
    expect(t('es', 'openFolder')).toBe('ABRIR CARPETA')
  })
})
