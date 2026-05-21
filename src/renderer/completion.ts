import { className, element, extendHastElement, text } from '../hast.js'
import type { TinymistCompletionNode } from '../types/annotation.js'
import type { HastElement, HastNode } from '../types/hast.js'
import type { TinymistCompletionItem } from '../types/query.js'
import type { TinymistRichRendererOptions } from '../types/renderer.js'

export interface RenderCompletionOptions {
  classExtra: string
  completionLimit: number
  hast?: TinymistRichRendererOptions['hast']
}

export function renderCompletionLine(
  completion: TinymistCompletionNode,
  options: RenderCompletionOptions,
): HastElement | undefined {
  const items = completion.items.slice(0, options.completionLimit)
  if (!items.length) {
    return undefined
  }

  return extendHastElement(
    options.hast?.completionLine,
    element(
      'div',
      {
        class: className(
          'tinymist-meta-line',
          'tinymist-completion-line',
          options.classExtra,
        ),
      },
      items.map((item) => renderCompletionItem(item, options)),
    ),
  )
}

function renderCompletionItem(
  item: TinymistCompletionItem,
  options: RenderCompletionOptions,
): HastElement {
  const children: HastNode[] = []

  if (item.kind) {
    children.push(
      element('span', { class: 'tinymist-completion-kind' }, [text(item.kind)]),
    )
  }

  children.push(
    element('span', { class: 'tinymist-completion-label' }, [text(item.label)]),
  )

  if (item.detail) {
    children.push(
      element('span', { class: 'tinymist-completion-detail' }, [
        text(item.detail),
      ]),
    )
  }

  return extendHastElement(
    options.hast?.completionItem,
    element(
      'span',
      {
        class: className(
          'tinymist-completion-item',
          item.deprecated ? 'tinymist-completion-deprecated' : undefined,
          options.classExtra,
        ),
        ...(item.documentation ? { title: item.documentation } : {}),
      },
      children,
    ),
  )
}
