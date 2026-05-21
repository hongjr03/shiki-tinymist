declare module 'tinymist' {
  import type { MaybePromise, TinymistWasmModule } from './types.js'

  export const TinymistLanguageServer: TinymistWasmModule['TinymistLanguageServer']
  export const initSync: TinymistWasmModule['initSync']
  export const version: TinymistWasmModule['version']
  export default function init(input?: unknown): MaybePromise<unknown>
}
