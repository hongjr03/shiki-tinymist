import type {
  TinymistWasmModule,
  TinymistWasmProviderOptions,
} from "../types/wasm.js";

export async function loadTinymist(
  options: TinymistWasmProviderOptions,
): Promise<TinymistWasmModule> {
  const module = options.module ?? (await importBundledTinymist());
  const moduleOrPath =
    options.moduleOrPath === undefined
      ? await readBundledTinymistWasm()
      : options.moduleOrPath;

  if (options.init === false) {
    return module;
  }

  if (options.init === "sync" && module.initSync) {
    module.initSync(moduleOrPath);
    return module;
  }

  if (module.default) {
    await module.default(
      moduleOrPath === undefined ? undefined : { module_or_path: moduleOrPath },
    );
  }

  return module;
}

async function readBundledTinymistWasm(): Promise<Uint8Array | URL> {
  const url = await resolveBundledTinymistAsset("tinymist_bg.wasm");
  if (!isNodeRuntime()) {
    return url;
  }

  try {
    const [{ readFile }, { fileURLToPath }] = await Promise.all([
      import("node:fs/promises"),
      import("node:url"),
    ]);
    return await readFile(fileURLToPath(url));
  } catch (error) {
    throw new Error(
      `Failed to read bundled Tinymist WASM at ${url.href}: ${errorMessage(error)}`,
    );
  }
}

function isNodeRuntime(): boolean {
  return (
    typeof process !== "undefined" &&
    typeof process.versions === "object" &&
    typeof process.versions.node === "string"
  );
}

async function importBundledTinymist(): Promise<TinymistWasmModule> {
  const url = await resolveBundledTinymistAsset("tinymist.js");

  try {
    return (await import(url.href)) as TinymistWasmModule;
  } catch (error) {
    throw new Error(
      `Failed to import bundled Tinymist WASM module at ${url.href}: ${errorMessage(error)}`,
    );
  }
}

async function resolveBundledTinymistAsset(fileName: string): Promise<URL> {
  const candidates = [
    new URL(`./tinymist/${fileName}`, import.meta.url),
    new URL(
      `../../vendor/tinymist/crates/tinymist/pkg/${fileName}`,
      import.meta.url,
    ),
  ];

  if (!isNodeRuntime()) {
    return candidates[0]!;
  }

  const [{ access }, { fileURLToPath }] = await Promise.all([
    import("node:fs/promises"),
    import("node:url"),
  ]);

  for (const candidate of candidates) {
    try {
      await access(fileURLToPath(candidate));
      return candidate;
    } catch {
      // Try the next internal asset location.
    }
  }

  throw new Error(
    [
      `Failed to find bundled Tinymist asset: ${fileName}`,
      "Searched:",
      ...candidates.map((candidate) => `  ${candidate.href}`),
      "Run npm run tinymist:build before testing from source, or npm run build before packing.",
    ].join("\n"),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
