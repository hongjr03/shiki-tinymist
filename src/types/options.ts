import type { TinymistShikiReturn } from './annotation.js'
import type { TinymistProvider, TinymistQueryResult } from './query.js'
import type { TinymistRendererHooks } from './renderer.js'

export interface TransformerTinymistOptions {
  langs?: string[]
  explicitTrigger?: boolean
  trigger?: RegExp
  disableTriggers?: (string | RegExp)[]
  langAlias?: Record<string, string>
  filter?: (
    lang: string,
    code: string,
    options: unknown,
    context?: unknown,
  ) => boolean
  renderer?: TinymistRendererHooks
  documentUri?: string | ((code: string) => string)
  result?: TinymistShikiReturn
  queryResult?: TinymistQueryResult
  throws?: boolean
  onTinymistError?: (
    error: unknown,
    code: string,
    lang: string,
  ) => string | void
  onShikiError?: (error: unknown, code: string, lang: string) => void
}

export interface CreateTinymistTransformerOptions extends Omit<
  TransformerTinymistOptions,
  'queryResult'
> {
  provider?: TinymistProvider
}
