---
title: Install
description: Install shiki-tinymist and wire the browser styles and floating hover client.
---

Install the package with Shiki and Tinymist:

```sh
npm install shiki-tinymist shiki tinymist
```

Use the core transformer directly when you control the Shiki call:

```ts
import { codeToHtml } from "shiki";
import { createTinymistTransformer } from "shiki-tinymist";

const code = `#let answer = 42
//   ^?`;

const transformer = await createTinymistTransformer(code);

const html = await codeToHtml(code, {
  lang: "typst",
  theme: "github-dark",
  transformers: [transformer],
});
```

Import the rich styles in browser-facing bundles:

```ts
import "shiki-tinymist/style-rich.css";
```

When code blocks can scroll, install the floating client so hover popups are moved outside the scroll container before positioning:

```ts
import { initTinymistFloating } from "shiki-tinymist/client";

initTinymistFloating();
```

For Markdown integrations, set `explicitTrigger: true` to only process fences whose meta string contains `tinymist` or `typst-lsp`.
