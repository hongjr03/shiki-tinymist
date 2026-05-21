import { codeToHast, codeToHtml } from "shiki";
import { createTinymistTransformer } from "../transformer.js";
import type { CreateTinymistTransformerOptions } from "../types/options.js";

export const defaultTinymistTheme = "github-dark";

export interface TinymistRenderOptions extends CreateTinymistTransformerOptions {
  lang?: string;
  theme?: string;
  meta?: string;
  shiki?: TinymistShikiOptions;
}

export interface TinymistShikiOptions extends Record<string, unknown> {
  transformers?: unknown[];
  meta?: unknown;
}

export async function renderTinymistCode(
  code: string,
  options: TinymistRenderOptions = {},
): Promise<string> {
  return codeToHtml(
    code,
    (await createShikiCodeOptions(code, options)) as never,
  );
}

export async function renderTinymistHast(
  code: string,
  options: TinymistRenderOptions = {},
): Promise<unknown> {
  return codeToHast(
    code,
    (await createShikiCodeOptions(code, options)) as never,
  );
}

async function createShikiCodeOptions(
  code: string,
  options: TinymistRenderOptions,
): Promise<Record<string, unknown>> {
  const {
    lang = "typst",
    theme = defaultTinymistTheme,
    meta,
    shiki,
    ...tinymistOptions
  } = options;
  const transformer = await createTinymistTransformer(code, tinymistOptions);
  const shikiOptions = shiki ?? {};
  const codeOptions: Record<string, unknown> = {
    ...shikiOptions,
    lang: normalizeShikiLang(lang),
    theme,
    transformers: [
      ...toTransformerArray(shikiOptions.transformers),
      transformer,
    ],
  };
  const mergedMeta = mergeMeta(shikiOptions.meta, meta);

  if (mergedMeta !== undefined) {
    codeOptions.meta = mergedMeta;
  }

  return codeOptions;
}

function normalizeShikiLang(lang: string): string {
  return lang === "typ" ? "typst" : lang;
}

function toTransformerArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mergeMeta(base: unknown, raw: string | undefined): unknown {
  if (raw === undefined) {
    return base;
  }

  if (base && typeof base === "object" && !Array.isArray(base)) {
    return {
      ...base,
      __raw: raw,
    };
  }

  return {
    __raw: raw,
  };
}
