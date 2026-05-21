import type {
  TinymistCompletionNode,
  TinymistDiagnosticNode,
  TinymistHighlightNode,
  TinymistHoverNode,
} from './annotation.js'
import type { HastExtension, HastNode } from './hast.js'
import type { TinymistHover } from './query.js'
import type { TinymistMarker } from './source.js'

export interface TinymistRendererContext {
  marker: TinymistMarker
  hover?: TinymistHover
}

export type TinymistRenderer = (context: TinymistRendererContext) => HastNode[]

export interface TinymistRichRendererOptions {
  classExtra?: string
  lang?: string
  completionLimit?: number
  renderMarkdown?: (markdown: string) => HastNode[]
  hast?: {
    hoverToken?: HastExtension
    hoverPopup?: HastExtension
    popupCode?: HastExtension
    popupDocs?: HastExtension
    completionLine?: HastExtension
    completionItem?: HastExtension
    highlightToken?: HastExtension
    diagnosticToken?: HastExtension
    diagnosticLine?: HastExtension
  }
}

export interface TinymistRendererHooks {
  nodeHover: (info: TinymistHoverNode, node: HastNode) => Partial<HastNode>
  lineCompletion?: (completion: TinymistCompletionNode) => HastNode[]
  nodesHighlight?: (
    highlight: TinymistHighlightNode,
    nodes: HastNode[],
  ) => HastNode[]
  nodesDiagnostic?: (
    diagnostic: TinymistDiagnosticNode,
    nodes: HastNode[],
  ) => HastNode[]
  lineDiagnostic?: (diagnostic: TinymistDiagnosticNode) => HastNode[]
}
