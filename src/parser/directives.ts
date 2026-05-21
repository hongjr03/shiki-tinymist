import type { ParsedTinymistCode, TinymistDirective } from '../types/source.js'

export function parseDirectiveLine(
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

export function normalizeDiagnosticsDirectives(
  directives: TinymistDirective[],
): {
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
