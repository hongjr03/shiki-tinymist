import type { TinymistHover } from '../types/query.js'
import { stringifyMarkup } from './markup.js'

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
