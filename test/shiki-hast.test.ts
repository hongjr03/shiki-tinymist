import { describe, expect, it } from 'vitest'
import { element, text } from '../src/hast.js'
import {
  addClass,
  createLineTokenSpans,
  insertNodesAfterLine,
  locateTextTokens,
  wrapLineTokens,
} from '../src/shiki-hast.js'
import type { HastElement, HastNode } from '../src/types/hast.js'

describe('shiki HAST helpers', () => {
  it('tracks flattened token spans and locates ranged or zero-length nodes', () => {
    const nestedToken = element('span', {}, [text('wer')])
    const line = element('span', {}, [
      text('#'),
      element('span', {}, [text('ans'), nestedToken]),
    ])
    const spans = createLineTokenSpans([line])

    expect(
      spans.map((span) => ({
        line: span.line,
        charStart: span.charStart,
        charEnd: span.charEnd,
        text: tokenText(span.token),
      })),
    ).toEqual([
      { line: 0, charStart: 0, charEnd: 1, text: '#' },
      { line: 0, charStart: 1, charEnd: 4, text: 'ans' },
      { line: 0, charStart: 4, charEnd: 7, text: 'wer' },
    ])

    expect(
      locateTextTokens(spans, {
        type: 'highlight',
        line: 0,
        character: 1,
        length: 6,
        start: 1,
      }).map(tokenText),
    ).toEqual(['ans', 'wer'])
    expect(
      locateTextTokens(spans, {
        type: 'completion',
        markerId: 'm1',
        line: 0,
        character: 4,
        length: 0,
        start: 4,
        items: [],
      }).map(tokenText),
    ).toEqual(['ans'])
  })

  it('inserts nodes after a line and removes Shiki newline separators', () => {
    const firstLine = element('span', {}, [text('first')])
    const secondLine = element('span', {}, [text('second')])
    const inserted = element('div', {}, [text('inserted')])
    const code = element('code', {}, [firstLine, text('\n'), secondLine])
    let missing = 0

    insertNodesAfterLine(code, [firstLine, secondLine], 0, [inserted], () => {
      missing += 1
    })

    expect(missing).toBe(0)
    expect(code.children).toEqual([firstLine, inserted, secondLine])
  })

  it('reports missing lines and wraps token ranges without shifting siblings', () => {
    const line = element('span', {}, [text('#'), text('answer')])
    const code = element('code', {}, [])
    let missing = 0

    insertNodesAfterLine(code, [line], 0, [text('x')], () => {
      missing += 1
    })
    expect(missing).toBe(1)

    wrapLineTokens(
      [line],
      {
        type: 'highlight',
        line: 0,
        character: 1,
        length: 6,
        start: 1,
      },
      (children) => [element('mark', {}, children)],
    )

    expect(line.children).toEqual([
      text('#'),
      element('mark', {}, [text('answer')]),
    ])
  })

  it('deduplicates classes across array and string class properties', () => {
    const arrayClass = element('pre', { class: ['tinymist'] }, [])
    addClass(arrayClass, ['tinymist', 'lsp'])
    expect(arrayClass.properties?.class).toEqual(['tinymist', 'lsp'])

    const stringClass = element('pre', { class: 'tinymist' }, [])
    addClass(stringClass, ['tinymist', 'lsp'])
    expect(stringClass.properties?.class).toBe('tinymist lsp')
  })
})

function tokenText(token: HastNode): string {
  if (token.type === 'text') {
    return token.value
  }

  return (token.children ?? []).map(tokenText).join('')
}
