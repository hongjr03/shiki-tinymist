import type {
  TinymistCompletionItem,
  TinymistDiagnostic,
  TinymistHover,
  TinymistQueryInput,
  TinymistVirtualFile,
} from '../types.js'

export function normalizeQueryFiles(
  input: TinymistQueryInput,
): Required<TinymistVirtualFile>[] {
  const files = input.files?.length
    ? input.files
    : [{ fileName: 'index.typ', code: input.code, uri: input.uri }]

  return files.map((file) => ({
    fileName: file.fileName,
    code: file.code,
    uri: file.uri ?? input.uri,
  }))
}

export function resolveMarkerUri(
  files: Required<TinymistVirtualFile>[],
  fallbackUri: string,
  marker: { fileName?: string },
): string {
  if (marker.fileName) {
    return (
      files.find((file) => file.fileName === marker.fileName)?.uri ??
      fallbackUri
    )
  }

  return fallbackUri
}

export function stringifyHover(response: unknown): string {
  if (!response || typeof response !== 'object') {
    return ''
  }

  const contents = (response as { contents?: unknown }).contents
  return stringifyMarkup(contents)
}

export function normalizeHoverRange(
  response: unknown,
): Pick<TinymistHover, 'line' | 'column' | 'length'> | undefined {
  const range = (
    response as {
      range?: {
        start?: { line?: unknown; character?: unknown }
        end?: { line?: unknown; character?: unknown }
      }
    } | null
  )?.range

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

export function normalizeCompletionItems(
  response: unknown,
): TinymistCompletionItem[] {
  const rawItems = Array.isArray(response)
    ? response
    : (response as { items?: unknown[] } | undefined)?.items

  if (!Array.isArray(rawItems)) {
    return []
  }

  return rawItems.flatMap((item) => {
    const normalized = normalizeCompletionItem(item)
    return normalized ? [normalized] : []
  })
}

export function normalizeDiagnostic(
  value: unknown,
  fileName: string | undefined,
): TinymistDiagnostic {
  const diagnostic = value as {
    range?: {
      start?: { line?: number; character?: number }
      end?: { line?: number; character?: number }
    }
    message?: string
    severity?: number
    code?: number | string
  }

  const normalized: TinymistDiagnostic = {
    line: (diagnostic.range?.start?.line ?? 0) + 1,
    column: (diagnostic.range?.start?.character ?? 0) + 1,
    length: Math.max(
      1,
      (diagnostic.range?.end?.character ?? 1) -
        (diagnostic.range?.start?.character ?? 0),
    ),
    message: diagnostic.message ?? '',
  }
  if (fileName) {
    normalized.fileName = fileName
  }
  if (
    typeof diagnostic.code === 'string' ||
    typeof diagnostic.code === 'number'
  ) {
    normalized.code = String(diagnostic.code)
  }
  const severity = normalizeSeverity(diagnostic.severity)
  if (severity) {
    normalized.severity = severity
  }
  return normalized
}

export function getConfigurationItems(
  params: unknown,
): Array<{ section?: string }> {
  const items = (params as { items?: unknown } | undefined)?.items
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => {
    const section = (item as { section?: unknown }).section
    return typeof section === 'string' ? { section } : {}
  })
}

export function throwIfLspError(value: unknown): void {
  if (!value || typeof value !== 'object') {
    return
  }

  const maybeError = value as { code?: unknown; message?: unknown }
  if (
    typeof maybeError.code === 'number' &&
    typeof maybeError.message === 'string'
  ) {
    throw new Error(
      `Tinymist LSP error ${maybeError.code}: ${maybeError.message}`,
    )
  }
}

export function rootUriFromDocumentUri(documentUri: string): string | null {
  if (documentUri.startsWith('file://')) {
    const lastSlash = documentUri.lastIndexOf('/')
    return lastSlash > 'file://'.length
      ? documentUri.slice(0, lastSlash)
      : documentUri
  }

  return null
}

function normalizeCompletionItem(
  value: unknown,
): TinymistCompletionItem | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const item = value as {
    label?: unknown
    kind?: unknown
    detail?: unknown
    documentation?: unknown
    deprecated?: unknown
    insertText?: unknown
  }

  if (typeof item.label !== 'string' || !item.label) {
    return undefined
  }

  const normalized: TinymistCompletionItem = {
    label: item.label,
  }

  if (typeof item.kind === 'number') {
    const kind = normalizeCompletionKind(item.kind)
    if (kind) {
      normalized.kind = kind
    }
  } else if (typeof item.kind === 'string') {
    normalized.kind = item.kind
  }

  if (typeof item.detail === 'string' && item.detail) {
    normalized.detail = item.detail
  }

  const documentation = stringifyMarkup(item.documentation)
  if (documentation) {
    normalized.documentation = documentation
  }

  if (item.deprecated === true) {
    normalized.deprecated = true
  }

  if (typeof item.insertText === 'string' && item.insertText) {
    normalized.insertText = item.insertText
  }

  return normalized
}

function normalizeCompletionKind(kind: number): string | undefined {
  return [
    undefined,
    'text',
    'method',
    'function',
    'constructor',
    'field',
    'variable',
    'class',
    'interface',
    'module',
    'property',
    'unit',
    'value',
    'enum',
    'keyword',
    'snippet',
    'color',
    'file',
    'reference',
    'folder',
    'enum-member',
    'constant',
    'struct',
    'event',
    'operator',
    'type-parameter',
  ][kind]
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

function normalizeSeverity(
  severity: number | undefined,
): TinymistDiagnostic['severity'] {
  if (severity === 1) return 'error'
  if (severity === 2) return 'warning'
  if (severity === 3) return 'information'
  if (severity === 4) return 'hint'
  return undefined
}
