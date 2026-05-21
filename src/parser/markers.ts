import type { TinymistMarker } from '../types/source.js'
import type { OutputLineDraft, QueryFileDraft } from './model.js'

export function parseMarkerLine(
  line: string,
  previousOutputLine: OutputLineDraft | undefined,
  currentFile: QueryFileDraft,
): Omit<TinymistMarker, 'id'> | undefined {
  if (!previousOutputLine?.queryLine) {
    return undefined
  }

  const query = /^(\s*)\/\/([ \t]*)(\^+)([?|])([ \t]*(.*))?$/.exec(line)
  if (query) {
    const leadingIndent = query[1] ?? ''
    const spaces = query[2] ?? ''
    const carets = query[3] ?? ''
    const operator = query[4]
    const label = query[6]?.trim()
    const column = leadingIndent.length + spaces.length + 1

    return {
      line: previousOutputLine.id,
      column,
      length: carets.length,
      kind: operator === '|' ? 'completion' : 'hover',
      fileName: previousOutputLine.fileName ?? currentFile.fileName,
      queryLine: previousOutputLine.queryLine,
      queryColumn: column,
      ...(label ? { label } : {}),
    }
  }

  const highlight = /^(\s*)\/\/([ \t]*)(\^+)([ \t]*(.*))?$/.exec(line)
  if (!highlight) {
    return undefined
  }

  const leadingIndent = highlight[1] ?? ''
  const spaces = highlight[2] ?? ''
  const carets = highlight[3] ?? ''
  const label = highlight[5]?.trim()
  const column = leadingIndent.length + spaces.length + 1

  return {
    line: previousOutputLine.id,
    column,
    length: carets.length,
    kind: 'highlight',
    fileName: previousOutputLine.fileName ?? currentFile.fileName,
    queryLine: previousOutputLine.queryLine,
    queryColumn: column,
    ...(label ? { label } : {}),
  }
}
