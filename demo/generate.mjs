import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { codeToHtml } from 'shiki'
import {
  createTinymistTransformer,
  createTinymistWasmProvider,
} from '../dist/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(here, '..')
const outputPath = join(here, 'index.html')
const tinymistPkg = join(
  projectRoot,
  'vendor',
  'tinymist',
  'crates',
  'tinymist',
  'pkg',
)

const code = `// @noErrors
#let hidden = 42
// ---cut---
#let answer = hidden
#answer
// ^?

#let greet(name) = [Hello, #name]
#greet("Typst")
// ^?

#ans
//    ^|

#answer
// ^^^^^^`

const tinymist = await import(pathToFileURL(join(tinymistPkg, 'tinymist.js')))
const wasm = await readFile(join(tinymistPkg, 'tinymist_bg.wasm'))
const transformer = await createTinymistTransformer(code, {
  provider: createTinymistWasmProvider({
    module: tinymist,
    moduleOrPath: wasm,
  }),
})
const highlighted = await codeToHtml(code, {
  lang: 'typst',
  theme: 'vitesse-dark',
  transformers: [transformer],
})
const tinymistCss = await readFile(join(projectRoot, 'style.css'), 'utf8')
const tinymistClient = await readFile(
  join(projectRoot, 'dist', 'client.js'),
  'utf8',
)

await mkdir(here, { recursive: true })
await writeFile(
  outputPath,
  renderPage({
    highlighted,
    tinymistCss,
    tinymistClient,
  }),
)

console.log(`Wrote ${outputPath}`)

function renderPage({ highlighted, tinymistCss, tinymistClient }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>shiki-tinymist demo</title>
    <style>
      ${tinymistCss}

      :root {
        color-scheme: dark;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        background: #151515;
        color: #ededed;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 48px 24px;
        box-sizing: border-box;
      }

      main {
        width: min(860px, 100%);
      }

      header {
        margin-bottom: 20px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 30px;
        font-weight: 650;
        line-height: 1.1;
      }

      p {
        margin: 0;
        color: #b8b8b8;
        line-height: 1.6;
      }

      .frame {
        border: 1px solid #333;
        border-radius: 8px;
        overflow: auto;
        background: #121212;
      }

      .shiki {
        margin: 0;
        padding: 22px 24px;
        font-size: 15px;
        line-height: 1.75;
      }

      code {
        font-family:
          "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono",
          monospace;
      }

      .tinymist .tinymist-popup-code,
      .tinymist .tinymist-popup-docs {
        font-family:
          "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono",
          monospace;
        font-size: 12px;
        line-height: 1.55;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>shiki-tinymist</h1>
        <p>Hover the underlined Typst identifiers to see Tinymist WASM hover output.</p>
      </header>
      <div class="frame">
        ${highlighted}
      </div>
    </main>
    <script>
      ${inlineClient(tinymistClient)}
    </script>
  </body>
</html>
`
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
