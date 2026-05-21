import {
  renderTinymistMarkdown,
  type TinymistMarkdownOptions,
} from './adapters/markdown.js'

export interface MarkdownItLike {
  render(markdown: string, env?: unknown): string
  renderTinymist?: (markdown: string, env?: unknown) => Promise<string>
}

export async function renderMarkdownItTinymist(
  md: MarkdownItLike,
  markdown: string,
  options: TinymistMarkdownOptions = {},
  env?: unknown,
): Promise<string> {
  const processed = await renderTinymistMarkdown(markdown, options)
  return md.render(processed, env)
}

export function markdownItTinymist(options: TinymistMarkdownOptions = {}) {
  return function install(md: MarkdownItLike): void {
    md.renderTinymist = (markdown, env) => {
      return renderMarkdownItTinymist(md, markdown, options, env)
    }
  }
}
