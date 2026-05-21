import { className, element, extendHastElement, text } from '../hast.js'
import type { TinymistHoverNode } from '../types/annotation.js'
import type { HastElement, HastNode } from '../types/hast.js'
import type { TinymistRichRendererOptions } from '../types/renderer.js'

const fenceRE = /```([^\n`]*)\n([\s\S]*?)```/g

export interface HoverHighlightContext {
  options?: Record<string, unknown>
  codeToHast?: (code: string, options: Record<string, unknown>) => {
    children?: unknown
  }
}

export interface RenderHoverOptions {
  classExtra: string
  lang?: string
  renderMarkdown: (markdown: string) => HastNode[]
  hast?: TinymistRichRendererOptions['hast']
}

export function renderHoverToken(
  context: HoverHighlightContext,
  info: TinymistHoverNode,
  token: HastNode,
  options: RenderHoverOptions,
): HastNode {
  const content = renderHoverContent(context, info, options)

  if (!content.length) {
    return token
  }

  const popup = extendHastElement(
    options.hast?.hoverPopup,
    element(
      'span',
      {
        class: className('tinymist-popup-container', options.classExtra),
      },
      [element('span', { class: 'tinymist-popup-arrow' }), ...content],
    ),
  )

  return extendHastElement(
    options.hast?.hoverToken,
    element('span', { class: 'tinymist-hover', tabIndex: 0 }, [popup, token]),
  )
}

export function renderMarkdownPassThrough(markdown: string): HastNode[] {
  return [text(markdown)]
}

function renderHoverContent(
  context: HoverHighlightContext,
  info: TinymistHoverNode,
  options: RenderHoverOptions,
): HastNode[] {
  const markdown = info.markdown.trim()
  if (!markdown) {
    return []
  }

  const nodes: HastNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  fenceRE.lastIndex = 0
  while ((match = fenceRE.exec(markdown))) {
    const prose = markdown.slice(lastIndex, match.index)
    nodes.push(...renderProse(prose, options))

    const fenceLang = match[1]?.trim()
    const code = match[2]?.trimEnd() ?? ''
    nodes.push(renderCode(context, code, fenceLang, options))

    lastIndex = match.index + match[0].length
  }

  nodes.push(...renderProse(markdown.slice(lastIndex), options))
  return nodes
}

function renderProse(
  markdown: string,
  options: RenderHoverOptions,
): HastNode[] {
  const cleaned = markdown.replace(/^\s*---\s*$/gm, '').trim()

  if (!cleaned) {
    return []
  }

  return [
    extendHastElement(
      options.hast?.popupDocs,
      element(
        'div',
        { class: 'tinymist-popup-docs' },
        options.renderMarkdown(cleaned),
      ),
    ),
  ]
}

function renderCode(
  context: HoverHighlightContext,
  code: string,
  fenceLang: string | undefined,
  options: RenderHoverOptions,
): HastElement {
  const popupLang = normalizePopupLang(
    fenceLang || options.lang || getContextLang(context) || 'typst',
  )
  const highlighted = highlightCode(context, code, popupLang)

  return extendHastElement(
    options.hast?.popupCode,
    element('code', { class: 'tinymist-popup-code' }, highlighted),
  )
}

function highlightCode(
  context: HoverHighlightContext,
  code: string,
  lang: string,
): HastNode[] {
  if (!code) {
    return []
  }

  if (typeof context.codeToHast !== 'function') {
    return [text(code)]
  }

  try {
    const root = context.codeToHast(code, {
      ...(context.options ?? {}),
      meta: {},
      transformers: [],
      lang,
      structure: code.includes('\n') ? 'classic' : 'inline',
    })
    return unwrapHighlightedRoot(toHastChildren(root.children))
  } catch {
    return [text(code)]
  }
}

function unwrapHighlightedRoot(children: HastNode[]): HastNode[] {
  const pre = children[0]
  if (
    children.length === 1 &&
    pre?.type === 'element' &&
    pre.tagName === 'pre'
  ) {
    const code = pre.children?.find((child) => {
      return child.type === 'element' && child.tagName === 'code'
    }) as HastElement | undefined
    return code?.children ?? children
  }

  return children
}

function toHastChildren(value: unknown): HastNode[] {
  return Array.isArray(value) ? (value as HastNode[]) : []
}

function normalizePopupLang(lang: string): string {
  if (lang === 'typc' || lang === 'typ') {
    return 'typst'
  }
  return lang
}

function getContextLang(context: HoverHighlightContext): string | undefined {
  const lang = context.options?.lang
  return typeof lang === 'string' ? lang : undefined
}
