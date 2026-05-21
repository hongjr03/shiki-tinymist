import type { TinymistProvider } from '../types/query.js'
import type {
  TinymistWasmModule,
  TinymistWasmProviderOptions,
} from '../types/wasm.js'
import { loadTinymist } from './loader.js'
import { TinymistWasmSession } from './session.js'

export function createTinymistWasmProvider(
  options: TinymistWasmProviderOptions = {},
): TinymistProvider {
  let modulePromise: Promise<TinymistWasmModule> | undefined

  return {
    async query(input) {
      modulePromise ??= loadTinymist(options)
      const module = await modulePromise
      const session = new TinymistWasmSession(module, options)
      return session.query(input)
    },
  }
}
