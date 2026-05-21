export function stringifyMarkup(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(stringifyMarkup).filter(Boolean).join('\n\n')
  }

  if (value && typeof value === 'object') {
    const objectValue = value as { value?: unknown }
    if (typeof objectValue.value === 'string') {
      return objectValue.value
    }
  }

  return ''
}
