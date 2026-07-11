export const ACTIVE_LOCALES = ['en', 'pt-BR', 'es', 'zh-CN'] as const
export type Locale = typeof ACTIVE_LOCALES[number]
export const ALL_LOCALES = [
  { code: 'en', label: 'English' }, { code: 'pt-BR', label: 'Português' }, { code: 'es', label: 'Español' }, { code: 'zh-CN', label: '简体中文' },
  { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' }, { code: 'it', label: 'Italiano' }, { code: 'ja', label: '日本語' }, { code: 'ko', label: '한국어' }, { code: 'ru', label: 'Русский' }, { code: 'pl', label: 'Polski' }, { code: 'tr', label: 'Türkçe' }, { code: 'nl', label: 'Nederlands' }, { code: 'hi', label: 'हिन्दी' }, { code: 'ar', label: 'العربية' },
] as const
const messages: Record<Locale, Record<string, string>> = {
  en: { github: '⑂ GITHUB', importMap: 'IMPORT MAP', openFolder: 'OPEN FOLDER', reset: 'EXAMPLE SIMPLICIO-LOOP', explorer: 'EXPLORER', layers: 'LAYERS', languages: 'LANGUAGES', pieces: 'PIECES', telemetry: 'PROJECT TELEMETRY', files: 'files', connections: 'connections', flows: 'README flows', layersCount: 'layers', inspector: 'INSPECTOR', selectPiece: 'Select a piece', terminal: 'TERMINAL', localFirst: 'LOCAL-FIRST' },
  'pt-BR': { github: '⑂ GITHUB', importMap: 'IMPORTAR MAPA', openFolder: 'ABRIR PASTA', reset: 'EXEMPLO SIMPLICIO-LOOP', explorer: 'EXPLORER', layers: 'CAMADAS', languages: 'LINGUAGENS', pieces: 'PEÇAS', telemetry: 'TELEMETRIA DO PROJETO', files: 'arquivos', connections: 'conexões', flows: 'fluxos README', layersCount: 'camadas', inspector: 'INSPECTOR', selectPiece: 'Selecione uma peça', terminal: 'TERMINAL', localFirst: 'LOCAL-FIRST' },
  es: { github: '⑂ GITHUB', importMap: 'IMPORTAR MAPA', openFolder: 'ABRIR CARPETA', reset: 'EJEMPLO SIMPLICIO-LOOP', explorer: 'EXPLORADOR', layers: 'CAPAS', languages: 'IDIOMAS', pieces: 'PIEZAS', telemetry: 'TELEMETRÍA DEL PROYECTO', files: 'archivos', connections: 'conexiones', flows: 'flujos README', layersCount: 'capas', inspector: 'INSPECTOR', selectPiece: 'Selecciona una pieza', terminal: 'TERMINAL', localFirst: 'LOCAL-FIRST' },
  'zh-CN': { github: '⑂ GITHUB', importMap: '导入映射', openFolder: '打开文件夹', reset: 'SIMPLICIO-LOOP 示例', explorer: '资源管理器', layers: '层', languages: '语言', pieces: '组件', telemetry: '项目遥测', files: '文件', connections: '连接', flows: 'README 流程', layersCount: '层', inspector: '检查器', selectPiece: '选择一个组件', terminal: '终端', localFirst: '本地优先' },
}
export function localeLabel(locale: string) { return ALL_LOCALES.find((item) => item.code === locale)?.label ?? locale }
export function t(locale: Locale, key: string) { return messages[locale][key] ?? messages.en[key] ?? key }
