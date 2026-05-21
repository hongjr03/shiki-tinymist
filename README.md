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

## Status

This is an initial scaffold. The public API is expected to change while the
Tinymist query model and renderer output settle.

## Why a Prepare Step?

Shiki transformer hooks are synchronous, while WASM/LSP calls are asynchronous.
The package therefore queries Tinymist before calling `codeToHtml`, then passes
a synchronous transformer to Shiki.
