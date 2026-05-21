import { className, element, extendHastElement, text } from '../hast.js'
import type {
  HastElement,
  HastNode,
  TinymistDiagnosticNode,
  TinymistRichRendererOptions,
} from '../types.js'

export interface RenderDecorationOptions {
  classExtra: string
  hast?: TinymistRichRendererOptions['hast']
}

export function renderHighlightToken(
  nodes: HastNode[],
  options: RenderDecorationOptions,
): HastElement {
  return extendHastElement(
    options.hast?.highlightToken,
    element(
      'span',
      {
        class: className('tinymist-highlighted', options.classExtra),
      },
      nodes,
    ),
  )
}

export function renderDiagnosticToken(
  diagnostic: TinymistDiagnosticNode,
  nodes: HastNode[],
  options: RenderDecorationOptions,
): HastElement {
  return extendHastElement(
    options.hast?.diagnosticToken,
    element(
      'span',
      {
        class: className(
          'tinymist-diagnostic',
          getDiagnosticLevelClass(diagnostic),
        ),
      },
      nodes,
    ),
  )
}

export function renderDiagnosticLine(
  diagnostic: TinymistDiagnosticNode,
  options: RenderDecorationOptions,
): HastElement {
  return extendHastElement(
    options.hast?.diagnosticLine,
    element(
      'div',
      {
        class: className(
          'tinymist-meta-line',
          'tinymist-diagnostic-line',
          getDiagnosticLevelClass(diagnostic),
          options.classExtra,
        ),
      },
      [text(diagnostic.message)],
    ),
  )
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
