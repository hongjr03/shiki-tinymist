import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/client.ts',
    'src/rehype.ts',
    'src/markdown-it.ts',
    'src/vitepress.ts',
    'src/astro.ts',
    'src/mdx.ts',
    'src/next.ts',
    'src/nuxt.ts',
  ],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  platform: 'node',
  external: ['shiki', 'tinymist'],
})
