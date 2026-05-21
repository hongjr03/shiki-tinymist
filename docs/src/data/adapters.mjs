export const adapters = Object.freeze([
  {
    id: 'rehype',
    name: 'Rehype',
    entry: 'shiki-tinymist/rehype',
    summary:
      'Standard rehype plugin that replaces pre/code nodes with Shiki HAST.',
    content: 'examples/rehype/full-feature.md',
    files: ['examples/rehype/processor.mjs', 'examples/rehype/full-feature.md'],
  },
  {
    id: 'markdown-it',
    name: 'markdown-it',
    entry: 'shiki-tinymist/markdown-it',
    summary: 'Async renderTinymist helper for markdown-it sync rendering.',
    content: 'examples/markdown-it/full-feature.md',
    files: [
      'examples/markdown-it/demo.mjs',
      'examples/markdown-it/full-feature.md',
    ],
  },
  {
    id: 'vitepress',
    name: 'VitePress',
    entry: 'shiki-tinymist/vitepress',
    summary: 'Vite pre-transform for VitePress markdown-it content.',
    content: 'examples/vitepress/full-feature.md',
    files: [
      'examples/vitepress/.vitepress/config.mts',
      'examples/vitepress/.vitepress/theme/index.ts',
      'examples/vitepress/full-feature.md',
    ],
  },
  {
    id: 'astro',
    name: 'Astro',
    entry: 'shiki-tinymist/astro',
    summary: 'Astro integration that registers the rehype adapter.',
    content: 'examples/astro/src/pages/full-feature.md',
    files: [
      'examples/astro/astro.config.mjs',
      'examples/astro/src/layouts/Base.astro',
      'examples/astro/src/pages/full-feature.md',
    ],
  },
  {
    id: 'mdx',
    name: 'MDX',
    entry: 'shiki-tinymist/mdx',
    summary:
      'Rehype-compatible MDX plugin, plus an optional Vite pre-transform.',
    content: 'examples/mdx/full-feature.mdx',
    files: ['examples/mdx/mdx.config.mjs', 'examples/mdx/full-feature.mdx'],
  },
  {
    id: 'next',
    name: 'Next',
    entry: 'shiki-tinymist/next',
    summary: 'Rehype plugin for @next/mdx configuration.',
    content: 'examples/next/app/page.mdx',
    files: [
      'examples/next/next.config.mjs',
      'examples/next/app/layout.tsx',
      'examples/next/app/tinymist-client.tsx',
      'examples/next/app/page.mdx',
    ],
  },
  {
    id: 'nuxt',
    name: 'Nuxt',
    entry: 'shiki-tinymist/nuxt',
    summary: 'Nuxt Content rehype plugin export for markdown builds.',
    content: 'examples/nuxt/content/full-feature.md',
    files: [
      'examples/nuxt/nuxt.config.ts',
      'examples/nuxt/plugins/tinymist.client.ts',
      'examples/nuxt/content/full-feature.md',
    ],
  },
])

export const adapterSidebarItems = adapters.map((adapter) => ({
  label: adapter.name,
  link: `/adapters/${adapter.id}/`,
}))

export function getAdapter(id) {
  return adapters.find((adapter) => adapter.id === id)
}
