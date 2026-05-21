import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import MarkdownIt from "markdown-it";
import {
  createTinymistWasmProvider,
  defaultTinymistTheme,
  renderTinymistMarkdown,
} from "shiki-tinymist";

const root = findRepositoryRoot();
const markdown = new MarkdownIt({ html: true });
const providerPromise = createProvider();
const previewCache = new Map();

export async function loadAdapterPreview(adapter) {
  const cached = previewCache.get(adapter.id);

  if (cached) {
    return cached;
  }

  const preview = await renderAdapterPreview(adapter);
  previewCache.set(adapter.id, preview);

  return preview;
}

async function renderAdapterPreview(adapter) {
  const source = await readRootFile(adapter.content);
  const processed = await renderTinymistMarkdown(source, {
    explicitTrigger: true,
    provider: await providerPromise,
    theme: defaultTinymistTheme,
  });
  const files = await Promise.all(
    adapter.files.map(async (file) => ({
      path: file,
      content: await readRootFile(file),
    })),
  );

  return {
    html: markdown.render(stripFrontmatter(processed)),
    files,
  };
}

async function createProvider() {
  const tinymistPkg = join(
    root,
    "vendor",
    "tinymist",
    "crates",
    "tinymist",
    "pkg",
  );
  const tinymist = await import(
    pathToFileURL(join(tinymistPkg, "tinymist.js"))
  );
  const wasm = await readFile(join(tinymistPkg, "tinymist_bg.wasm"));

  return createTinymistWasmProvider({
    module: tinymist,
    moduleOrPath: wasm,
  });
}

function readRootFile(path) {
  return readFile(join(root, path), "utf8");
}

function stripFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, "");
}

function findRepositoryRoot() {
  const start = process.cwd();
  const candidates = [start, join(start, "..")];
  const root = candidates.find((candidate) =>
    existsSync(join(candidate, "examples")),
  );

  if (!root) {
    throw new Error(`Could not locate repository root from ${start}`);
  }

  return root;
}
