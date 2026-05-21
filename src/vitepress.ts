import {
  tinymistMarkdownVitePlugin,
  type TinymistMarkdownVitePluginOptions,
} from './adapters/vite.js'

export interface VitePressTinymistOptions extends TinymistMarkdownVitePluginOptions {}

export function vitepressTinymist(options: VitePressTinymistOptions = {}) {
  return tinymistMarkdownVitePlugin({
    ...options,
    include: options.include ?? /\.md(?:\?.*)?$/,
    name: options.name ?? 'shiki-tinymist:vitepress',
  })
}
