import {
  renderTinymistMarkdown,
  type TinymistMarkdownOptions,
} from './markdown.js'

export interface TinymistMarkdownVitePluginOptions extends TinymistMarkdownOptions {
  include?: RegExp | ((id: string) => boolean)
  name?: string
}

export interface TinymistMarkdownVitePlugin {
  name: string
  enforce: 'pre'
  transform(
    code: string,
    id: string,
  ): Promise<{ code: string; map: null } | undefined>
}

export function tinymistMarkdownVitePlugin(
  options: TinymistMarkdownVitePluginOptions = {},
): TinymistMarkdownVitePlugin {
  const {
    include = /\.(?:md|mdx|mdc)(?:\?.*)?$/,
    name,
    ...markdownOptions
  } = options

  return {
    name: name ?? 'shiki-tinymist:markdown',
    enforce: 'pre',

    async transform(code, id) {
      if (!matchesInclude(id, include)) {
        return undefined
      }

      return {
        code: await renderTinymistMarkdown(code, markdownOptions),
        map: null,
      }
    },
  }
}

function matchesInclude(
  id: string,
  include: RegExp | ((id: string) => boolean),
): boolean {
  return typeof include === 'function' ? include(id) : include.test(id)
}
