import { codeToHtml } from 'shiki'
import { describe, expect, it } from 'vitest'
import {
  createTinymistTransformer,
  transformerTinymist,
} from '../src/transformer.js'

describe('transformerTinymist', () => {
  it('wraps the LSP hover range instead of only the marker caret', async () => {
    const code = `#let answer = 42
#answer
// ^?`

    const transformer = await createTinymistTransformer(code, {
      provider: {
        query: () => ({
          hovers: [
            {
              markerId: 'm1',
              markdown: '```typc\nlet answer = int;\n```',
              line: 2,
              column: 2,
              length: 6,
            },
          ],
        }),
      },
    })

    const html = await codeToHtml(code, {
      lang: 'typst',
      theme: 'vitesse-dark',
      transformers: [transformer],
    })

    expect(html).toContain('tinymist lsp')
    expect(html).toContain('tinymist-popup-container')
    expect(html).toContain('let answer = int;')
    expect(html).not.toContain('// ^?')
    expect(html).toMatch(/tinymist-hover[\s\S]*answer[\s\S]*<\/span>/)
  })

  it('renders completion results from ^| markers', async () => {
    const code = `#ans
// ^|`

    const transformer = await createTinymistTransformer(code, {
      provider: {
        query: () => ({
          hovers: [],
          completions: [
            {
              markerId: 'm1',
              items: [
                {
                  label: 'answer',
                  kind: 'variable',
                  detail: 'int',
                },
              ],
            },
          ],
        }),
      },
    })

    const html = await codeToHtml(code, {
      lang: 'typst',
      theme: 'vitesse-dark',
      transformers: [transformer],
    })

    expect(html).toContain('tinymist-completion-line')
    expect(html).toContain('tinymist-completion-item')
    expect(html).toContain('answer')
    expect(html).toContain('int')
    expect(html).not.toContain('// ^|')
  })

  it('renders static highlighted ranges from bare carets', async () => {
    const code = `#answer
// ^^^^^^`

    const transformer = await createTinymistTransformer(code)

    const html = await codeToHtml(code, {
      lang: 'typst',
      theme: 'vitesse-dark',
      transformers: [transformer],
    })

    expect(html).toContain('tinymist-highlighted')
    expect(html).not.toContain('// ^^^^^^')
  })

  it('renders diagnostics as token decoration and an inserted line', async () => {
    const html = await codeToHtml('#bad', {
      lang: 'typst',
      theme: 'vitesse-dark',
      transformers: [
        transformerTinymist({
          queryResult: {
            hovers: [],
            diagnostics: [
              {
                line: 1,
                column: 1,
                length: 1,
                severity: 'warning',
                message: 'Expected an expression.',
              },
            ],
          },
        }),
      ],
    })

    expect(html).toContain('tinymist-diagnostic')
    expect(html).toContain('tinymist-diagnostic-line')
    expect(html).toContain('Expected an expression.')
  })

  it('supports @noErrors and @errors diagnostic directives', async () => {
    const hiddenDiagnostics = await codeToHtml(
      `// @noErrors
#bad`,
      {
        lang: 'typst',
        theme: 'vitesse-dark',
        transformers: [
          transformerTinymist({
            queryResult: {
              hovers: [],
              diagnostics: [
                {
                  line: 1,
                  column: 1,
                  message: 'Expected an expression.',
                },
              ],
            },
          }),
        ],
      },
    )

    expect(hiddenDiagnostics).not.toContain('tinymist-diagnostic-line')

    const expectedDiagnostics = await codeToHtml(
      `// @errors: expression
#bad`,
      {
        lang: 'typst',
        theme: 'vitesse-dark',
        transformers: [
          transformerTinymist({
            queryResult: {
              hovers: [],
              diagnostics: [
                {
                  line: 1,
                  column: 1,
                  message: 'Expected an expression.',
                },
                {
                  line: 1,
                  column: 1,
                  message: 'Unrelated warning.',
                },
              ],
            },
          }),
        ],
      },
    )

    expect(expectedDiagnostics).toContain('Expected an expression.')
    expect(expectedDiagnostics).not.toContain('Unrelated warning.')
  })

  it('does not render diagnostics for cut-hidden lines', async () => {
    const html = await codeToHtml(
      `#hidden
// ---cut---
#shown`,
      {
        lang: 'typst',
        theme: 'vitesse-dark',
        transformers: [
          transformerTinymist({
            queryResult: {
              hovers: [],
              diagnostics: [
                {
                  line: 1,
                  column: 1,
                  message: 'Hidden diagnostic.',
                },
              ],
            },
          }),
        ],
      },
    )

    expect(html).not.toContain('Hidden diagnostic.')
  })

  it('passes cut-hidden code and filename sections to the provider', async () => {
    let queryInput: unknown
    const code = `// @filename: lib.typ
#let hidden = 1
// ---cut---
#hidden
// ^?`

    await createTinymistTransformer(code, {
      provider: {
        query: (input) => {
          queryInput = input
          return { hovers: [] }
        },
      },
    })

    expect(queryInput).toMatchObject({
      markers: [
        {
          fileName: 'lib.typ',
          line: 1,
          queryLine: 2,
        },
      ],
      files: [
        { fileName: 'index.typ', code: '' },
        {
          fileName: 'lib.typ',
          code: `#let hidden = 1
#hidden`,
        },
      ],
    })
  })
})
