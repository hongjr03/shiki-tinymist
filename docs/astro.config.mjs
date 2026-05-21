import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { adapters } from "./src/data/adapters.mjs";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

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
            { label: "Overview", slug: "index" },
            { label: "Install", slug: "install" },
          ],
        },
        {
          label: "Adapters",
          items: [
            { label: "Adapter overview", link: "/adapters/" },
            ...adapters.map((adapter) => ({
              label: adapter.name,
              link: `/adapters/${adapter.id}/`,
            })),
          ],
        },
        {
          label: "Reference",
          items: [{ label: "Marker syntax", slug: "marker-syntax" }],
        },
      ],
    }),
  ],
});
