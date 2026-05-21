import { lineKey, parseTinymistCode } from './parser.js'
import type {
  ParsedTinymistCode,
  TinymistDiagnostic,
  TinymistNode,
  TinymistQueryResult,
  TinymistShikiReturn,
} from './types.js'

export function createTinymistReturnFromCode(
  code: string,
  queryResult?: TinymistQueryResult,
): TinymistShikiReturn {
  return createTinymistReturn(parseTinymistCode(code), queryResult)
}

export function createTinymistReturn(
  parsed: ParsedTinymistCode,
  queryResult?: TinymistQueryResult,
): TinymistShikiReturn {
  const lineOffsets = getLineOffsets(parsed.code)
  const nodes: TinymistNode[] = []

  for (const marker of parsed.markers) {
    if (marker.kind === 'highlight') {
      const line = marker.line - 1
      const character = marker.column - 1
      nodes.push({
        type: 'highlight',
        line,
        character,
        length: marker.length,
        start: (lineOffsets[line] ?? 0) + character,
      })
      continue
    }

    if (marker.kind === 'completion') {
      const completion = queryResult?.completions?.find(
        (item) => item.markerId === marker.id,
      )
      if (!completion?.items.length) {
        continue
      }

      const line =
        resolveOutputLine(
          parsed,
          completion.fileName ?? marker.fileName,
          completion.line ?? marker.queryLine,
          marker.line,
        ) - 1
      const character = (completion.column ?? marker.column) - 1
      nodes.push({
        type: 'completion',
        markerId: marker.id,
        line,
        character,
        length: 0,
        start: (lineOffsets[line] ?? 0) + character,
        items: completion.items,
      })
      continue
    }

    const hover = queryResult?.hovers.find(
      (item) => item.markerId === marker.id,
    )
    if (!hover?.markdown && !marker.label) {
      continue
    }

    const line =
      resolveOutputLine(
        parsed,
        hover?.fileName ?? marker.fileName,
        hover?.line ?? marker.queryLine,
        marker.line,
      ) - 1
    const character = (hover?.column ?? marker.column) - 1
    const length = hover?.length ?? marker.length
    nodes.push({
      type: 'hover',
      markerId: marker.id,
      line,
      character,
      length,
      start: (lineOffsets[line] ?? 0) + character,
      markdown: hover?.markdown ?? marker.label ?? '',
      ...(hover?.plainText ? { plainText: hover.plainText } : {}),
    })
  }

  for (const diagnostic of filterDiagnostics(
    parsed,
    queryResult?.diagnostics ?? [],
  )) {
    const outputLine = resolveDiagnosticOutputLine(parsed, diagnostic)
    if (!outputLine) {
      continue
    }

    const line = outputLine - 1
    const character = diagnostic.column - 1
    nodes.push({
      type: 'diagnostic',
      line,
      character,
      length: diagnostic.length ?? 1,
      start: (lineOffsets[line] ?? 0) + character,
      message: diagnostic.message,
      ...(diagnostic.severity ? { severity: diagnostic.severity } : {}),
    })
  }

  return {
    code: parsed.code,
    nodes,
    meta: {
      extension: 'typst',
    },
  }
}

function resolveOutputLine(
  parsed: ParsedTinymistCode,
  fileName: string | undefined,
  queryLine: number | undefined,
  fallbackLine: number,
): number {
  if (fileName && queryLine) {
    return (
      parsed.queryLineToOutputLine[lineKey(fileName, queryLine)] ?? fallbackLine
    )
  }

  return fallbackLine
}

function isOutputLineVisible(
  parsed: ParsedTinymistCode,
  line: number,
): boolean {
  return line >= 1 && line <= parsed.code.split('\n').length
}

function resolveDiagnosticOutputLine(
  parsed: ParsedTinymistCode,
  diagnostic: TinymistDiagnostic,
): number | undefined {
  const fileNames = diagnostic.fileName
    ? [diagnostic.fileName]
    : parsed.files.map((file) => file.fileName)

  for (const fileName of fileNames) {
    const outputLine =
      parsed.queryLineToOutputLine[lineKey(fileName, diagnostic.line)]
    if (outputLine && isOutputLineVisible(parsed, outputLine)) {
      return outputLine
    }
  }

  return undefined
}

function filterDiagnostics(
  parsed: ParsedTinymistCode,
  diagnostics: TinymistDiagnostic[],
): TinymistDiagnostic[] {
  if (parsed.diagnosticsMode === 'hide') {
    return []
  }

  if (parsed.diagnosticsMode !== 'expect') {
    return diagnostics
  }

  return diagnostics.filter((diagnostic) => {
    const text = [diagnostic.code, diagnostic.message]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return parsed.expectedErrors.some((expected) => {
      return text.includes(expected.toLowerCase())
    })
  })
}

function getLineOffsets(code: string): number[] {
  const offsets = [0]
  for (let index = 0; index < code.length; index += 1) {
    if (code[index] === '\n') {
      offsets.push(index + 1)
    }
  }
  return offsets
}
