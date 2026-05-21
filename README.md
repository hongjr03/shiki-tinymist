# shiki-tinymist

A Shiki transformer for Typst code blocks powered by the Tinymist WASM language
server.

The package queries the Tinymist WASM LSP bridge before Shiki renders a code
block, then attaches hover data at `// ^?` marker positions.

## Install

```sh
npm install shiki-tinymist shiki tinymist
```

The WASM package must expose `TinymistLanguageServer`. The current Tinymist
source builds this package with `wasm-pack`; older npm releases may not expose
that class yet.

## Usage

```ts
import { codeToHtml } from 'shiki'
import { createTinymistTransformer } from 'shiki-tinymist'

const code = `#let answer = 42
//   ^?`

const transformer = await createTinymistTransformer(code)

const html = await codeToHtml(code, {
  lang: 'typst',
  theme: 'vitesse-dark',
  transformers: [transformer],
})
```

When used in Markdown integrations, set `explicitTrigger: true` to only run on
code fences with `tinymist` or `typst-lsp` in the meta string.

````md
```typst tinymist
#let answer = 42
//   ^?
```
````

Import the default styles:

```ts
import 'shiki-tinymist/style-rich.css'
```

For scrollable code containers, install the small floating client so hover
popups are moved outside the code block before they are positioned:

```ts
import { initTinymistFloating } from 'shiki-tinymist/client'

initTinymistFloating()
```

## Framework Adapters

Tinymist queries are asynchronous, so the framework adapters prepare Typst
fences before the normal Markdown renderer finishes.

### Rehype

```ts
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { rehypeTinymist } from 'shiki-tinymist/rehype'

const html = await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeTinymist({ explicitTrigger: true }))
  .use(rehypeStringify)
  .process(markdown)
```

### markdown-it

`markdown-it` renders synchronously, so the adapter adds an async
`renderTinymist` helper instead of replacing the sync fence renderer.

```ts
import MarkdownIt from 'markdown-it'
import { markdownItTinymist } from 'shiki-tinymist/markdown-it'

const md = new MarkdownIt({ html: true })
md.use(markdownItTinymist({ explicitTrigger: true }))

const html = await md.renderTinymist(markdown)
```

### VitePress

```ts
import { defineConfig } from 'vitepress'
import { vitepressTinymist } from 'shiki-tinymist/vitepress'

export default defineConfig({
  vite: {
    plugins: [vitepressTinymist({ explicitTrigger: true })],
  },
})
```

### Astro

```ts
import { defineConfig } from 'astro/config'
import { astroTinymist } from 'shiki-tinymist/astro'

export default defineConfig({
  integrations: [astroTinymist({ explicitTrigger: true })],
})
```

### MDX

```ts
import { mdxTinymist } from 'shiki-tinymist/mdx'

export default {
  rehypePlugins: [mdxTinymist({ explicitTrigger: true })],
}
```

### Next

```ts
import createMDX from '@next/mdx'
import { nextTinymist } from 'shiki-tinymist/next'

const withMDX = createMDX({
  options: {
    rehypePlugins: [nextTinymist({ explicitTrigger: true })],
  },
})

export default withMDX({
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
})
```

### Nuxt

```ts
export default defineNuxtConfig({
  css: ['shiki-tinymist/style-rich.css'],
  content: {
    build: {
      markdown: {
        rehypePlugins: {
          'shiki-tinymist/nuxt': { explicitTrigger: true },
        },
      },
    },
  },
})
```

Full-feature examples for every adapter live in `examples/`.

## Marker Syntax

Use a Typst line comment under the target code.

Hover query:

```typst
#let answer = 42
//   ^?
```

Completion query:

```typst
#ans
//    ^|
```

Static highlight:

```typst
#answer
// ^^^^^^
```

Marker lines are removed before Shiki highlights the code.

## Twoslash Compatibility

`shiki-tinymist` supports the Twoslash-style notation that maps cleanly to
Typst/Tinymist:

| Notation                                  | Status     | Behavior                                                                                   |
| ----------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `// ^?`                                   | supported  | Queries Tinymist hover and renders it on the target range.                                 |
| `// ^\|`                                  | supported  | Queries Tinymist completions and renders up to 5 inline items by default.                  |
| `// ^^^`                                  | supported  | Highlights the target range without an LSP query.                                          |
| `// ---cut---` / `// ---cut-before---`    | supported  | Hides previous lines from output while keeping them in the Tinymist query.                 |
| `// ---cut-after---`                      | supported  | Hides following lines from output while keeping them in the Tinymist query.                |
| `// ---cut-start---` / `// ---cut-end---` | supported  | Hides paired output ranges while keeping them in the Tinymist query.                       |
| `// @filename: name.typ`                  | supported  | Splits the query into virtual files; the filename comment remains visible unless cut away. |
| `// @noErrors`                            | supported  | Suppresses rendered diagnostics.                                                           |
| `// @errors: text`                        | supported  | Renders diagnostics whose code or message includes one of the listed tokens.               |
| `// @showEmit` / `// @showEmittedFile`    | recognized | Removed from output, but no Typst emit replacement is produced.                            |
| Other `// @name` options                  | recognized | Removed from output and exposed in `ParsedTinymistCode.directives`.                        |

## Development

Tinymist is tracked as a git submodule. Its WASM package is intentionally not
built by `npm run build`; build it manually when setting up the repo or when
updating the submodule.

```sh
git submodule update --init --recursive
npm run tinymist:build
npm install
npm run demo
npm test
npm run typecheck
npm run build
```

`npm run demo` writes `demo/index.html`.

## Why a Prepare Step?

Shiki transformer hooks are synchronous, while WASM/LSP calls are asynchronous.
The package therefore queries Tinymist before calling `codeToHtml`, then passes
a synchronous transformer to Shiki.
