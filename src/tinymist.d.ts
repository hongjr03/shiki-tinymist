declare module 'tinymist' {
  import type { MaybePromise } from './types/common.js'
  import type { TinymistWasmModule } from './types/wasm.js'

  export const TinymistLanguageServer: TinymistWasmModule['TinymistLanguageServer']
  export const initSync: TinymistWasmModule['initSync']
  export const version: TinymistWasmModule['version']
  export default function init(input?: unknown): MaybePromise<unknown>
}
