import type { TinymistQueryInput, TinymistVirtualFile } from '../types.js'

export function normalizeQueryFiles(
  input: TinymistQueryInput,
): Required<TinymistVirtualFile>[] {
  const files = input.files?.length
    ? input.files
    : [{ fileName: 'index.typ', code: input.code, uri: input.uri }]

  return files.map((file) => ({
    fileName: file.fileName,
    code: file.code,
    uri: file.uri ?? input.uri,
  }))
}

export function resolveMarkerUri(
  files: Required<TinymistVirtualFile>[],
  fallbackUri: string,
  marker: { fileName?: string },
): string {
  if (marker.fileName) {
    return (
      files.find((file) => file.fileName === marker.fileName)?.uri ??
      fallbackUri
    )
  }

  return fallbackUri
}

export function rootUriFromDocumentUri(documentUri: string): string | null {
  if (documentUri.startsWith('file://')) {
    const lastSlash = documentUri.lastIndexOf('/')
    return lastSlash > 'file://'.length
      ? documentUri.slice(0, lastSlash)
      : documentUri
  }

  return null
}
