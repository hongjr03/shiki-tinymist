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
      },
      {
        id: 'm2',
        line: 3,
        column: 2,
        length: 6,
        kind: 'highlight',
      },
    ])
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
