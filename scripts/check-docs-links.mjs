import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const docsDist = join(process.cwd(), "docs", "dist");
const pagesBase = normalizeBase(process.env.DOCS_BASE ?? "/shiki-tinymist");
const hrefPattern = /\s(?:href|src)="([^"]+)"/g;
const errors = [];

const htmlFiles = await listHtmlFiles(docsDist);
const htmlByPath = new Map(
  await Promise.all(
    htmlFiles.map(async (file) => [file, await readFile(file, "utf8")]),
  ),
);

for (const [file, html] of htmlByPath) {
  const relativeFile = relative(docsDist, file);

  for (const href of extractRefs(html)) {
    if (href.includes(`${pagesBase}${pagesBase}/`)) {
      errors.push(`${relativeFile}: found duplicated Pages base in "${href}"`);
    }

    if (isRootLocalPath(href) && !hasPagesBase(href)) {
      errors.push(
        `${relativeFile}: root-relative local path misses Pages base in "${href}"`,
      );
    }
  }
}

expectHtml("index.html", (html) => {
  expect(
    html.includes('href="install/"'),
    "home Install action stays relative",
  );
  expect(
    html.includes('href="adapters/"'),
    "home Adapter docs action stays relative",
  );
});

expectHtml(join("adapters", "index.html"), (html) => {
  expect(
    html.includes(`href="${pagesBase}/adapters/rehype/"`),
    "adapter cards include the Pages base once",
  );
  expect(
    html.includes(`href="${pagesBase}/adapters/"`),
    "sidebar Adapter overview link includes the Pages base once",
  );
});

expectHtml(join("install", "index.html"), (html) => {
  expect(
    html.includes(`href="${pagesBase}/"`),
    "docs collection sidebar links include the Pages base once",
  );
  expect(
    html.includes(`href="${pagesBase}/adapters/"`),
    "custom route sidebar links include the Pages base once",
  );
});

if (errors.length > 0) {
  console.error("Docs link validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Docs link validation passed.");

async function listHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listHtmlFiles(path) : path;
    }),
  );

  return files.flat().filter((file) => file.endsWith(".html"));
}

function extractRefs(html) {
  return Array.from(html.matchAll(hrefPattern), (match) => match[1]);
}

function isRootLocalPath(href) {
  return href.startsWith("/") && !href.startsWith("//");
}

function hasPagesBase(href) {
  return href === pagesBase || href.startsWith(`${pagesBase}/`);
}

function expectHtml(path, validate) {
  const file = join(docsDist, path);
  const html = htmlByPath.get(file);

  if (!html) {
    errors.push(`${path}: expected generated HTML file`);
    return;
  }

  validate(html);
}

function expect(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function normalizeBase(base) {
  return `/${base.replace(/^\/+|\/+$/g, "")}`;
}
