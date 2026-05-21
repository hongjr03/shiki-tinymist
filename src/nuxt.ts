import { rehypeTinymist, type TinymistRehypeOptions } from './rehype.js'

export interface NuxtTinymistOptions extends TinymistRehypeOptions {}

export function nuxtTinymist(options: NuxtTinymistOptions = {}) {
  return rehypeTinymist(options)
}

export default nuxtTinymist
