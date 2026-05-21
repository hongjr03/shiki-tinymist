import type { ShikiTransformer } from 'shiki'
import { splitTokens } from '@shikijs/core'
import {
  defaultTinymistLangAlias,
  normalizeTinymistLanguage,
  shouldTransformTinymistBlock,
} from './activation.js'
import { createTinymistReturnFromCode } from './annotations.js'
import { rendererRich } from './renderer.js'
import { applyTinymistAnnotations } from './shiki-annotations.js'
import {
  addClass,
  getShikiLanguage,
  getShikiMeta,
} from './shiki-hast.js'
import { prepareTinymistCode } from './query.js'
import type {
  CreateTinymistTransformerOptions,
  HastElement,
  TinymistHover,
  TinymistShikiReturn,
  TransformerTinymistOptions,
} from './types.js'

export { prepareTinymistCode } from './query.js'

export async function createTinymistTransformer(
  code: string,
  options: CreateTinymistTransformerOptions = {},
): Promise<ShikiTransformer> {
  const result = await prepareTinymistCode(code, options)

  return transformerTinymist({
    ...options,
    result,
  })
}

export function transformerTinymist(
  options: TransformerTinymistOptions = {},
): ShikiTransformer {
  const langAlias = options.langAlias ?? defaultTinymistLangAlias
  const renderer = options.renderer ?? rendererRich()
  const throws = options.throws ?? true
  const onTinymistError =
    options.onTinymistError ||
    (throws
      ? (error: unknown) => {
          throw error
        }
      : () => undefined)
  const onShikiError =
    options.onShikiError ||
    (throws
      ? (error: unknown) => {
          throw error
        }
      : () => undefined)

  const map = new WeakMap<object, TinymistShikiReturn>()

  return {
    name: 'shiki-tinymist',
    enforce: 'pre',

    preprocess(code) {
      const lang = normalizeTinymistLanguage(
        getShikiLanguage(this.options.lang),
        langAlias,
      )
      const meta = getShikiMeta(this.options.meta) ?? ''

      if (
        !shouldTransformTinymistBlock(
          {
            lang,
            meta,
            code,
            codeOptions: this.options,
            context: this,
          },
          options,
        )
      ) {
        return
      }

      try {
        const result =
          options.result ??
          createTinymistReturnFromCode(code, options.queryResult)

        map.set(this.meta, result)
        ;(this.meta as { tinymist?: TinymistShikiReturn }).tinymist = result

        if (result.meta?.extension) {
          this.options.lang = result.meta.extension
        } else if (lang) {
          this.options.lang = lang
        }

        return result.code
      } catch (error) {
        const replacement = onTinymistError(error, code, lang ?? '')
        if (typeof replacement === 'string') {
          return replacement
        }
      }
    },

    tokens(tokens) {
      const result = map.get(this.meta)
      if (!result) {
        return
      }

      return splitTokens(
        tokens,
        result.nodes
          .filter((node) => node.length > 0)
          .flatMap((node) => [node.start, node.start + node.length]),
      )
    },

    pre(pre) {
      const result = map.get(this.meta)
      if (!result) {
        return
      }

      addClass(pre as HastElement, ['tinymist', 'lsp'])
    },

    code(codeEl) {
      const result = map.get(this.meta)
      if (!result) {
        return
      }

      applyTinymistAnnotations({
        codeElement: codeEl as HastElement,
        lines: this.lines as HastElement[],
        nodes: result.nodes,
        renderer,
        rendererContext: this,
        onError: (error) => {
          onShikiError(
            error,
            this.source,
            getShikiLanguage(this.options.lang) ?? '',
          )
        },
      })
    },
  }
}

export type { TinymistHover }
