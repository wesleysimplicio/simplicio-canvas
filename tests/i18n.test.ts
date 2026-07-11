import { describe, expect, it } from 'vitest'
import { ACTIVE_LOCALES, ALL_LOCALES, localeLabel, t } from '../src/domain/i18n'

describe('Canvas UI locales', () => {
  it('activates all fifteen supported Simplicio locales', () => {
    expect(ACTIVE_LOCALES).toHaveLength(15)
    expect(ACTIVE_LOCALES).toEqual(expect.arrayContaining(['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh-CN', 'ru', 'pl', 'tr', 'nl', 'hi', 'ar']))
    expect(ALL_LOCALES).toHaveLength(15)
  })

  it('keeps every locale mapped while translating core launch labels', () => {
    expect(ALL_LOCALES.filter((locale) => !ACTIVE_LOCALES.some((active) => active === locale.code))).toHaveLength(0)
    expect(localeLabel('zh-CN')).toBe('简体中文')
    expect(t('pt-BR', 'openFolder')).toBe('ABRIR PASTA')
    expect(t('es', 'openFolder')).toBe('ABRIR CARPETA')
  })
})
