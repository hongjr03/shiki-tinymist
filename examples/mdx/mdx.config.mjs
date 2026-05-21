import { mdxTinymist } from 'shiki-tinymist/mdx'

export default {
  rehypePlugins: [mdxTinymist({ explicitTrigger: true })],
}
