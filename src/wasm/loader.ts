import type {
  TinymistWasmModule,
  TinymistWasmProviderOptions,
} from '../types/wasm.js'

export async function loadTinymist(
  options: TinymistWasmProviderOptions,
): Promise<TinymistWasmModule> {
  const module = options.module ?? (await importTinymist())
  const moduleOrPath =
    options.moduleOrPath === undefined
      ? await tryReadNodeTinymistWasm()
      : options.moduleOrPath

  if (options.init === false) {
    return module
  }

  if (options.init === 'sync' && module.initSync) {
    module.initSync(moduleOrPath)
    return module
  }

  if (module.default) {
    await module.default(
      moduleOrPath === undefined ? undefined : { module_or_path: moduleOrPath },
    )
  }

  return module
}

async function tryReadNodeTinymistWasm(): Promise<Uint8Array | undefined> {
  if (!isNodeRuntime()) {
    return undefined
  }

  try {
    const [{ createRequire }, { readFile }, path] = await Promise.all([
      import('node:module'),
      import('node:fs/promises'),
      import('node:path'),
    ])
    const require = createRequire(import.meta.url)
    const entry = require.resolve('tinymist')
    return await readFile(path.join(path.dirname(entry), 'tinymist_bg.wasm'))
  } catch {
    return undefined
  }
}

function isNodeRuntime(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.versions === 'object' &&
    typeof process.versions.node === 'string'
  )
}

async function importTinymist(): Promise<TinymistWasmModule> {
  try {
    return (await import('tinymist')) as TinymistWasmModule
  } catch (error) {
    throw new Error(
      `Failed to import optional peer dependency tinymist: ${errorMessage(error)}`,
    )
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
