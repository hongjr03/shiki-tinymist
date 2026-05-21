import { describe, expect, it } from 'vitest'
import {
  parseFenceInfo,
  renderTinymistMarkdown,
  shouldRenderTinymistFence,
} from '../src/adapters/markdown.js'
import { tinymistMarkdownVitePlugin } from '../src/adapters/vite.js'
import { astroTinymist } from '../src/astro.js'
import {
  markdownItTinymist,
  renderMarkdownItTinymist,
  type MarkdownItLike,
} from '../src/markdown-it.js'
import { mdxTinymist, mdxTinymistVitePlugin } from '../src/mdx.js'
import { nextTinymist } from '../src/next.js'
import { nuxtTinymist } from '../src/nuxt.js'
import { rehypeTinymist } from '../src/rehype.js'
import { vitepressTinymist } from '../src/vitepress.js'
import type { TinymistProvider } from '../src/types.js'

const typstFeatureBlock = `#let answer = 42
#answer
// ^?
#ans
// ^|
#answer
// ^^^^^^
#bad`

const markdown = `before

\`\`\`typst tinymist
${typstFeatureBlock}
\`\`\`

\`\`\`js
console.log(1)
\`\`\`
`

const provider: TinymistProvider = {
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
    completions: [
      {
        markerId: 'm2',
        items: [
          {
            label: 'answer',
            kind: 'variable',
            detail: 'int',
          },
        ],
      },
    ],
    diagnostics: [
      {
        line: 5,
        column: 1,
        length: 1,
        severity: 'warning',
        message: 'Expected an expression.',
      },
    ],
  }),
}

describe('framework adapters', () => {
  it('renders Typst fences before markdown frameworks compile them', async () => {
    const html = await renderTinymistMarkdown(markdown, {
      explicitTrigger: true,
      provider,
    })

    expect(html).toContain('tinymist lsp')
    expect(html).toContain('tinymist-popup-container')
    expect(html).toContain('tinymist-completion-line')
    expect(html).toContain('tinymist-highlighted')
    expect(html).toContain('tinymist-diagnostic-line')
    expect(html).toContain('Expected an expression.')
    expect(html).not.toContain('// ^?')
    expect(html).toContain('```js')
  })

  it('keeps explicit trigger and disable trigger semantics', () => {
    expect(
      shouldRenderTinymistFence(parseFenceInfo('typst tinymist'), {
        explicitTrigger: true,
      }),
    ).toBe(true)
    expect(
      shouldRenderTinymistFence(parseFenceInfo('typst'), {
        explicitTrigger: true,
      }),
    ).toBe(false)
    expect(shouldRenderTinymistFence(parseFenceInfo('typst no-tinymist'))).toBe(
      false,
    )
  })

  it('adds an async markdown-it render helper', async () => {
    const md: MarkdownItLike = {
      render: (input) => `<main>${input}</main>`,
    }

    const html = await renderMarkdownItTinymist(md, markdown, {
      explicitTrigger: true,
      provider,
    })

    expect(html).toContain('<main>')
    expect(html).toContain('tinymist-popup-container')

    markdownItTinymist({ explicitTrigger: true, provider })(md)
    await expect(md.renderTinymist?.(markdown)).resolves.toContain(
      'tinymist-completion-line',
    )
  })

  it('replaces rehype pre/code nodes with rendered Shiki HAST', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {
                className: ['language-typst'],
                dataMeta: 'tinymist',
              },
              children: [{ type: 'text', value: typstFeatureBlock }],
            },
          ],
        },
      ],
    }

    await rehypeTinymist({ explicitTrigger: true, provider })()(tree)

    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'pre',
    })
    expect(JSON.stringify(tree.children[0])).toContain(
      'tinymist-popup-container',
    )
  })

  it('exposes Vite-style framework adapters', async () => {
    const vite = tinymistMarkdownVitePlugin({ provider })
    const transformed = await vite.transform(markdown, '/docs/page.md')
    const skipped = await vite.transform(markdown, '/docs/page.txt')

    expect(transformed?.code).toContain('tinymist-popup-container')
    expect(skipped).toBeUndefined()
    expect(vitepressTinymist().name).toBe('shiki-tinymist:vitepress')
    expect(mdxTinymistVitePlugin().name).toBe('shiki-tinymist:mdx')
  })

  it('exposes rehype-compatible MDX, Next, and Nuxt adapters', () => {
    expect(typeof mdxTinymist()()).toBe('function')
    expect(typeof nextTinymist()()).toBe('function')
    expect(typeof nuxtTinymist()()).toBe('function')
  })

  it('exposes an Astro integration wrapper', () => {
    let config: Record<string, unknown> | undefined
    astroTinymist().hooks['astro:config:setup']({
      updateConfig: (value) => {
        config = value
      },
    })

    expect(config).toMatchObject({
      markdown: {
        rehypePlugins: [expect.any(Function)],
      },
    })
  })
})
