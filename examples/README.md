# shiki-tinymist framework examples

Each example contains a full-feature Typst fence with:

- hover markers
- completion markers
- static highlight markers
- cut directives
- virtual files
- diagnostic directives
- recognized emit directives

The package expects the Tinymist WASM package to be built manually before these
examples are run:

```sh
git submodule update --init --recursive
npm run tinymist:build
npm install
npm run build
```

Framework examples should import `shiki-tinymist/style-rich.css` and install the
small floating client from `shiki-tinymist/client` when code blocks can scroll.
