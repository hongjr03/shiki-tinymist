import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const popupRuleRE =
  /\.tinymist \.tinymist-popup-container \{[\s\S]*?position: absolute;[\s\S]*?display: none;[\s\S]*?\}/
const hoverRuleRE =
  /\.tinymist \.tinymist-hover:hover \.tinymist-popup-container,[\s\S]*?\.tinymist \.tinymist-hover:focus-within \.tinymist-popup-container \{[\s\S]*?display: inline-flex;[\s\S]*?\}/
const floatingRuleRE =
  /\.tinymist-floating-root \.tinymist-popup-container \{[\s\S]*?position: fixed;[\s\S]*?\}/

describe('tinymist popup styles', () => {
  it.each(['style.css', 'style-rich.css'])(
    'keeps hidden hover popups out of scroll layout in %s',
    async (file) => {
      const css = await readFile(file, 'utf8')

      expect(css).toMatch(popupRuleRE)
      expect(css).toMatch(hoverRuleRE)
      expect(css).toMatch(floatingRuleRE)
    },
  )
})
