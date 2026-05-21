---
title: Marker syntax
description: Twoslash-style Typst marker syntax supported by shiki-tinymist.
---

Use Typst line comments under the target code to request language-service annotations.

## Hover

```typst
#let answer = 42
//   ^?
```

## Completion

```typst
#ans
//    ^|
```

## Static Highlight

```typst
#answer
// ^^^^^^
```

## Directives

| Notation | Behavior |
| --- | --- |
| `// ---cut---` / `// ---cut-before---` | Hide previous lines from output while keeping them in the Tinymist query. |
| `// ---cut-after---` | Hide following lines from output while keeping them in the Tinymist query. |
| `// ---cut-start---` / `// ---cut-end---` | Hide paired output ranges while keeping them in the Tinymist query. |
| `// @filename: name.typ` | Split the query into virtual files. |
| `// @noErrors` | Suppress rendered diagnostics. |
| `// @errors: text` | Render diagnostics whose code or message includes one of the listed tokens. |
| `// @showEmit` / `// @showEmittedFile` | Recognized and removed from output, without Typst emit replacement. |
