import type { MaybePromise } from './common.js'

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
  configuration?:
    | Record<string, unknown>
    | ((section: string | undefined) => unknown)
  capabilities?: Record<string, unknown>
  resolvePackage?: (spec: TinymistPackageSpec) => string | undefined
}
