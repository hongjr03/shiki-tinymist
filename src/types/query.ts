import type { MaybePromise } from './common.js'
import type { TinymistMarker, TinymistVirtualFile } from './source.js'

export interface TinymistHover {
  markerId: string
  markdown: string
  plainText?: string
  fileName?: string
  line?: number
  column?: number
  length?: number
}

export interface TinymistDiagnostic {
  line: number
  column: number
  length?: number
  message: string
  severity?: 'error' | 'warning' | 'information' | 'hint'
  code?: string
  fileName?: string
}

export interface TinymistCompletion {
  markerId: string
  items: TinymistCompletionItem[]
  fileName?: string
  line?: number
  column?: number
}

export interface TinymistCompletionItem {
  label: string
  kind?: string
  detail?: string
  documentation?: string
  deprecated?: boolean
  insertText?: string
}

export interface TinymistQueryInput {
  code: string
  uri: string
  markers: TinymistMarker[]
  files?: TinymistVirtualFile[]
}

export interface TinymistQueryResult {
  hovers: TinymistHover[]
  completions?: TinymistCompletion[]
  diagnostics?: TinymistDiagnostic[]
}

export interface TinymistProvider {
  query(input: TinymistQueryInput): MaybePromise<TinymistQueryResult>
}
