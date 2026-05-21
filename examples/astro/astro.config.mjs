import { defineConfig } from 'astro/config'
import { astroTinymist } from 'shiki-tinymist/astro'

export default defineConfig({
  integrations: [astroTinymist({ explicitTrigger: true })],
})
