import type {
  HastElement,
  HastExtension,
  HastNode,
  TinymistCompletionItem,
  TinymistDiagnosticNode,
  TinymistHoverNode,
  TinymistRendererHooks,
  TinymistRichRendererOptions,
} from './types.js'

const fenceRE = /```([^\n`]*)\n([\s\S]*?)```/g

export function rendererRich(
  options: TinymistRichRendererOptions = {},
): TinymistRendererHooks {
  const {
    classExtra = '',
    lang,
    completionLimit = 5,
    renderMarkdown = renderMarkdownPassThrough,
    hast,
  } = options

  return {
    nodeHover(info, node) {
      const renderOptions: RenderHoverContentOptions = { renderMarkdown }
      if (lang !== undefined) {
        renderOptions.lang = lang
      }
      if (hast !== undefined) {
        renderOptions.hast = hast
      }

      const content = renderHoverContent.call(this, info, renderOptions)

      if (!content.length) {
        return node
      }

      const popup = extend(
        hast?.hoverPopup,
        element(
          'span',
          {
            class: ['tinymist-popup-container', classExtra]
              .filter(Boolean)
              .join(' '),
          },
          [element('span', { class: 'tinymist-popup-arrow' }), ...content],
        ),
      )

      return extend(
        hast?.hoverToken,
        element('span', { class: 'tinymist-hover', tabIndex: 0 }, [
          popup,
          node,
        ]),
      )
    },

    lineCompletion(completion) {
      const items = completion.items.slice(0, completionLimit)
      if (!items.length) {
        return []
      }

      return [
        extend(
          hast?.completionLine,
          element(
            'div',
            {
              class: [
                'tinymist-meta-line',
                'tinymist-completion-line',
                classExtra,
              ]
                .filter(Boolean)
                .join(' '),
            },
            items.map((item) =>
              renderCompletionItem(item, classExtra, hast?.completionItem),
            ),
          ),
        ),
      ]
    },

    nodesHighlight(_highlight, nodes) {
      return [
        extend(
          hast?.highlightToken,
          element(
            'span',
            {
              class: ['tinymist-highlighted', classExtra]
                .filter(Boolean)
                .join(' '),
            },
            nodes,
          ),
        ),
      ]
    },

    nodesDiagnostic(diagnostic, nodes) {
      return [
        extend(
          hast?.diagnosticToken,
          element(
            'span',
            {
              class: [
                'tinymist-diagnostic',
                getDiagnosticLevelClass(diagnostic),
              ]
                .filter(Boolean)
                .join(' '),
            },
            nodes,
          ),
        ),
      ]
    },

    lineDiagnostic(diagnostic) {
      return [
        extend(
          hast?.diagnosticLine,
          element(
            'div',
            {
              class: [
                'tinymist-meta-line',
                'tinymist-diagnostic-line',
                getDiagnosticLevelClass(diagnostic),
                classExtra,
              ]
                .filter(Boolean)
                .join(' '),
            },
            [text(diagnostic.message)],
          ),
        ),
      ]
    },
  }
}

function renderCompletionItem(
  item: TinymistCompletionItem,
  classExtra: string,
  extension: HastExtension | undefined,
): HastElement {
  const children: HastNode[] = []

  if (item.kind) {
    children.push(
      element('span', { class: 'tinymist-completion-kind' }, [text(item.kind)]),
    )
  }

  children.push(
    element('span', { class: 'tinymist-completion-label' }, [text(item.label)]),
  )

  if (item.detail) {
    children.push(
      element('span', { class: 'tinymist-completion-detail' }, [
        text(item.detail),
      ]),
    )
  }

  return extend(
    extension,
    element(
      'span',
      {
        class: [
          'tinymist-completion-item',
          item.deprecated ? 'tinymist-completion-deprecated' : '',
          classExtra,
        ]
          .filter(Boolean)
          .join(' '),
        ...(item.documentation ? { title: item.documentation } : {}),
      },
      children,
    ),
  )
}

interface RenderHoverContentOptions {
  lang?: string
  renderMarkdown: (markdown: string) => HastNode[]
  hast?: TinymistRichRendererOptions['hast']
}

function renderHoverContent(
  this: any,
  info: TinymistHoverNode,
  options: RenderHoverContentOptions,
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
    nodes.push(renderCode.call(this, code, fenceLang, options))

    lastIndex = match.index + match[0].length
  }

  nodes.push(...renderProse(markdown.slice(lastIndex), options))
  return nodes
}

function renderProse(
  markdown: string,
  options: RenderHoverContentOptions,
): HastNode[] {
  const cleaned = markdown.replace(/^\s*---\s*$/gm, '').trim()

  if (!cleaned) {
    return []
  }

  return [
    extend(
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
  this: any,
  code: string,
  fenceLang: string | undefined,
  options: RenderHoverContentOptions,
): HastElement {
  const popupLang = normalizePopupLang(
    fenceLang || options.lang || this.options?.lang || 'typst',
  )
  const highlighted = highlightCode.call(this, code, popupLang)

  return extend(
    options.hast?.popupCode,
    element('code', { class: 'tinymist-popup-code' }, highlighted),
  )
}

function highlightCode(this: any, code: string, lang: string): HastNode[] {
  if (!code) {
    return []
  }

  try {
    const root = this.codeToHast(code, {
      ...this.options,
      meta: {},
      transformers: [],
      lang,
      structure: code.includes('\n') ? 'classic' : 'inline',
    })
    return unwrapHighlightedRoot(root.children as HastNode[])
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

function normalizePopupLang(lang: string): string {
  if (lang === 'typc' || lang === 'typ') {
    return 'typst'
  }
  return lang
}

function renderMarkdownPassThrough(markdown: string): HastNode[] {
  return [text(markdown)]
}

function getDiagnosticLevelClass(diagnostic: TinymistDiagnosticNode): string {
  if (diagnostic.severity === 'warning') {
    return 'tinymist-diagnostic-level-warning'
  }
  if (diagnostic.severity === 'information') {
    return 'tinymist-diagnostic-level-information'
  }
  if (diagnostic.severity === 'hint') {
    return 'tinymist-diagnostic-level-hint'
  }
  return 'tinymist-diagnostic-level-error'
}

function extend(
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
