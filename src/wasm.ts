import type {
  TinymistCompletion,
  TinymistDiagnostic,
  TinymistHover,
  TinymistLanguageServerInstance,
  TinymistPackageSpec,
  TinymistProvider,
  TinymistQueryInput,
  TinymistQueryResult,
  TinymistWasmModule,
  TinymistWasmNotification,
  TinymistWasmProviderOptions,
  TinymistWasmServerRequest,
} from './types.js'
import { loadTinymist } from './wasm/loader.js'
import {
  getConfigurationItems,
  normalizeCompletionItems,
  normalizeDiagnostic,
  normalizeHoverRange,
  normalizeQueryFiles,
  resolveMarkerUri,
  rootUriFromDocumentUri,
  stringifyHover,
  throwIfLspError,
} from './wasm/protocol.js'

export function createTinymistWasmProvider(
  options: TinymistWasmProviderOptions = {},
): TinymistProvider {
  let modulePromise: Promise<TinymistWasmModule> | undefined

  return {
    async query(input) {
      modulePromise ??= loadTinymist(options)
      const module = await modulePromise
      const session = new TinymistWasmSession(module, options)
      return session.query(input)
    },
  }
}

class TinymistWasmSession {
  readonly #options: TinymistWasmProviderOptions
  readonly #events: number[] = []
  readonly #diagnostics = new Map<string, TinymistDiagnostic[]>()
  readonly #uriToFileName = new Map<string, string>()
  readonly #server: TinymistLanguageServerInstance

  constructor(
    module: TinymistWasmModule,
    options: TinymistWasmProviderOptions,
  ) {
    this.#options = options

    const Server = module.TinymistLanguageServer
    if (!Server) {
      throw new Error(
        'The tinymist WASM module does not expose TinymistLanguageServer. Build Tinymist >= 0.14.18 with wasm-pack, or pass a compatible module to createTinymistWasmProvider({ module }).',
      )
    }

    let server: TinymistLanguageServerInstance | undefined
    server = new Server({
      sendEvent: (event) => {
        this.#events.push(event)
      },
      sendRequest: (request) => {
        Promise.resolve().then(() => {
          this.#handleServerRequest(request, server)
        })
      },
      sendNotification: (notification) => {
        this.#handleServerNotification(notification)
      },
      resolveFn: (spec) => this.#resolvePackage(spec),
    })

    this.#server = server
  }

  async query(input: TinymistQueryInput): Promise<TinymistQueryResult> {
    const files = normalizeQueryFiles(input)
    await this.#request('initialize', {
      processId: null,
      rootUri: this.#options.rootUri ?? rootUriFromDocumentUri(input.uri),
      capabilities: this.#options.capabilities ?? {},
      initializationOptions: this.#options.initializationOptions ?? {},
    })

    this.#notification('initialized', {})
    for (const file of files) {
      this.#uriToFileName.set(file.uri, file.fileName)
      this.#notification('textDocument/didOpen', {
        textDocument: {
          uri: file.uri,
          languageId: 'typst',
          version: 1,
          text: file.code,
        },
      })
    }

    const hovers = await Promise.all(
      input.markers
        .filter((marker) => marker.kind === 'hover')
        .map(async (marker): Promise<TinymistHover> => {
          const response = await this.#request('textDocument/hover', {
            textDocument: { uri: resolveMarkerUri(files, input.uri, marker) },
            position: {
              line: (marker.queryLine ?? marker.line) - 1,
              character: (marker.queryColumn ?? marker.column) - 1,
            },
          })
          const range = normalizeHoverRange(response)

          return {
            markerId: marker.id,
            markdown: stringifyHover(response),
            ...(marker.fileName ? { fileName: marker.fileName } : {}),
            ...(range ?? {}),
          }
        }),
    )

    const completions = await Promise.all(
      input.markers
        .filter((marker) => marker.kind === 'completion')
        .map(async (marker): Promise<TinymistCompletion> => {
          const response = await this.#request('textDocument/completion', {
            textDocument: { uri: resolveMarkerUri(files, input.uri, marker) },
            position: {
              line: (marker.queryLine ?? marker.line) - 1,
              character: (marker.queryColumn ?? marker.column) - 1,
            },
          })

          return {
            markerId: marker.id,
            ...(marker.fileName ? { fileName: marker.fileName } : {}),
            line: marker.queryLine ?? marker.line,
            column: marker.queryColumn ?? marker.column,
            items: normalizeCompletionItems(response),
          }
        }),
    )

    for (const file of [...files].reverse()) {
      this.#notification('textDocument/didClose', {
        textDocument: { uri: file.uri },
      })
    }

    return {
      hovers,
      completions,
      diagnostics: [...this.#diagnostics.values()].flat(),
    }
  }

  async #request(method: string, params: unknown): Promise<unknown> {
    const response = this.#server.on_request(method, params)
    const resolved = await Promise.resolve(response)
    this.#drainEvents()
    throwIfLspError(resolved)
    return resolved
  }

  #notification(method: string, params: unknown): void {
    this.#server.on_notification(method, params)
    this.#drainEvents()
  }

  #drainEvents(): void {
    while (this.#events.length > 0) {
      const event = this.#events.shift()
      if (event !== undefined) {
        this.#server.on_event(event)
      }
    }
  }

  #handleServerRequest(
    request: TinymistWasmServerRequest,
    server: TinymistLanguageServerInstance | undefined,
  ): void {
    if (!server) {
      return
    }

    server.on_response({
      id: request.id,
      result: this.#serverRequestResult(request),
    })
    this.#drainEvents()
  }

  #serverRequestResult(request: TinymistWasmServerRequest): unknown {
    if (request.method === 'workspace/configuration') {
      const items = getConfigurationItems(request.params)
      return items.map((item) => this.#resolveConfiguration(item.section))
    }

    return null
  }

  #resolveConfiguration(section: string | undefined): unknown {
    const configuration = this.#options.configuration ?? {}
    if (typeof configuration === 'function') {
      return configuration(section)
    }

    if (section && section in configuration) {
      return configuration[section]
    }

    return configuration
  }

  #resolvePackage(spec: TinymistPackageSpec): string | undefined {
    return this.#options.resolvePackage?.(spec)
  }

  #handleServerNotification(notification: TinymistWasmNotification): void {
    if (notification.method !== 'textDocument/publishDiagnostics') {
      return
    }

    const params = notification.params as
      | { uri?: unknown; diagnostics?: unknown }
      | undefined

    if (typeof params?.uri !== 'string' || !Array.isArray(params.diagnostics)) {
      return
    }

    const uri = params.uri
    this.#diagnostics.set(
      uri,
      params.diagnostics.map((diagnostic) =>
        normalizeDiagnostic(diagnostic, this.#uriToFileName.get(uri)),
      ),
    )
  }
}
