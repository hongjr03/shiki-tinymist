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
})
