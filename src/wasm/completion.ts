import type { TinymistCompletionItem } from '../types.js'
import { stringifyMarkup } from './markup.js'

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
