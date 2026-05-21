import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import MarkdownIt from 'markdown-it'
import {
  createTinymistWasmProvider,
  renderTinymistMarkdown,
} from '../dist/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const dist = join(here, 'dist')
const md = new MarkdownIt({ html: true })

const adapters = [
  {
    id: 'rehype',
    name: 'Rehype',
    entry: 'shiki-tinymist/rehype',
    summary:
      'Standard rehype plugin that replaces pre/code nodes with Shiki HAST.',
    content: 'examples/rehype/full-feature.md',
    files: ['examples/rehype/processor.mjs', 'examples/rehype/full-feature.md'],
  },
  {
    id: 'markdown-it',
    name: 'markdown-it',
    entry: 'shiki-tinymist/markdown-it',
    summary: 'Async renderTinymist helper for markdown-it sync rendering.',
    content: 'examples/markdown-it/full-feature.md',
    files: [
      'examples/markdown-it/demo.mjs',
      'examples/markdown-it/full-feature.md',
    ],
  },
  {
    id: 'vitepress',
    name: 'VitePress',
    entry: 'shiki-tinymist/vitepress',
    summary: 'Vite pre-transform for VitePress markdown-it content.',
    content: 'examples/vitepress/full-feature.md',
    files: [
      'examples/vitepress/.vitepress/config.mts',
      'examples/vitepress/.vitepress/theme/index.ts',
      'examples/vitepress/full-feature.md',
    ],
  },
  {
    id: 'astro',
    name: 'Astro',
    entry: 'shiki-tinymist/astro',
    summary: 'Astro integration that registers the rehype adapter.',
    content: 'examples/astro/src/pages/full-feature.md',
    files: [
      'examples/astro/astro.config.mjs',
      'examples/astro/src/layouts/Base.astro',
      'examples/astro/src/pages/full-feature.md',
    ],
  },
  {
    id: 'mdx',
    name: 'MDX',
    entry: 'shiki-tinymist/mdx',
    summary:
      'Rehype-compatible MDX plugin, plus an optional Vite pre-transform.',
    content: 'examples/mdx/full-feature.mdx',
    files: ['examples/mdx/mdx.config.mjs', 'examples/mdx/full-feature.mdx'],
  },
  {
    id: 'next',
    name: 'Next',
    entry: 'shiki-tinymist/next',
    summary: 'Rehype plugin for @next/mdx configuration.',
    content: 'examples/next/app/page.mdx',
    files: [
      'examples/next/next.config.mjs',
      'examples/next/app/layout.tsx',
      'examples/next/app/tinymist-client.tsx',
      'examples/next/app/page.mdx',
    ],
  },
  {
    id: 'nuxt',
    name: 'Nuxt',
    entry: 'shiki-tinymist/nuxt',
    summary: 'Nuxt Content rehype plugin export for markdown builds.',
    content: 'examples/nuxt/content/full-feature.md',
    files: [
      'examples/nuxt/nuxt.config.ts',
      'examples/nuxt/plugins/tinymist.client.ts',
      'examples/nuxt/content/full-feature.md',
    ],
  },
]

const provider = await createProvider()
const style = await readFile(join(root, 'style-rich.css'), 'utf8')
const client = await readFile(join(root, 'dist', 'client.js'), 'utf8')
const renderedAdapters = []

for (const adapter of adapters) {
  const markdown = await readFile(join(root, adapter.content), 'utf8')
  const processed = await renderTinymistMarkdown(markdown, {
    explicitTrigger: true,
    provider,
  })
  const files = await Promise.all(
    adapter.files.map(async (file) => {
      return {
        path: file,
        content: await readFile(join(root, file), 'utf8'),
      }
    }),
  )

  renderedAdapters.push({
    ...adapter,
    rendered: md.render(stripFrontmatter(processed)),
    files,
  })
}

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await writeFile(join(dist, '.nojekyll'), '')
await writeFile(
  join(dist, 'index.html'),
  renderPage({
    adapters: renderedAdapters,
    style,
    client,
  }),
)

console.log(`Wrote ${relative(root, join(dist, 'index.html'))}`)

async function createProvider() {
  const tinymistPkg = join(
    root,
    'vendor',
    'tinymist',
    'crates',
    'tinymist',
    'pkg',
  )
  const tinymist = await import(pathToFileURL(join(tinymistPkg, 'tinymist.js')))
  const wasm = await readFile(join(tinymistPkg, 'tinymist_bg.wasm'))

  return createTinymistWasmProvider({
    module: tinymist,
    moduleOrPath: wasm,
  })
}

