import type { TinymistNode } from './types/annotation.js'
import type { HastElement, HastNode } from './types/hast.js'
import type { TinymistRendererHooks } from './types/renderer.js'
import {
  createLineTokenSpans,
  insertNodesAfterLine,
  locateTextTokens,
  wrapLineTokens,
} from './shiki-hast.js'

export interface ApplyTinymistAnnotationsOptions {
  codeElement: HastElement
  lines: HastElement[]
  nodes: TinymistNode[]
  renderer: TinymistRendererHooks
  rendererContext: unknown
  onError: (error: Error) => void
}

export function applyTinymistAnnotations(
  options: ApplyTinymistAnnotationsOptions,
): void {
  const {
    codeElement,
    lines,
    nodes,
    renderer,
    rendererContext,
    onError,
  } = options
  const tokenSpans = createLineTokenSpans(lines)
  const tokensSkipHover = new Set<HastNode>()
  const hoverActions: (() => void)[] = []
  const highlightActions: (() => void)[] = []

  const insertAfterLine = (line: number, inserted: HastNode[]): void => {
    insertNodesAfterLine(codeElement, lines, line, inserted, () => {
      onError(new Error(`Cannot find line ${line} in code element`))
    })
  }

  for (const node of nodes) {
    if (node.type === 'completion') {
      if (renderer.lineCompletion) {
        insertAfterLine(
          node.line,
          renderer.lineCompletion.call(rendererContext, node),
        )
      }
      continue
    }

    const tokens = locateTextTokens(tokenSpans, node)

    if (
      !tokens.length &&
      !(node.type === 'diagnostic' && renderer.lineDiagnostic)
    ) {
      onError(new Error(`Cannot find tokens for node: ${JSON.stringify(node)}`))
      continue
    }

    if (node.type === 'diagnostic') {
      tokens.forEach((token) => tokensSkipHover.add(token))

      if (renderer.nodesDiagnostic) {
        highlightActions.push(() => {
          wrapLineTokens(
            lines,
            node,
            (targets) =>
              renderer.nodesDiagnostic?.call(rendererContext, node, targets) ??
              targets,
          )
        })
      }

      if (renderer.lineDiagnostic) {
        insertAfterLine(
          node.line,
          renderer.lineDiagnostic.call(rendererContext, node),
        )
      }
      continue
    }

    if (node.type === 'highlight') {
      if (renderer.nodesHighlight) {
        highlightActions.push(() => {
          wrapLineTokens(
            lines,
            node,
            (targets) =>
              renderer.nodesHighlight?.call(rendererContext, node, targets) ??
              targets,
          )
        })
      }
      continue
    }

    hoverActions.push(() => {
      if (tokens.some((token) => tokensSkipHover.has(token))) {
        return
      }

      tokens.forEach((token) => tokensSkipHover.add(token))
      wrapLineTokens(lines, node, (targets) => {
        const wrappedToken: HastElement = {
          type: 'element',
          tagName: 'span',
          properties: {},
          children: targets,
        }
        return [
          renderer.nodeHover.call(
            rendererContext,
            node,
            wrappedToken,
          ) as HastNode,
        ]
      })
    })
  }

  hoverActions.forEach((action) => action())
  highlightActions.forEach((action) => action())
}
