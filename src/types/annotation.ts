import type {
  TinymistCompletionItem,
  TinymistDiagnostic,
} from './query.js'

export type TinymistNode =
  | TinymistHoverNode
  | TinymistCompletionNode
  | TinymistDiagnosticNode
  | TinymistHighlightNode

export interface TinymistBaseNode {
  start: number
  line: number
  character: number
  length: number
}

export interface TinymistHoverNode extends TinymistBaseNode {
  type: 'hover'
  markerId: string
  markdown: string
  plainText?: string
}

export interface TinymistCompletionNode extends TinymistBaseNode {
  type: 'completion'
  markerId: string
  items: TinymistCompletionItem[]
}

export interface TinymistDiagnosticNode extends TinymistBaseNode {
  type: 'diagnostic'
  message: string
  severity?: TinymistDiagnostic['severity']
}

export interface TinymistHighlightNode extends TinymistBaseNode {
  type: 'highlight'
}

export interface TinymistShikiReturn {
  code: string
  nodes: TinymistNode[]
  meta?: {
    extension?: string
  }
}
