import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { adapters } from "./src/data/adapters.mjs";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const docsBase = isGitHubPages ? "/shiki-tinymist" : "";
const docsLink = (path) => `${docsBase}${path}`;

export default defineConfig({
  site: isGitHubPages ? "https://hongjr03.github.io" : undefined,
  base: isGitHubPages ? "/shiki-tinymist" : undefined,
  integrations: [
    starlight({
      title: "shiki-tinymist",
      description:
        "Tinymist-powered Typst code annotations for Shiki and Markdown frameworks.",
      customCss: ["./src/styles/docs.css"],
      pagefind: false,
      sidebar: [
        {
          label: "Start",
          items: [
            { label: "Overview", link: docsLink("/") },
            { label: "Install", link: docsLink("/install/") },
          ],
        },
        {
          label: "Adapters",
          items: [
            { label: "Adapter overview", link: docsLink("/adapters/") },
            ...adapters.map((adapter) => ({
              label: adapter.name,
              link: docsLink(`/adapters/${adapter.id}/`),
            })),
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Marker syntax", link: docsLink("/marker-syntax/") },
          ],
        },
      ],
    }),
  ],
});
