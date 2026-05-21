import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = join(root, 'vendor', 'tinymist', 'crates', 'tinymist', 'pkg')
const required = ['package.json', 'tinymist.js', 'tinymist_bg.wasm']

const missing = []

for (const file of required) {
  try {
    await access(join(pkg, file))
  } catch {
    missing.push(file)
  }
}

if (missing.length) {
  console.error(
    [
      'Tinymist WASM package is missing.',
      '',
      'Run these commands manually before running the demo or local integration tests:',
      '',
      '  git submodule update --init --recursive',
      '  npm run tinymist:build',
      '  npm install',
      '',
      `Missing files under vendor/tinymist/crates/tinymist/pkg: ${missing.join(', ')}`,
    ].join('\n'),
  )
  process.exit(1)
}
