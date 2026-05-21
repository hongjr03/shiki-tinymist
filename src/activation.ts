import type { TransformerTinymistOptions } from './types.js'

export const defaultTinymistLangs = ['typ', 'typst']
export const defaultTinymistTrigger = /\b(?:tinymist|typst-lsp)\b/
export const defaultTinymistDisableTriggers = [
  'notinymist',
  'no-tinymist',
  'notypst-lsp',
  'no-typst-lsp',
]
export const defaultTinymistLangAlias: Record<string, string> = {
  typ: 'typst',
}

export interface TinymistActivationOptions {
  langs?: string[]
  explicitTrigger?: boolean
  trigger?: RegExp
  disableTriggers?: (string | RegExp)[]
}

export interface TinymistActivationInput {
  lang: string | undefined
  meta: string
}

export interface TinymistTransformActivationInput
  extends TinymistActivationInput {
  code: string
  codeOptions: unknown
  context: unknown
}

export function normalizeTinymistLanguage(
  language: unknown,
  langAlias: Record<string, string> = defaultTinymistLangAlias,
): string | undefined {
  if (typeof language !== 'string') {
    return undefined
  }

  return langAlias[language] ?? language
}

export function shouldActivateTinymist(
  input: TinymistActivationInput,
  options: TinymistActivationOptions = {},
): boolean {
  const langs = options.langs ?? defaultTinymistLangs
  const lang = input.lang?.toLowerCase()
  const enabledByLang = !!lang && langs.includes(lang)
  const trigger = options.trigger ?? defaultTinymistTrigger
  const enabledByTrigger =
    !options.explicitTrigger || testPattern(trigger, input.meta)
  const disabled = hasDisableTrigger(
    input.meta,
    options.disableTriggers ?? defaultTinymistDisableTriggers,
  )

  return enabledByLang && enabledByTrigger && !disabled
}

export function shouldTransformTinymistBlock(
  input: TinymistTransformActivationInput,
  options: TransformerTinymistOptions,
): boolean {
  if (options.filter) {
    return options.filter(
      input.lang ?? '',
      input.code,
      input.codeOptions,
      input.context,
    )
  }

  return shouldActivateTinymist(input, options)
}

function hasDisableTrigger(
  meta: string,
  disableTriggers: (string | RegExp)[],
): boolean {
  return disableTriggers.some((item) => {
    return typeof item === 'string' ? meta.includes(item) : testPattern(item, meta)
  })
}

function testPattern(pattern: RegExp, input: string): boolean {
  pattern.lastIndex = 0
  return pattern.test(input)
}
