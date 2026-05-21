import type { TinymistDiagnostic } from '../types.js'

export function normalizeDiagnostic(
  value: unknown,
  fileName: string | undefined,
): TinymistDiagnostic {
  const diagnostic = value as {
    range?: {
      start?: { line?: number; character?: number }
      end?: { line?: number; character?: number }
    }
    message?: string
    severity?: number
    code?: number | string
  }

  const normalized: TinymistDiagnostic = {
    line: (diagnostic.range?.start?.line ?? 0) + 1,
    column: (diagnostic.range?.start?.character ?? 0) + 1,
    length: Math.max(
      1,
      (diagnostic.range?.end?.character ?? 1) -
        (diagnostic.range?.start?.character ?? 0),
    ),
    message: diagnostic.message ?? '',
  }
  if (fileName) {
    normalized.fileName = fileName
  }
  if (
    typeof diagnostic.code === 'string' ||
    typeof diagnostic.code === 'number'
  ) {
    normalized.code = String(diagnostic.code)
  }
  const severity = normalizeSeverity(diagnostic.severity)
  if (severity) {
    normalized.severity = severity
  }
  return normalized
}

function normalizeSeverity(
  severity: number | undefined,
): TinymistDiagnostic['severity'] {
  if (severity === 1) return 'error'
  if (severity === 2) return 'warning'
  if (severity === 3) return 'information'
  if (severity === 4) return 'hint'
  return undefined
}
