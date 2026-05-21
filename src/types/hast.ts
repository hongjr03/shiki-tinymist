export interface HastExtension {
  tagName?: string
  properties?: Record<string, unknown>
  class?: string
  children?: (input: HastNode[]) => HastNode[]
}

export type HastText = {
  type: 'text'
  value: string
}

export type HastElement = {
  type: 'element'
  tagName: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

export type HastNode = HastText | HastElement
