import { describe, expect, it } from 'vitest'
import { element, rendererRich, text } from '../src/renderer.js'
import type { HastElement, TinymistRendererHooks } from '../src/types.js'

describe('rendererRich', () => {
  it('renders hover prose and fenced code through separate popup nodes', () => {
    let highlightedLang: string | undefined
    const renderer = rendererRich({
      renderMarkdown: (markdown) => [element('em', {}, [text(markdown)])],
    })
    const token = element('span', {}, [text('answer')])
    const rendered = renderer.nodeHover.call(
      {
        options: { lang: 'typst' },
        codeToHast: (code: string, options: Record<string, unknown>) => {
          highlightedLang = options.lang as string
          return {
            children: [
              element('pre', {}, [
                element('code', {}, [element('b', {}, [text(code)])]),
              ]),
            ],
          }
        },
      },
      {
        type: 'hover',
        markerId: 'm1',
        line: 0,
        character: 0,
        length: 6,
        start: 0,
        markdown: 'A value\n\n```typc\nlet answer = int;\n```',
      },
      token,
    ) as HastElement

    const serialized = JSON.stringify(rendered)
    expect(highlightedLang).toBe('typst')
    expect(serialized).toContain('tinymist-hover')
    expect(serialized).toContain('tinymist-popup-docs')
    expect(serialized).toContain('tinymist-popup-code')
    expect(serialized).toContain('A value')
    expect(serialized).toContain('let answer = int;')
  })

  it('applies the completion limit before rendering completion items', () => {
    const renderer = rendererRich({ completionLimit: 1 })
    const lineCompletion = requireHook(renderer, 'lineCompletion')
    const line = lineCompletion({
      type: 'completion',
      markerId: 'm1',
      line: 0,
      character: 0,
      length: 0,
      start: 0,
      items: [
        { label: 'first', kind: 'variable' },
        { label: 'second', kind: 'function' },
      ],
    })

    const serialized = JSON.stringify(line)
    expect(serialized).toContain('first')
    expect(serialized).not.toContain('second')
  })
})

function requireHook<K extends keyof TinymistRendererHooks>(
  renderer: TinymistRendererHooks,
  name: K,
): NonNullable<TinymistRendererHooks[K]> {
  const hook = renderer[name]
  if (!hook) {
    throw new Error(`Missing renderer hook ${name}`)
  }
  return hook as NonNullable<TinymistRendererHooks[K]>
}
