import { describe, expect, it } from 'vitest'
import { element, text } from '../src/hast.js'
import { applyTinymistAnnotations } from '../src/shiki-annotations.js'
import type { TinymistNode } from '../src/types/annotation.js'
import type { HastElement, HastNode } from '../src/types/hast.js'
import type { TinymistRendererHooks } from '../src/types/renderer.js'

describe('applyTinymistAnnotations', () => {
  it('applies completion, diagnostic, highlight, and hover annotations deterministically', () => {
    const line = element('span', {}, [text('#'), text('bad')])
    const codeElement = element('code', {}, [line, text('\n')])
    const rendererContext = { sentinel: true }
    const hookCalls: string[] = []
    const errors: Error[] = []
    const renderer: TinymistRendererHooks = {
      nodeHover(info, node) {
        expect(this).toBe(rendererContext)
        hookCalls.push(`hover:${info.markerId}`)
        return element('span', { class: 'hover' }, [node])
      },
      lineCompletion(completion) {
        hookCalls.push(`completion:${completion.markerId}`)
        return [element('div', { class: 'completion' }, [text('answer')])]
      },
      nodesHighlight(_highlight, nodes) {
        hookCalls.push('highlight')
        return [element('mark', { class: 'highlight' }, nodes)]
      },
      nodesDiagnostic(diagnostic, nodes) {
        hookCalls.push(`diagnostic:${diagnostic.message}`)
        return [element('span', { class: 'diagnostic' }, nodes)]
      },
      lineDiagnostic(diagnostic) {
        hookCalls.push(`lineDiagnostic:${diagnostic.message}`)
        return [element('div', { class: 'diagnostic-line' }, [text(diagnostic.message)])]
      },
    }

    applyTinymistAnnotations({
      codeElement,
      lines: [line],
      nodes: [
        completionNode(),
        hoverNode('hover-skipped'),
        diagnosticNode(),
        highlightNode(),
      ],
      renderer,
      rendererContext,
      onError: (error) => errors.push(error),
    })

    expect(errors).toEqual([])
    expect(hookCalls).toEqual([
      'completion:m-completion',
      'lineDiagnostic:bad diagnostic',
      'diagnostic:bad diagnostic',
      'highlight',
    ])
    expect(simplify(codeElement)).toEqual({
      tag: 'code',
      className: undefined,
      children: [
        {
          tag: 'span',
          className: undefined,
          children: [
            '#',
            {
              tag: 'mark',
              className: 'highlight',
              children: [
                {
                  tag: 'span',
                  className: 'diagnostic',
                  children: ['bad'],
                },
              ],
            },
          ],
        },
        {
          tag: 'div',
          className: 'diagnostic-line',
          children: ['bad diagnostic'],
        },
        {
          tag: 'div',
          className: 'completion',
          children: ['answer'],
        },
      ],
    })
  })

  it('reports missing tokens unless a line diagnostic can render without them', () => {
    const line = element('span', {}, [text('#ok')])
    const codeElement = element('code', {}, [line])
    const errors: Error[] = []

    applyTinymistAnnotations({
      codeElement,
      lines: [line],
      nodes: [hoverNode('missing', 20, 1)],
      renderer: {
        nodeHover: (_info, node) => node,
      },
      rendererContext: {},
      onError: (error) => errors.push(error),
    })
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('Cannot find tokens for node')

    errors.length = 0
    applyTinymistAnnotations({
      codeElement,
      lines: [line],
      nodes: [diagnosticNode(20, 1)],
      renderer: {
        nodeHover: (_info, node) => node,
        lineDiagnostic: (diagnostic) => [
          element('div', { class: 'diagnostic-line' }, [text(diagnostic.message)]),
        ],
      },
      rendererContext: {},
      onError: (error) => errors.push(error),
    })
    expect(errors).toEqual([])
    expect(JSON.stringify(codeElement)).toContain('diagnostic-line')
  })
})

function completionNode(): TinymistNode {
  return {
    type: 'completion',
    markerId: 'm-completion',
    line: 0,
    character: 1,
    length: 0,
    start: 1,
    items: [{ label: 'answer' }],
  }
}

function hoverNode(
  markerId = 'm-hover',
  character = 1,
  length = 3,
): TinymistNode {
  return {
    type: 'hover',
    markerId,
    line: 0,
    character,
    length,
    start: character,
    markdown: 'hover docs',
  }
}

function diagnosticNode(character = 1, length = 3): TinymistNode {
  return {
    type: 'diagnostic',
    line: 0,
    character,
    length,
    start: character,
    message: 'bad diagnostic',
  }
}

function highlightNode(): TinymistNode {
  return {
    type: 'highlight',
    line: 0,
    character: 1,
    length: 3,
    start: 1,
  }
}

function simplify(node: HastNode): unknown {
  if (node.type === 'text') {
    return node.value
  }

  return {
    tag: node.tagName,
    className: node.properties?.class,
    children: (node.children ?? []).map(simplify),
  }
}
