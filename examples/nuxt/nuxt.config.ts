export default defineNuxtConfig({
  css: ['shiki-tinymist/style-rich.css'],
  content: {
    build: {
      markdown: {
        rehypePlugins: {
          'shiki-tinymist/nuxt': { explicitTrigger: true },
        },
      },
    },
  },
})
