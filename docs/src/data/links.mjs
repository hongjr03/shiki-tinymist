export function docsLink(path, base) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = normalizeBase(base);

  return `${normalizedBase}${normalizedPath}`;
}

function normalizeBase(base) {
  if (!base || base === "/") {
    return "";
  }

  return `/${base.replace(/^\/+|\/+$/g, "")}`;
}
