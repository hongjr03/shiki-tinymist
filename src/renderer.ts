import type { HastNode } from './types/hast.js'
import type {
  TinymistRendererHooks,
  TinymistRichRendererOptions,
} from './types/renderer.js'
import { renderCompletionLine } from './renderer/completion.js'
import {
  renderDiagnosticLine,
  renderDiagnosticToken,
  renderHighlightToken,
} from './renderer/decorations.js'
import {
  renderHoverToken,
  renderMarkdownPassThrough,
  type HoverHighlightContext,
} from './renderer/hover.js'

export { element, text } from './hast.js'

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
  const renderOptions = {
    classExtra,
    completionLimit,
    renderMarkdown,
    ...(lang !== undefined ? { lang } : {}),
    ...(hast !== undefined ? { hast } : {}),
  }

  return {
    nodeHover(info, node) {
      return renderHoverToken(
        this as HoverHighlightContext,
        info,
        node,
        renderOptions,
      )
    },

    lineCompletion(completion) {
      const line = renderCompletionLine(completion, renderOptions)
      return line ? [line] : []
    },

    nodesHighlight(_highlight, nodes) {
      return [renderHighlightToken(nodes, renderOptions)]
    },

    nodesDiagnostic(diagnostic, nodes) {
      return [renderDiagnosticToken(diagnostic, nodes, renderOptions)]
    },

    lineDiagnostic(diagnostic) {
      return [renderDiagnosticLine(diagnostic, renderOptions)]
    },
  }
}

export type { HastNode }
