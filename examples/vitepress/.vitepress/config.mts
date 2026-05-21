import { defineConfig } from 'vitepress'
import { vitepressTinymist } from 'shiki-tinymist/vitepress'

export default defineConfig({
  title: 'shiki-tinymist VitePress',
  vite: {
    plugins: [vitepressTinymist({ explicitTrigger: true })],
  },
})
