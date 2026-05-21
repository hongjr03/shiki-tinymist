import type { HastElement, HastNode, TinymistNode } from './types.js'

export interface LineTokenSpan {
  line: number
  charStart: number
  charEnd: number
  token: HastNode
}

export function getShikiMeta(meta: unknown): string | undefined {
  if (typeof meta === 'string') {
    return meta
  }

  if (typeof meta === 'object' && meta && '__raw' in meta) {
    const raw = (meta as { __raw?: unknown }).__raw
    return typeof raw === 'string' ? raw : undefined
  }

  return undefined
}

export function getShikiLanguage(language: unknown): string | undefined {
  return typeof language === 'string' ? language : undefined
}

export function addClass(
  node: HastElement,
  className: string | string[],
): void {
  node.properties ??= {}
  const classNames = Array.isArray(className) ? className : [className]
  const current = node.properties.class

  if (Array.isArray(current)) {
    for (const name of classNames) {
      if (!current.includes(name)) {
        current.push(name)
      }
    }
    return
  }

  const names =
    typeof current === 'string'
      ? new Set(current.split(/\s+/).filter(Boolean))
      : new Set<string>()

  for (const name of classNames) {
    names.add(name)
  }

  node.properties.class = [...names].join(' ')
}

export function createLineTokenSpans(
  lines: readonly HastElement[],
): LineTokenSpan[] {
  const spans: LineTokenSpan[] = []

  lines.forEach((lineEl, line) => {
    let index = 0
    for (const token of flattenLineTokens(lineEl)) {
      const value = getTokenString(token)
      if (value) {
        spans.push({
          line,
          charStart: index,
          charEnd: index + value.length,
          token,
        })
        index += value.length
      }
    }
  })

  return spans
}

export function locateTextTokens(
  spans: readonly LineTokenSpan[],
  node: TinymistNode,
): HastNode[] {
  const start = node.character
  const end = node.character + node.length
  if (node.length === 0) {
    return spans
      .filter((span) => {
        return (
          span.line === node.line &&
          span.charStart < start &&
          start <= span.charEnd
        )
      })
      .map((span) => span.token)
  }

  return spans
    .filter((span) => {
      return (
        span.line === node.line &&
        start <= span.charStart &&
        span.charStart < end &&
        start < span.charEnd &&
        span.charEnd <= end
      )
    })
    .map((span) => span.token)
}

export function insertNodesAfterLine(
  codeEl: HastElement,
  lines: readonly HastElement[],
  line: number,
  nodes: HastNode[],
  onMissingLine: () => void,
): void {
  if (!nodes.length) {
    return
  }

  const children = (codeEl.children ??= [])
  let index: number

  if (line >= lines.length) {
    index = children.length
  } else {
    const lineEl = lines[line]
    if (!lineEl) {
      onMissingLine()
      return
    }

    index = children.indexOf(lineEl)
    if (index === -1) {
      onMissingLine()
      return
    }
  }

  const nodeAfter = children[index + 1]
  if (nodeAfter?.type === 'text' && nodeAfter.value === '\n') {
    children.splice(index + 1, 1)
  }

  children.splice(index + 1, 0, ...nodes)
}

export function wrapLineTokens(
  lines: readonly HastElement[],
  node: TinymistNode,
  wrap: (children: HastNode[]) => HastNode[],
): void {
  const line = lines[node.line]
  if (!line?.children) {
    return
  }

  let charIndex = 0
  let itemStart = line.children.length
  let itemEnd = 0

  line.children.forEach((token, index) => {
    if (charIndex >= node.character && index < itemStart) {
      itemStart = index
    }
    if (charIndex <= node.character + node.length && index > itemEnd) {
      itemEnd = index
    }
    charIndex += getTokenString(token).length
  })

  if (charIndex <= node.character + node.length) {
    itemEnd = line.children.length
  }

  const targets = line.children.slice(itemStart, itemEnd)
  if (!targets.length) {
    return
  }

  line.children.splice(itemStart, targets.length, ...wrap(targets))
}

function flattenLineTokens(line: HastElement): HastNode[] {
  return (line.children ?? []).flatMap((child) => {
    if (child.type === 'element') {
      return (child.children ?? []) as HastNode[]
    }
    return [child]
  }) as HastNode[]
}

function getTokenString(token: HastNode): string {
  if (token.type === 'text') {
    return token.value
  }
  return (token.children ?? []).map(getTokenString).join('')
}
