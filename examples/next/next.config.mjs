import createMDX from '@next/mdx'
import { nextTinymist } from 'shiki-tinymist/next'

const withMDX = createMDX({
  options: {
    rehypePlugins: [nextTinymist({ explicitTrigger: true })],
  },
})

export default withMDX({
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
})