function renderPage({ adapters, style, client }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>shiki-tinymist preview</title>
    <style>
      ${style}

      :root {
        color-scheme: dark;
        --bg: #12110f;
        --panel: #1b1915;
        --panel-strong: #242119;
        --line: #3a3529;
        --text: #f4efe4;
        --muted: #b9ad98;
        --accent: #e8c46f;
        --accent-2: #7fd3b6;
        --code: #0f0f0e;
        font-family:
          ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
        background:
          linear-gradient(90deg, rgba(232, 196, 111, 0.08) 1px, transparent 1px),
          linear-gradient(rgba(127, 211, 182, 0.05) 1px, transparent 1px),
          var(--bg);
        background-size: 44px 44px;
        color: var(--text);
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        min-height: 100vh;
      }

      a {
        color: inherit;
      }

      .shell {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
      }

      header {
        padding: 64px 0 34px;
        border-bottom: 1px solid var(--line);
      }

      .eyebrow {
        margin: 0 0 14px;
        color: var(--accent-2);
        font:
          700 12px/1.2 ui-monospace, SFMono-Regular, Consolas,
          "Liberation Mono", monospace;
        text-transform: uppercase;
        letter-spacing: 0;
      }

      h1 {
        width: min(760px, 100%);
        margin: 0;
        font-size: 76px;
        line-height: 0.92;
        font-weight: 700;
      }

      .lead {
        width: min(760px, 100%);
        margin: 22px 0 0;
        color: var(--muted);
        font-size: 18px;
        line-height: 1.65;
      }

      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 30px;
      }

      nav a {
        border: 1px solid var(--line);
        background: rgba(36, 33, 25, 0.84);
        padding: 9px 12px;
        border-radius: 6px;
        color: var(--text);
        text-decoration: none;
        font:
          700 13px/1 ui-monospace, SFMono-Regular, Consolas,
          "Liberation Mono", monospace;
      }

      main {
        padding: 28px 0 72px;
      }

      .adapter {
        display: grid;
        grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
        gap: 26px;
        padding: 42px 0;
        border-bottom: 1px solid var(--line);
      }

      .adapter h2 {
        margin: 0;
        font-size: 34px;
        line-height: 1;
      }

      .adapter-meta {
        position: sticky;
        top: 18px;
        align-self: start;
      }

      .entry {
        display: inline-block;
        margin-top: 14px;
        color: var(--accent);
        font:
          700 13px/1.35 ui-monospace, SFMono-Regular, Consolas,
          "Liberation Mono", monospace;
      }

      .summary {
        margin: 16px 0 0;
        color: var(--muted);
        font-size: 16px;
        line-height: 1.58;
      }

      .preview {
        border: 1px solid var(--line);
        border-radius: 8px;
        overflow: auto;
        background: var(--code);
      }

      .preview h1 {
        margin: 0;
        padding: 18px 20px 0;
        font-size: 20px;
        line-height: 1.2;
      }

      .preview .shiki {
        margin: 0;
        padding: 20px;
        font-size: 14px;
        line-height: 1.72;
      }

      .tinymist .tinymist-popup-container {
        --tinymist-popup-bg: #fbf5e9;
        --tinymist-popup-color: #1e1b16;
        --tinymist-border-color: #d8c7a4;
      }

      details {
        margin-top: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
      }

      summary {
        cursor: pointer;
        padding: 12px 14px;
        color: var(--accent-2);
        font:
          700 13px/1.2 ui-monospace, SFMono-Regular, Consolas,
          "Liberation Mono", monospace;
      }

      .source-file {
        border-top: 1px solid var(--line);
      }

      .source-title {
        padding: 10px 14px;
        color: var(--muted);
        font:
          700 12px/1.2 ui-monospace, SFMono-Regular, Consolas,
          "Liberation Mono", monospace;
      }

      pre.source {
        margin: 0;
        max-height: 420px;
        overflow: auto;
        padding: 14px;
        background: #0c0c0b;
        color: #e8deca;
        font:
          12px/1.65 ui-monospace, SFMono-Regular, Consolas,
          "Liberation Mono", monospace;
      }

      footer {
        padding: 24px 0 46px;
        color: var(--muted);
        font-size: 14px;
      }

      @media (max-width: 860px) {
        header {
          padding-top: 42px;
        }

        h1 {
          font-size: 46px;
        }

        .adapter {
          grid-template-columns: 1fr;
        }

        .adapter-meta {
          position: static;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="shell">
        <p class="eyebrow">GitHub Pages preview</p>
        <h1>shiki-tinymist adapter matrix</h1>
        <p class="lead">
          Rendered Typst language-service examples for every integration entry.
          Hover underlined identifiers to verify Tinymist WASM hovers, completions,
          diagnostics, highlights, cut directives, and virtual files.
        </p>
        <nav aria-label="Adapter navigation">
          ${adapters
            .map(
              (adapter) =>
                `<a href="#${adapter.id}">${escapeHtml(adapter.name)}</a>`,
            )
            .join('')}
        </nav>
      </div>
    </header>
    <main class="shell">
      ${adapters.map(renderAdapter).join('')}
    </main>
    <footer class="shell">
      Built from local examples with Tinymist WASM and Shiki.
    </footer>
    <script>
      ${inlineClient(client)}
    </script>
  </body>
</html>
`
}

function renderAdapter(adapter) {
  return `<section class="adapter" id="${adapter.id}">
  <div class="adapter-meta">
    <h2>${escapeHtml(adapter.name)}</h2>
    <code class="entry">${escapeHtml(adapter.entry)}</code>
    <p class="summary">${escapeHtml(adapter.summary)}</p>
  </div>
  <div>
    <div class="preview">${adapter.rendered}</div>
    <details>
      <summary>Source files</summary>
      ${adapter.files.map(renderSourceFile).join('')}
    </details>
  </div>
</section>`
}

function renderSourceFile(file) {
  return `<div class="source-file">
  <div class="source-title">${escapeHtml(file.path)}</div>
  <pre class="source"><code>${escapeHtml(file.content)}</code></pre>
</div>`
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n+/, '')
}

function inlineClient(script) {
  return script
    .replace(
      /\nexport \{\n  initTinymistFloating\n\};\n?/,
      '\ninitTinymistFloating()\n',
    )
    .replace(/\n\/\/# sourceMappingURL=client\.js\.map\s*$/, '')
    .replaceAll('</script>', '<\\/script>')
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
