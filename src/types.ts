export type MaybePromise<T> = T | Promise<T>

export interface TinymistMarker {
  id: string
  line: number
  column: number
  length: number
  kind: 'hover'
  label?: string
}

export interface ParsedTinymistCode {
  code: string
  markers: TinymistMarker[]
}

export interface TinymistHover {
  markerId: string
  markdown: string
  plainText?: string
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
}

export interface TinymistQueryInput {
  code: string
  uri: string
  markers: TinymistMarker[]
}

export interface TinymistQueryResult {
  hovers: TinymistHover[]
  diagnostics?: TinymistDiagnostic[]
}

export type TinymistNode = TinymistHoverNode | TinymistDiagnosticNode

export interface TinymistBaseNode {
  start: number
  line: number
  character: number
  length: number
}

export interface TinymistHoverNode extends TinymistBaseNode {
  type: 'hover'
  markerId: string
  markdown: string
  plainText?: string
}

export interface TinymistDiagnosticNode extends TinymistBaseNode {
  type: 'diagnostic'
  message: string
  severity?: TinymistDiagnostic['severity']
}

export interface TinymistShikiReturn {
  code: string
  nodes: TinymistNode[]
  meta?: {
    extension?: string
  }
}

export interface TinymistProvider {
  query(input: TinymistQueryInput): MaybePromise<TinymistQueryResult>
}

export interface TinymistWasmModule {
  default?: (input?: unknown) => MaybePromise<unknown>
  initSync?: (input?: unknown) => unknown
  TinymistLanguageServer?: TinymistLanguageServerConstructor
  version?: () => string
}

export interface TinymistLanguageServerConstructor {
  new (transport: TinymistWasmTransport): TinymistLanguageServerInstance
  version?: () => string
}

export interface TinymistLanguageServerInstance {
  on_request(method: string, params: unknown): unknown
  on_notification(method: string, params: unknown): void
  on_response(response: unknown): void
  on_event(eventId: number): void
}

export interface TinymistWasmTransport {
  sendEvent(event: number): void
  sendRequest(request: TinymistWasmServerRequest): void
  sendNotification(notification: TinymistWasmNotification): void
  resolveFn(spec: TinymistPackageSpec): string | undefined
}

export interface TinymistPackageSpec {
  namespace: string
  name: string
  version: string
}

export interface TinymistWasmServerRequest {
  id: unknown
  method: string
  params?: unknown
}

export interface TinymistWasmNotification {
  method: string
  params?: unknown
}

export interface TinymistWasmProviderOptions {
  module?: TinymistWasmModule
  moduleOrPath?: unknown
  init?: 'async' | 'sync' | false
  rootUri?: string | null
  initializationOptions?: Record<string, unknown>
  configuration?: Record<string, unknown> | ((section: string | undefined) => unknown)
  capabilities?: Record<string, unknown>
  resolvePackage?: (spec: TinymistPackageSpec) => string | undefined
}

export interface TinymistRendererContext {
  marker: TinymistMarker
  hover?: TinymistHover
}

export type TinymistRenderer = (context: TinymistRendererContext) => HastNode[]

export interface TinymistRichRendererOptions {
  classExtra?: string
  lang?: string
  renderMarkdown?: (markdown: string) => HastNode[]
  hast?: {
    hoverToken?: HastExtension
    hoverPopup?: HastExtension
    popupCode?: HastExtension
    popupDocs?: HastExtension
    diagnosticToken?: HastExtension
    diagnosticLine?: HastExtension
  }
}

export interface HastExtension {
  tagName?: string
  properties?: Record<string, unknown>
  class?: string
  children?: (input: HastNode[]) => HastNode[]
}

export interface TinymistRendererHooks {
  nodeHover: (info: TinymistHoverNode, node: HastNode) => Partial<HastNode>
  nodesDiagnostic?: (
    diagnostic: TinymistDiagnosticNode,
    nodes: HastNode[],
  ) => HastNode[]
  lineDiagnostic?: (diagnostic: TinymistDiagnosticNode) => HastNode[]
}

export interface TransformerTinymistOptions {
  langs?: string[]
  explicitTrigger?: boolean
  trigger?: RegExp
  disableTriggers?: (string | RegExp)[]
  langAlias?: Record<string, string>
  filter?: (lang: string, code: string, options: unknown, context?: unknown) => boolean
  renderer?: TinymistRendererHooks
  documentUri?: string | ((code: string) => string)
  result?: TinymistShikiReturn
  queryResult?: TinymistQueryResult
  throws?: boolean
  onTinymistError?: (error: unknown, code: string, lang: string) => string | void
  onShikiError?: (error: unknown, code: string, lang: string) => void
}

export interface CreateTinymistTransformerOptions
  extends Omit<TransformerTinymistOptions, 'queryResult'> {
  provider?: TinymistProvider
}

export type HastText = {
  type: 'text'
  value: string
}

export type HastElement = {
  type: 'element'
  tagName: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

export type HastNode = HastText | HastElement
