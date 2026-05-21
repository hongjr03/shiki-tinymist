import {
  normalizeDiagnosticsDirectives,
  parseDirectiveLine,
} from './parser/directives.js'
import {
  applyCuts,
  parseCutDirective,
  type CutDirective,
} from './parser/cuts.js'
import { parseMarkerLine } from './parser/markers.js'
import {
  defaultFileName,
  getFile,
  lineKey,
  normalizeFileName,
  type OutputLineDraft,
  type QueryFileDraft,
} from './parser/model.js'
import type {
  ParsedTinymistCode,
  TinymistDirective,
  TinymistMarker,
  TinymistVirtualFile,
} from './types/source.js'

const defaultTriggers = ['tinymist', 'typst-lsp']

export function shouldRunTinymist(
  meta: string | undefined,
  language: string | undefined,
  explicitTrigger = false,
  triggers = defaultTriggers,
): boolean {
  const normalizedMeta = meta ?? ''
  const normalizedLanguage = (language ?? '').toLowerCase()

  if (hasTrigger(normalizedMeta, triggers)) {
    return true
  }

  if (explicitTrigger) {
    return false
  }

  return normalizedLanguage === 'typst' || normalizedLanguage === 'typ'
}

export function parseTinymistCode(source: string): ParsedTinymistCode {
  const lines = source.split(/\r?\n/)
  const files = new Map<string, QueryFileDraft>()
  const outputLines: OutputLineDraft[] = []
  const markers: TinymistMarker[] = []
  const directives: TinymistDirective[] = []
  const cuts: CutDirective[] = []

  let currentFile = getFile(files, defaultFileName)
  let nextOutputId = 1
  let markerId = 1

  for (let sourceLine = 1; sourceLine <= lines.length; sourceLine += 1) {
    const rawLine = lines[sourceLine - 1] ?? ''
    const directive = parseDirectiveLine(rawLine, sourceLine)
    const cut = parseCutDirective(rawLine, outputLines.length)

    if (cut) {
      cuts.push(cut)
      continue
    }

    if (directive) {
      directives.push(directive)

      if (directive.name === 'filename' && directive.value) {
        currentFile = getFile(files, normalizeFileName(directive.value))
        outputLines.push({
          id: nextOutputId,
          text: rawLine,
        })
        nextOutputId += 1
      }
      continue
    }

    const marker = parseMarkerLine(
      rawLine,
      outputLines[outputLines.length - 1],
      currentFile,
    )
    if (marker) {
      markers.push({
        ...marker,
        id: `m${markerId}`,
      })
      markerId += 1
      continue
    }

    currentFile.lines.push(rawLine)
    outputLines.push({
      id: nextOutputId,
      text: rawLine,
      fileName: currentFile.fileName,
      queryLine: currentFile.lines.length,
    })
    nextOutputId += 1
  }

  const visibleLines = applyCuts(outputLines, cuts)
  const outputLineById = new Map<number, number>()
  const queryLineToOutputLine: Record<string, number> = {}

  visibleLines.forEach((line, index) => {
    const outputLine = index + 1
    outputLineById.set(line.id, outputLine)

    if (line.fileName && line.queryLine) {
      queryLineToOutputLine[lineKey(line.fileName, line.queryLine)] = outputLine
    }
  })

  const visibleMarkers = markers.flatMap((marker) => {
    const outputLine = outputLineById.get(marker.line)
    if (!outputLine) {
      return []
    }

    return [
      {
        ...marker,
        line: outputLine,
      },
    ]
  })

  const parsedDirectives = normalizeDiagnosticsDirectives(directives)

  return {
    code: visibleLines.map((line) => line.text).join('\n'),
    markers: visibleMarkers,
    files: [...files.values()].map<TinymistVirtualFile>((file) => ({
      fileName: file.fileName,
      code: file.lines.join('\n'),
    })),
    directives,
    diagnosticsMode: parsedDirectives.mode,
    expectedErrors: parsedDirectives.expectedErrors,
    queryLineToOutputLine,
  }
}

function hasTrigger(meta: string, triggers: string[]): boolean {
  return triggers.some((trigger) => {
    const escaped = escapeRegExp(trigger)
    return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(meta)
  })
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export { lineKey }
