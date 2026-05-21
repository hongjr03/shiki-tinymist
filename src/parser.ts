import type { ParsedTinymistCode, TinymistMarker } from './types.js'

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
  const output: string[] = []
  const markers: TinymistMarker[] = []
  const lines = source.split(/\r?\n/)

  for (const rawLine of lines) {
    const marker = parseMarkerLine(rawLine, output.length)

    if (marker) {
      markers.push({
        ...marker,
        id: `m${markers.length + 1}`,
      })
      continue
    }

    output.push(rawLine)
  }

  return {
    code: output.join('\n'),
    markers,
  }
}

function hasTrigger(meta: string, triggers: string[]): boolean {
  return triggers.some((trigger) => {
    const escaped = escapeRegExp(trigger)
    return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(meta)
  })
}

function parseMarkerLine(
  line: string,
  previousOutputLineCount: number,
): Omit<TinymistMarker, 'id'> | undefined {
  if (previousOutputLineCount === 0) {
    return undefined
  }

  const query = /^(\s*)\/\/([ \t]*)(\^+)([?|])([ \t]*(.*))?$/.exec(line)
  if (query) {
    const leadingIndent = query[1] ?? ''
    const spaces = query[2] ?? ''
    const carets = query[3] ?? ''
    const operator = query[4]
    const label = query[6]?.trim()

    return {
      line: previousOutputLineCount,
      column: leadingIndent.length + spaces.length + 1,
      length: carets.length,
      kind: operator === '|' ? 'completion' : 'hover',
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

  return {
    line: previousOutputLineCount,
    column: leadingIndent.length + spaces.length + 1,
    length: carets.length,
    kind: 'highlight',
    ...(label ? { label } : {}),
  }
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
