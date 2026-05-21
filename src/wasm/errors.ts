export function throwIfLspError(value: unknown): void {
  if (!value || typeof value !== 'object') {
    return
  }

  const maybeError = value as { code?: unknown; message?: unknown }
  if (
    typeof maybeError.code === 'number' &&
    typeof maybeError.message === 'string'
  ) {
    throw new Error(
      `Tinymist LSP error ${maybeError.code}: ${maybeError.message}`,
    )
  }
}
