import { rehypeTinymist, type TinymistRehypeOptions } from './rehype.js'

export interface NextTinymistOptions extends TinymistRehypeOptions {}

export function nextTinymist(options: NextTinymistOptions = {}) {
  return rehypeTinymist(options)
}
