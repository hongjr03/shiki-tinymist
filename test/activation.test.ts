import { describe, expect, it } from 'vitest'
import {
  shouldActivateTinymist,
  shouldTransformTinymistBlock,
} from '../src/activation.js'

describe('Tinymist activation', () => {
  it('activates default Typst languages without explicit triggers', () => {
    expect(shouldActivateTinymist({ lang: 'typst', meta: '' })).toBe(true)
    expect(shouldActivateTinymist({ lang: 'typ', meta: '' })).toBe(true)
    expect(shouldActivateTinymist({ lang: 'js', meta: '' })).toBe(false)
  })

  it('requires explicit trigger metadata when configured', () => {
    expect(
      shouldActivateTinymist(
        { lang: 'typst', meta: '' },
        { explicitTrigger: true },
      ),
    ).toBe(false)
    expect(
      shouldActivateTinymist(
        { lang: 'typst', meta: 'tinymist' },
        { explicitTrigger: true },
      ),
    ).toBe(true)
  })

  it('honors shared disable trigger metadata', () => {
    expect(
      shouldActivateTinymist({ lang: 'typst', meta: 'tinymist no-tinymist' }),
    ).toBe(false)
  })

  it('lets transformer filters own the final decision', () => {
    expect(
      shouldTransformTinymistBlock(
        {
          lang: 'js',
          meta: '',
          code: 'console.log(1)',
          codeOptions: {},
          context: {},
        },
        {
          filter: () => true,
        },
      ),
    ).toBe(true)
  })
})
