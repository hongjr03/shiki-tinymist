import { describe, expect, it } from 'vitest'
import { createTinymistWasmProvider } from '../src/wasm.js'
import type {
  TinymistLanguageServerInstance,
  TinymistWasmModule,
  TinymistWasmTransport,
} from '../src/types.js'

describe('createTinymistWasmProvider', () => {
  it('queries hover through the TinymistLanguageServer bridge', async () => {
    const provider = createTinymistWasmProvider({
      init: false,
      module: createFakeTinymistModule(),
    })

    const result = await provider.query({
      code: '#let answer = 42',
      uri: 'untitled://test/main.typ',
      markers: [
        {
          id: 'm1',
          line: 1,
          column: 6,
          length: 6,
          kind: 'hover',
        },
      ],
    })

    expect(result.hovers).toEqual([
      {
        markerId: 'm1',
        markdown: '**answer**: integer',
      },
    ])
  })
})

function createFakeTinymistModule(): TinymistWasmModule {
  class FakeTinymistLanguageServer implements TinymistLanguageServerInstance {
    constructor(readonly transport: TinymistWasmTransport) {}

    on_request(method: string): unknown {
      if (method === 'initialize') {
        return { capabilities: { hoverProvider: true } }
      }

      if (method === 'textDocument/hover') {
        return {
          contents: {
            kind: 'markdown',
            value: '**answer**: integer',
          },
        }
      }

      return null
    }

    on_notification(): void {}

    on_response(): void {}

    on_event(): void {}
  }

  return {
    TinymistLanguageServer: FakeTinymistLanguageServer,
  }
}
