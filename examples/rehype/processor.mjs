import { readFile } from 'node:fs/promises'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { rehypeTinymist } from 'shiki-tinymist/rehype'

const source = await readFile(
  new URL('./full-feature.md', import.meta.url),
  'utf8',
)

const html = await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeTinymist({ explicitTrigger: true }))
  .use(rehypeStringify)
  .process(source)

console.log(String(html))
