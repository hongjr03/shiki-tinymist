import { readFile } from 'node:fs/promises'
import MarkdownIt from 'markdown-it'
import { markdownItTinymist } from 'shiki-tinymist/markdown-it'

const md = new MarkdownIt({ html: true })
md.use(markdownItTinymist({ explicitTrigger: true }))

const source = await readFile(
  new URL('./full-feature.md', import.meta.url),
  'utf8',
)
const html = await md.renderTinymist(source)

console.log(html)
