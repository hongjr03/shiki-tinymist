import type { HastElement, HastExtension, HastNode } from './types.js'

export function element(
  tagName: string,
  properties: Record<string, unknown> = {},
  children: HastNode[] = [],
): HastElement {
  return {
    type: 'element',
    tagName,
    properties,
    children,
  }
}

export function text(value: string): HastNode {
  return {
    type: 'text',
    value,
  }
}

export function className(...names: Array<string | undefined>): string {
  return names.filter(Boolean).join(' ')
}

export function extendHastElement(
  extension: HastExtension | undefined,
  node: HastElement,
): HastElement {
  if (!extension) {
    return node
  }

  const extended: HastElement = {
    ...node,
    tagName: extension.tagName ?? node.tagName,
    properties: {
      ...node.properties,
      class: extension.class || node.properties?.class,
      ...extension.properties,
    },
  }

  const children = extension.children?.(node.children ?? []) ?? node.children
  if (children !== undefined) {
    extended.children = children
  }

  return extended
}
