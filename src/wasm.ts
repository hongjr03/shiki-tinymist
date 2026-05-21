import type {
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
  readonly #server: TinymistLanguageServerInstance

  constructor(module: TinymistWasmModule, options: TinymistWasmProviderOptions) {
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
    await this.#request('initialize', {
      processId: null,
      rootUri: this.#options.rootUri ?? rootUriFromDocumentUri(input.uri),
      capabilities: this.#options.capabilities ?? {},
      initializationOptions: this.#options.initializationOptions ?? {},
    })

    this.#notification('initialized', {})
    this.#notification('textDocument/didOpen', {
      textDocument: {
        uri: input.uri,
        languageId: 'typst',
        version: 1,
        text: input.code,
      },
    })

    const hovers = await Promise.all(
      input.markers.map(async (marker): Promise<TinymistHover> => {
        const response = await this.#request('textDocument/hover', {
          textDocument: { uri: input.uri },
          position: {
            line: marker.line - 1,
            character: marker.column - 1,
          },
        })
        const range = normalizeHoverRange(response)

        return {
          markerId: marker.id,
          markdown: stringifyHover(response),
          ...(range ?? {}),
        }
      }),
    )

    this.#notification('textDocument/didClose', {
      textDocument: { uri: input.uri },
    })

    return {
      hovers,
      diagnostics: this.#diagnostics.get(input.uri) ?? [],
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

    this.#diagnostics.set(
      params.uri,
      params.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic)),
    )
  }
}

async function loadTinymist(
  options: TinymistWasmProviderOptions,
): Promise<TinymistWasmModule> {
  const module = options.module ?? (await importTinymist())
  const moduleOrPath =
    options.moduleOrPath === undefined
      ? await tryReadNodeTinymistWasm()
      : options.moduleOrPath

  if (options.init === false) {
    return module
  }

  if (options.init === 'sync' && module.initSync) {
    module.initSync(moduleOrPath)
    return module
  }

  if (module.default) {
    await module.default(
      moduleOrPath === undefined ? undefined : { module_or_path: moduleOrPath },
    )
  }

  return module
}

async function tryReadNodeTinymistWasm(): Promise<Uint8Array | undefined> {
  if (!isNodeRuntime()) {
    return undefined
  }

  try {
    const [{ createRequire }, { readFile }, path] = await Promise.all([
      import('node:module'),
      import('node:fs/promises'),
      import('node:path'),
    ])
    const require = createRequire(import.meta.url)
    const entry = require.resolve('tinymist')
    return await readFile(path.join(path.dirname(entry), 'tinymist_bg.wasm'))
  } catch {
    return undefined
  }
}

function isNodeRuntime(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.versions === 'object' &&
    typeof process.versions.node === 'string'
  )
}

async function importTinymist(): Promise<TinymistWasmModule> {
  try {
    return (await import('tinymist')) as TinymistWasmModule
  } catch (error) {
    throw new Error(
      `Failed to import optional peer dependency tinymist: ${errorMessage(error)}`,
    )
  }
}

function stringifyHover(response: unknown): string {
  if (!response || typeof response !== 'object') {
    return ''
  }

  const contents = (response as { contents?: unknown }).contents
  return stringifyMarkup(contents)
}

function normalizeHoverRange(
  response: unknown,
): Pick<TinymistHover, 'line' | 'column' | 'length'> | undefined {
  const range = (response as {
    range?: {
      start?: { line?: unknown; character?: unknown }
      end?: { line?: unknown; character?: unknown }
    }
  } | null)?.range

  const startLine = range?.start?.line
  const startCharacter = range?.start?.character
  const endLine = range?.end?.line
  const endCharacter = range?.end?.character

  if (
    typeof startLine !== 'number' ||
    typeof startCharacter !== 'number' ||
    typeof endLine !== 'number' ||
    typeof endCharacter !== 'number' ||
    startLine !== endLine
  ) {
    return undefined
  }

  return {
    line: startLine + 1,
    column: startCharacter + 1,
    length: Math.max(1, endCharacter - startCharacter),
  }
}

function stringifyMarkup(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(stringifyMarkup).filter(Boolean).join('\n\n')
  }

  if (value && typeof value === 'object') {
    const objectValue = value as { value?: unknown }
    if (typeof objectValue.value === 'string') {
      return objectValue.value
    }
  }

  return ''
}

function normalizeDiagnostic(value: unknown): TinymistDiagnostic {
  const diagnostic = value as {
    range?: { start?: { line?: number; character?: number } }
    message?: string
    severity?: number
  }

  const normalized: TinymistDiagnostic = {
    line: (diagnostic.range?.start?.line ?? 0) + 1,
    column: (diagnostic.range?.start?.character ?? 0) + 1,
    message: diagnostic.message ?? '',
  }
  const severity = normalizeSeverity(diagnostic.severity)
  if (severity) {
    normalized.severity = severity
  }
  return normalized
}

function normalizeSeverity(
  severity: number | undefined,
): TinymistDiagnostic['severity'] {
  if (severity === 1) return 'error'
  if (severity === 2) return 'warning'
  if (severity === 3) return 'information'
  if (severity === 4) return 'hint'
  return undefined
}

function getConfigurationItems(params: unknown): Array<{ section?: string }> {
  const items = (params as { items?: unknown } | undefined)?.items
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => {
    const section = (item as { section?: unknown }).section
    return typeof section === 'string' ? { section } : {}
  })
}

function throwIfLspError(value: unknown): void {
  if (!value || typeof value !== 'object') {
    return
  }

  const maybeError = value as { code?: unknown; message?: unknown }
  if (typeof maybeError.code === 'number' && typeof maybeError.message === 'string') {
    throw new Error(`Tinymist LSP error ${maybeError.code}: ${maybeError.message}`)
  }
}

function rootUriFromDocumentUri(documentUri: string): string | null {
  if (documentUri.startsWith('file://')) {
    const lastSlash = documentUri.lastIndexOf('/')
    return lastSlash > 'file://'.length
      ? documentUri.slice(0, lastSlash)
      : documentUri
  }

  return null
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
