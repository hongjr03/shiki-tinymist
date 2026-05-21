export const defaultFileName = 'index.typ'

export interface QueryFileDraft {
  fileName: string
  lines: string[]
}

export interface OutputLineDraft {
  id: number
  text: string
  fileName?: string
  queryLine?: number
}

export function getFile(
  files: Map<string, QueryFileDraft>,
  fileName: string,
): QueryFileDraft {
  const existing = files.get(fileName)
  if (existing) {
    return existing
  }

  const file = {
    fileName,
    lines: [],
  }
  files.set(fileName, file)
  return file
}

export function normalizeFileName(fileName: string): string {
  return fileName.trim().replace(/\\/g, '/')
}

export function lineKey(fileName: string, line: number): string {
  return `${fileName}:${line}`
}
