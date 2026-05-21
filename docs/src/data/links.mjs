// Use only for raw href attributes rendered by custom Astro pages.
// Starlight sidebar links already receive Astro's configured base.
export function hrefWithBase(path, base) {
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
