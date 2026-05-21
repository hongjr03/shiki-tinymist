# markdown-it full-feature example

```typst tinymist
// @filename: lib.typ
#let hidden-base = 40
// ---cut---
#let answer = hidden-base + 2
#answer
// ^? resolved from the virtual file
#ans
// ^| completion list
#answer
// ^^^^^^ static highlight
// @errors: expression
#bad(
// ---cut-start---
#let hidden-helper = answer
// ---cut-end---
```

```typst tinymist
// @showEmit
// @showEmittedFile: index.svg
// @noErrors
#broken(
```
