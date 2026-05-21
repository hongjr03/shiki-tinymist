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

  const match = /^(\s*)\/\/([ \t]*)(\^+)\?([ \t]*(.*))?$/.exec(line)
  if (!match) {
    return undefined
  }

  const leadingIndent = match[1] ?? ''
  const spaces = match[2] ?? ''
  const carets = match[3] ?? ''
  const label = match[5]?.trim()

  return {
    line: previousOutputLineCount,
    column: leadingIndent.length + spaces.length + 1,
    length: carets.length,
    kind: 'hover',
    ...(label ? { label } : {}),
  }
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
