import { tinymistMarkdownVitePlugin } from './adapters/vite.js'
import { rehypeTinymist, type TinymistRehypeOptions } from './rehype.js'
import type { TinymistMarkdownVitePluginOptions } from './adapters/vite.js'

export interface MdxTinymistOptions extends TinymistRehypeOptions {}

export function mdxTinymist(options: MdxTinymistOptions = {}) {
  return rehypeTinymist(options)
}

export function mdxTinymistVitePlugin(
  options: TinymistMarkdownVitePluginOptions = {},
) {
  return tinymistMarkdownVitePlugin({
    ...options,
    include: options.include ?? /\.mdx(?:\?.*)?$/,
    name: options.name ?? 'shiki-tinymist:mdx',
  })
}
