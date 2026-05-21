export interface TinymistMarker {
  id: string
  line: number
  column: number
  length: number
  kind: 'hover' | 'completion' | 'highlight'
  fileName?: string
  queryLine?: number
  queryColumn?: number
  label?: string
}

export interface ParsedTinymistCode {
  code: string
  markers: TinymistMarker[]
  files: TinymistVirtualFile[]
  directives: TinymistDirective[]
  diagnosticsMode: 'show' | 'hide' | 'expect'
  expectedErrors: string[]
  queryLineToOutputLine: Record<string, number>
}

export interface TinymistVirtualFile {
  fileName: string
  code: string
  uri?: string
}

export interface TinymistDirective {
  name: string
  value?: string
  line: number
}
