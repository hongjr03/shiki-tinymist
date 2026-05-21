import { describe, expect, it } from 'vitest'
import {
  getConfigurationItems,
  normalizeCompletionItems,
  normalizeDiagnostic,
  normalizeHoverRange,
  normalizeQueryFiles,
  resolveMarkerUri,
  rootUriFromDocumentUri,
  stringifyHover,
  throwIfLspError,
} from '../src/wasm/protocol.js'

describe('WASM protocol normalization', () => {
  it('normalizes virtual files and resolves marker URIs', () => {
    const files = normalizeQueryFiles({
      code: '#let answer = 42',
      uri: 'untitled://test/main.typ',
      markers: [],
      files: [
        {
          fileName: 'main.typ',
          code: '#import "lib.typ"',
          uri: 'untitled://test/main.typ',
        },
        {
          fileName: 'lib.typ',
          code: '#let answer = 42',
        },
      ],
    })

    expect(files).toEqual([
      {
        fileName: 'main.typ',
        code: '#import "lib.typ"',
        uri: 'untitled://test/main.typ',
      },
      {
        fileName: 'lib.typ',
        code: '#let answer = 42',
        uri: 'untitled://test/main.typ',
      },
    ])
    expect(resolveMarkerUri(files, 'fallback', { fileName: 'main.typ' })).toBe(
      'untitled://test/main.typ',
    )
    expect(
      resolveMarkerUri(files, 'fallback', { fileName: 'missing.typ' }),
    ).toBe('fallback')
  })

  it('normalizes hover content and single-line ranges', () => {
    const hover = {
      contents: [{ kind: 'markdown', value: '**answer**' }, 'plain text'],
      range: {
        start: { line: 1, character: 2 },
        end: { line: 1, character: 8 },
      },
    }

    expect(stringifyHover(hover)).toBe('**answer**\n\nplain text')
    expect(normalizeHoverRange(hover)).toEqual({
      line: 2,
      column: 3,
      length: 6,
    })
  })

  it('normalizes completion items and filters invalid entries', () => {
    expect(
      normalizeCompletionItems({
        items: [
          {
            label: 'answer',
            kind: 6,
            detail: 'int',
            documentation: { value: 'A value' },
            deprecated: true,
            insertText: 'answer',
          },
          { label: '' },
        ],
      }),
    ).toEqual([
      {
        label: 'answer',
        kind: 'variable',
        detail: 'int',
        documentation: 'A value',
        deprecated: true,
        insertText: 'answer',
      },
    ])
  })

  it('normalizes diagnostics, configuration, roots, and LSP errors', () => {
    expect(
      normalizeDiagnostic(
        {
          range: {
            start: { line: 0, character: 1 },
            end: { line: 0, character: 4 },
          },
          message: 'Expected expression.',
          severity: 2,
          code: 100,
        },
        'main.typ',
      ),
    ).toEqual({
      fileName: 'main.typ',
      line: 1,
      column: 2,
      length: 3,
      message: 'Expected expression.',
      code: '100',
      severity: 'warning',
    })
    expect(
      getConfigurationItems({ items: [{ section: 'tinymist' }, {}] }),
    ).toEqual([{ section: 'tinymist' }, {}])
    expect(rootUriFromDocumentUri('file:///project/main.typ')).toBe(
      'file:///project',
    )
    expect(() =>
      throwIfLspError({ code: -32000, message: 'request failed' }),
    ).toThrow('Tinymist LSP error -32000: request failed')
  })
})
