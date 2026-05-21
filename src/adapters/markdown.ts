import { tinymistFloatingClientScript } from './html.js'
import { renderTinymistCode, type TinymistRenderOptions } from './render.js'
import { shouldActivateTinymist } from '../activation.js'

export interface TinymistMarkdownOptions extends TinymistRenderOptions {
  includeClientScript?: boolean
  clientScript?: string
}

export interface TinymistFenceInfo {
  lang: string
  meta: string
}

export async function renderTinymistMarkdown(
  markdown: string,
  options: TinymistMarkdownOptions = {},
): Promise<string> {
  const lines = splitLines(markdown)
  const output: string[] = []
  let rendered = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const start = parseFenceStart(line)

    if (!start) {
      output.push(line)
      continue
    }

    const block = collectFence(lines, index, start)

    if (!block) {
      output.push(line)
      continue
    }

    index = block.endIndex

    if (!shouldRenderTinymistFence(start.info, options)) {
      output.push(...block.rawLines)
      continue
    }

    const html = await renderTinymistCode(block.code, {
      ...options,
      lang: start.info.lang,
      meta: start.info.meta,
    })
    rendered = true
    output.push(ensureTrailingNewline(html, block.closingLine))
  }

  if (rendered && options.includeClientScript) {
    output.push(options.clientScript ?? tinymistFloatingClientScript())
    output.push('\n')
  }

  return output.join('')
}

export function shouldRenderTinymistFence(
  info: TinymistFenceInfo,
  options: TinymistMarkdownOptions = {},
): boolean {
  return shouldActivateTinymist(
    {
      lang: info.lang,
      meta: info.meta,
    },
    options,
  )
}

export function parseFenceInfo(info: string): TinymistFenceInfo {
  const trimmed = info.trim()
  const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(trimmed)
  const lang = match?.[1] ?? ''
  const meta = match?.[2]?.trim() ?? ''

  return {
    lang,
    meta,
  }
}

interface FenceStart {
  indent: string
  marker: string
  info: TinymistFenceInfo
}

interface FenceBlock {
  code: string
  rawLines: string[]
  closingLine: string
  endIndex: number
}

function splitLines(input: string): string[] {
  const lines = input.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g) ?? []
  return lines.at(-1) === '' ? lines.slice(0, -1) : lines
}

function parseFenceStart(line: string): FenceStart | undefined {
  const text = stripLineEnding(line)
  const match = /^([ \t]*)(`{3,}|~{3,})([^`~]*)$/.exec(text)

  if (!match) {
    return undefined
  }

  return {
    indent: match[1] ?? '',
    marker: match[2] ?? '',
    info: parseFenceInfo(match[3] ?? ''),
  }
}

function collectFence(
  lines: string[],
  startIndex: number,
  start: FenceStart,
): FenceBlock | undefined {
  const rawLines = [lines[startIndex] ?? '']
  const codeLines: string[] = []
  const closePattern = createClosePattern(start)

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    rawLines.push(line)

    if (closePattern.test(stripLineEnding(line))) {
      return {
        code: codeLines.join(''),
        rawLines,
        closingLine: line,
        endIndex: index,
      }
    }

    codeLines.push(line)
  }

  return undefined
}

function createClosePattern(start: FenceStart): RegExp {
  const fenceChar = start.marker[0] ?? '`'
  const escaped = fenceChar === '`' ? '`' : '~'

  return new RegExp(
    `^${escapeRegExp(start.indent)}${escaped}{${start.marker.length},}[ \\t]*$`,
  )
}

function ensureTrailingNewline(html: string, closingLine: string): string {
  const newline = getLineEnding(closingLine) ?? '\n'
  return html.endsWith('\n') ? html : `${html}${newline}`
}

function stripLineEnding(line: string): string {
  return line.replace(/\r\n$|\n$|\r$/, '')
}

function getLineEnding(line: string): string | undefined {
  return /\r\n$/.test(line)
    ? '\r\n'
    : /\n$/.test(line)
      ? '\n'
      : /\r$/.test(line)
        ? '\r'
        : undefined
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
