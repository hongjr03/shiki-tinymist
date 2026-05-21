---
title: shiki-tinymist
description: Tinymist-powered Typst code annotations for Shiki and Markdown frameworks.
template: splash
hero:
  title: shiki-tinymist
  tagline: Typst language-service hovers, completions, diagnostics, and highlights rendered through Shiki.
  actions:
    - text: Install
      link: /install/
      icon: right-arrow
    - text: Adapter docs
      link: /adapters/
      variant: secondary
---

`shiki-tinymist` queries the Tinymist WASM language server before Shiki renders a Typst code block. The prepared annotations are then rendered synchronously by Shiki, which makes the package usable in Markdown pipelines that do not support async transformer hooks.

The framework pages under `/adapters/` are generated from one adapter registry and reuse the real examples in `examples/`.
