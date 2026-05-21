import { createTinymistReturn } from './annotations.js'
import { parseTinymistCode } from './parser.js'
import type { TinymistShikiReturn } from './types/annotation.js'
import type {
  CreateTinymistTransformerOptions,
  TransformerTinymistOptions,
} from './types/options.js'
import type { TinymistProvider } from './types/query.js'
import type { TinymistVirtualFile } from './types/source.js'
import { createTinymistWasmProvider } from './wasm.js'

export async function prepareTinymistCode(
  code: string,
  options: CreateTinymistTransformerOptions = {},
): Promise<TinymistShikiReturn> {
  const parsed = parseTinymistCode(code)
  const provider: TinymistProvider =
    options.provider ?? createTinymistWasmProvider()
  const queryMarkers = parsed.markers.filter(
    (marker) => marker.kind !== 'highlight',
  )
  const queryFiles = resolveQueryFiles(
    parsed.files,
    options.documentUri,
    parsed.code,
  )
  const activeFile = findActiveFile(queryFiles, queryMarkers)
  const queryResult =
    queryMarkers.length > 0
      ? await provider.query({
          code: activeFile.code,
          uri:
            activeFile.uri ??
            resolveDocumentUri(options.documentUri, parsed.code),
          markers: queryMarkers,
          files: queryFiles,
        })
      : { hovers: [] }

  return createTinymistReturn(parsed, queryResult)
}

function resolveQueryFiles(
  files: TinymistVirtualFile[],
  documentUri: TransformerTinymistOptions['documentUri'],
  code: string,
): TinymistVirtualFile[] {
  const baseUri = resolveDocumentUri(documentUri, code)
  if (files.length <= 1) {
    return [
      {
        ...(files[0] ?? { fileName: 'index.typ', code }),
        uri: baseUri,
      },
    ]
  }

  const rootUri = baseUri.replace(/\/?[^/]*$/, '/')
  return files.map((file) => ({
    ...file,
    uri: `${rootUri}${encodeFilePath(file.fileName)}`,
  }))
}

function findActiveFile(
  files: TinymistVirtualFile[],
  markers: Array<{ fileName?: string }>,
): TinymistVirtualFile {
  const markerFileName = markers.find((marker) => marker.fileName)?.fileName
  if (markerFileName) {
    const file = files.find((item) => item.fileName === markerFileName)
    if (file) {
      return file
    }
  }

  return (
    files.find((file) => file.code.trim()) ??
    files[0] ?? {
      fileName: 'index.typ',
      code: '',
    }
  )
}

function resolveDocumentUri(
  documentUri: TransformerTinymistOptions['documentUri'],
  code: string,
): string {
  if (typeof documentUri === 'function') {
    return documentUri(code)
  }

  if (typeof documentUri === 'string') {
    return documentUri
  }

  return `untitled://shiki-tinymist/${hashCode(code)}.typ`
}

function encodeFilePath(fileName: string): string {
  return fileName
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function hashCode(input: string): string {
  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }

  return hash.toString(16)
}
