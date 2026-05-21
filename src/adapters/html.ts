export const tinymistRichStyleImport = "import 'shiki-tinymist/style-rich.css'"

export function tinymistFloatingClientScript(
  importPath = 'shiki-tinymist/client',
): string {
  return [
    '<script type="module">',
    `  import { initTinymistFloating } from '${importPath}'`,
    '  initTinymistFloating()',
    '</script>',
  ].join('\n')
}
