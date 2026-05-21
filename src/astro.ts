import { rehypeTinymist, type TinymistRehypeOptions } from './rehype.js'

export interface AstroTinymistOptions extends TinymistRehypeOptions {}

export interface AstroIntegrationLike {
  name: string
  hooks: {
    'astro:config:setup': (context: {
      updateConfig: (config: Record<string, unknown>) => void
    }) => void
  }
}

export function astroTinymist(
  options: AstroTinymistOptions = {},
): AstroIntegrationLike {
  return {
    name: 'shiki-tinymist',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          markdown: {
            rehypePlugins: [rehypeTinymist(options)],
          },
        })
      },
    },
  }
}
