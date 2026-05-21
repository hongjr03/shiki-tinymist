import { describe, expect, it } from 'vitest'
import { parseTinymistCode, shouldRunTinymist } from '../src/parser.js'

describe('parseTinymistCode', () => {
  it('removes hover marker lines and records one-based positions', () => {
    const parsed = parseTinymistCode(`#let answer = 42
//   ^? inferred value
#answer`)

    expect(parsed.code).toBe(`#let answer = 42
#answer`)
    expect(parsed.markers).toEqual([
      {
        id: 'm1',
        line: 1,
        column: 4,
        length: 1,
        kind: 'hover',
        fileName: 'index.typ',
        queryLine: 1,
        queryColumn: 4,
        label: 'inferred value',
      },
    ])
  })

  it('parses completion and highlight markers', () => {
    const parsed = parseTinymistCode(`#let answer = 42
#ans
// ^|
#answer
// ^^^^^^`)

    expect(parsed.code).toBe(`#let answer = 42
#ans
#answer`)
    expect(parsed.markers).toEqual([
      {
        id: 'm1',
        line: 2,
        column: 2,
        length: 1,
        kind: 'completion',
        fileName: 'index.typ',
        queryLine: 2,
        queryColumn: 2,
      },
      {
        id: 'm2',
        line: 3,
        column: 2,
        length: 6,
        kind: 'highlight',
        fileName: 'index.typ',
        queryLine: 3,
        queryColumn: 2,
      },
    ])
  })

  it('cuts output without cutting query code', () => {
    const parsed = parseTinymistCode(`#let hidden = 1
// ---cut---
#hidden
// ^?`)

    expect(parsed.code).toBe('#hidden')
    expect(parsed.files[0]?.code).toBe(`#let hidden = 1
#hidden`)
    expect(parsed.markers[0]).toMatchObject({
      line: 1,
      queryLine: 2,
      fileName: 'index.typ',
    })
    expect(parsed.queryLineToOutputLine['index.typ:2']).toBe(1)
  })

  it('supports cut-after and cut-start/end sections', () => {
    const parsed = parseTinymistCode(`#visible
// ---cut-start---
#hidden
// ---cut-end---
#shown
// ---cut-after---
#not-shown`)

    expect(parsed.code).toBe(`#visible
#shown`)
    expect(parsed.files[0]?.code).toBe(`#visible
#hidden
#shown
#not-shown`)
  })

  it('parses directives and filename sections', () => {
    const parsed = parseTinymistCode(`// @noErrors
// @showEmit
// @filename: lib.typ
#let answer = 42
#answer
// ^?`)

    expect(parsed.code).toBe(`// @filename: lib.typ
#let answer = 42
#answer`)
    expect(parsed.diagnosticsMode).toBe('hide')
    expect(parsed.directives.map((directive) => directive.name)).toEqual([
      'noErrors',
      'showEmit',
      'filename',
    ])
    expect(parsed.files).toEqual([
      { fileName: 'index.typ', code: '' },
      {
        fileName: 'lib.typ',
        code: `#let answer = 42
#answer`,
      },
    ])
    expect(parsed.markers[0]).toMatchObject({
      fileName: 'lib.typ',
      line: 3,
      queryLine: 2,
    })
  })

  it('does not parse ordinary comments as markers', () => {
    const parsed = parseTinymistCode(`#let answer = 42
// just a comment`)

    expect(parsed.code).toBe(`#let answer = 42
// just a comment`)
    expect(parsed.markers).toEqual([])
  })
})

describe('shouldRunTinymist', () => {
  it('runs for Typst by default', () => {
    expect(shouldRunTinymist(undefined, 'typst')).toBe(true)
  })

  it('requires a trigger when explicitTrigger is enabled', () => {
    expect(shouldRunTinymist(undefined, 'typst', true)).toBe(false)
    expect(shouldRunTinymist('tinymist', 'typst', true)).toBe(true)
  })
})
