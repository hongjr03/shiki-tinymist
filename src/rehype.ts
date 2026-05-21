import {
  shouldRenderTinymistFence,
  type TinymistMarkdownOptions,
} from './adapters/markdown.js'
import { renderTinymistHast } from './adapters/render.js'

export interface TinymistRehypeOptions extends TinymistMarkdownOptions {}

export type TinymistRehypeTransformer = (tree: unknown) => Promise<unknown>
export type TinymistRehypePlugin = () => TinymistRehypeTransformer

type HastLikeNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  data?: Record<string, unknown>
  children?: HastLikeNode[]
}

export function rehypeTinymist(
  options: TinymistRehypeOptions = {},
): TinymistRehypePlugin {
  return function attacher(): TinymistRehypeTransformer {
    return async function transform(tree: unknown): Promise<unknown> {
      await visit(tree as HastLikeNode, async (node, parent, index) => {
        if (!parent || index === undefined || !isPreElement(node)) {
          return
        }

        const code = getPreCode(node)
        if (!code || !shouldRenderTinymistFence(code, options)) {
          return
        }

        const rendered = await renderTinymistHast(textContent(code.node), {
          ...options,
          lang: code.lang,
          meta: code.meta,
        })
        const replacement = getFirstElement(rendered)

        if (replacement) {
          parent.children?.splice(index, 1, replacement)
        }
      })

      return tree
    }
  }
}

async function visit(
  node: HastLikeNode,
  visitor: (
    node: HastLikeNode,
    parent: HastLikeNode | undefined,
    index: number | undefined,
  ) => Promise<void>,
  parent?: HastLikeNode,
  index?: number,
): Promise<void> {
  await visitor(node, parent, index)

  const children = node.children
  if (!children) {
    return
  }

  for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
    const child = children[childIndex]
    if (child) {
      await visit(child, visitor, node, childIndex)
    }
  }
}

function isPreElement(node: HastLikeNode): boolean {
  return node.type === 'element' && node.tagName === 'pre'
}

function getPreCode(
  pre: HastLikeNode,
): { node: HastLikeNode; lang: string; meta: string } | undefined {
  const code = pre.children?.find((child) => {
    return child.type === 'element' && child.tagName === 'code'
  })

  if (!code) {
    return undefined
  }

  const lang = getLanguage(code) || getLanguage(pre)
  if (!lang) {
    return undefined
  }

  return {
    node: code,
    lang,
    meta: getMeta(code),
  }
}

function getLanguage(node: HastLikeNode): string | undefined {
  const classNames = toClassNames(node.properties?.className)
  const languageClass = classNames.find((className) => {
    return className.startsWith('language-')
  })

  return languageClass?.slice('language-'.length)
}

function toClassNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value === 'string') {
    return value.split(/\s+/).filter(Boolean)
  }

  return []
}

function getMeta(node: HastLikeNode): string {
  const value =
    node.properties?.dataMeta ??
    node.properties?.['data-meta'] ??
    node.properties?.meta ??
    node.data?.meta

  return typeof value === 'string' ? value : ''
}

function textContent(node: HastLikeNode): string {
  if (node.type === 'text') {
    return node.value ?? ''
  }

  return (node.children ?? []).map(textContent).join('')
}

function getFirstElement(tree: unknown): HastLikeNode | undefined {
  if (!tree || typeof tree !== 'object') {
    return undefined
  }

  const children = (tree as { children?: unknown }).children
  if (!Array.isArray(children)) {
    return undefined
  }

  return children.find((child): child is HastLikeNode => {
    return (
      !!child &&
      typeof child === 'object' &&
      (child as { type?: unknown }).type === 'element'
    )
  })
}
