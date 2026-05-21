import type {
  ParsedTinymistCode,
  TinymistDirective,
  TinymistMarker,
  TinymistVirtualFile,
} from './types.js'

const defaultTriggers = ['tinymist', 'typst-lsp']
const defaultFileName = 'index.typ'

interface QueryFileDraft {
  fileName: string
  lines: string[]
}

interface OutputLineDraft {
  id: number
  text: string
  fileName?: string
  queryLine?: number
}

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

interface CutDirective {
  kind: 'before' | 'after' | 'start' | 'end'
  outputLineIndex: number
}

function hasTrigger(meta: string, triggers: string[]): boolean {
  return triggers.some((trigger) => {
    const escaped = escapeRegExp(trigger)
    return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(meta)
  })
}

function getFile(
  files: Map<string, QueryFileDraft>,
  fileName: string,
): QueryFileDraft {
  const existing = files.get(fileName)
  if (existing) {
    return existing
  }

  const file = {
    fileName,
    lines: [],
  }
  files.set(fileName, file)
  return file
}

function parseDirectiveLine(
  line: string,
  sourceLine: number,
): TinymistDirective | undefined {
  const match = /^\s*\/\/\s*@([A-Za-z][\w-]*)(?:\s*:\s*(.*))?\s*$/.exec(line)
  if (!match) {
    return undefined
  }

  const name = normalizeDirectiveName(match[1] ?? '')
  const value = match[2]?.trim()

  return {
    name,
    line: sourceLine,
    ...(value ? { value } : {}),
  }
}

function parseCutDirective(
  line: string,
  outputLineIndex: number,
): CutDirective | undefined {
  const match = /^\s*\/\/\s*---cut(?:-(before|after|start|end))?---\s*$/.exec(
    line,
  )
  if (!match) {
    return undefined
  }

  return {
    kind: normalizeCutKind(match[1]),
    outputLineIndex,
  }
}

function parseMarkerLine(
  line: string,
  previousOutputLine: OutputLineDraft | undefined,
  currentFile: QueryFileDraft,
): Omit<TinymistMarker, 'id'> | undefined {
  if (!previousOutputLine?.queryLine) {
    return undefined
  }

  const query = /^(\s*)\/\/([ \t]*)(\^+)([?|])([ \t]*(.*))?$/.exec(line)
  if (query) {
    const leadingIndent = query[1] ?? ''
    const spaces = query[2] ?? ''
    const carets = query[3] ?? ''
    const operator = query[4]
    const label = query[6]?.trim()
    const column = leadingIndent.length + spaces.length + 1

    return {
      line: previousOutputLine.id,
      column,
      length: carets.length,
      kind: operator === '|' ? 'completion' : 'hover',
      fileName: previousOutputLine.fileName ?? currentFile.fileName,
      queryLine: previousOutputLine.queryLine,
      queryColumn: column,
      ...(label ? { label } : {}),
    }
  }

  const highlight = /^(\s*)\/\/([ \t]*)(\^+)([ \t]*(.*))?$/.exec(line)
  if (!highlight) {
    return undefined
  }

  const leadingIndent = highlight[1] ?? ''
  const spaces = highlight[2] ?? ''
  const carets = highlight[3] ?? ''
  const label = highlight[5]?.trim()
  const column = leadingIndent.length + spaces.length + 1

  return {
    line: previousOutputLine.id,
    column,
    length: carets.length,
    kind: 'highlight',
    fileName: previousOutputLine.fileName ?? currentFile.fileName,
    queryLine: previousOutputLine.queryLine,
    queryColumn: column,
    ...(label ? { label } : {}),
  }
}

function applyCuts(
  outputLines: OutputLineDraft[],
  cuts: CutDirective[],
): OutputLineDraft[] {
  if (!cuts.length) {
    return outputLines
  }

  const visible = outputLines.map(() => true)
  let beforeIndex = 0
  let afterIndex = outputLines.length
  const startStack: number[] = []

  for (const cut of cuts) {
    if (cut.kind === 'before') {
      beforeIndex = Math.max(beforeIndex, cut.outputLineIndex)
    } else if (cut.kind === 'after') {
      afterIndex = Math.min(afterIndex, cut.outputLineIndex)
    } else if (cut.kind === 'start') {
      startStack.push(cut.outputLineIndex)
    } else {
      const start = startStack.pop()
      if (start === undefined) {
        continue
      }

      for (let index = start; index < cut.outputLineIndex; index += 1) {
        visible[index] = false
      }
    }
  }

  return outputLines.filter((_, index) => {
    return visible[index] && index >= beforeIndex && index < afterIndex
  })
}

function normalizeDiagnosticsDirectives(directives: TinymistDirective[]): {
  mode: ParsedTinymistCode['diagnosticsMode']
  expectedErrors: string[]
} {
  const noErrors = directives.some((directive) => directive.name === 'noErrors')
  const expectedErrors = directives
    .filter((directive) => directive.name === 'errors')
    .flatMap((directive) => directive.value?.split(/[,\s]+/) ?? [])
    .map((value) => value.trim())
    .filter(Boolean)

  if (noErrors) {
    return { mode: 'hide', expectedErrors }
  }

  if (expectedErrors.length) {
    return { mode: 'expect', expectedErrors }
  }

  return { mode: 'show', expectedErrors }
}

function normalizeDirectiveName(name: string): string {
  if (name === 'no-errors') return 'noErrors'
  if (name === 'show-emit') return 'showEmit'
  if (name === 'show-emitted-file') return 'showEmittedFile'
  return name
}

function normalizeCutKind(value: string | undefined): CutDirective['kind'] {
  if (value === 'after' || value === 'start' || value === 'end') {
    return value
  }

  return 'before'
}

function normalizeFileName(fileName: string): string {
  return fileName.trim().replace(/\\/g, '/')
}

export function lineKey(fileName: string, line: number): string {
  return `${fileName}:${line}`
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
