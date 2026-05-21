export function getConfigurationItems(
  params: unknown,
): Array<{ section?: string }> {
  const items = (params as { items?: unknown } | undefined)?.items
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => {
    const section = (item as { section?: unknown }).section
    return typeof section === 'string' ? { section } : {}
  })
}
