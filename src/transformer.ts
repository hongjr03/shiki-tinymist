import type { ShikiTransformer } from 'shiki'
import { splitTokens } from '@shikijs/core'
import { lineKey, parseTinymistCode } from './parser.js'
import { rendererRich } from './renderer.js'
import type {
  CreateTinymistTransformerOptions,
  HastElement,
  HastNode,
  ParsedTinymistCode,
  TinymistDiagnostic,
  TinymistHover,
  TinymistNode,
  TinymistProvider,
  TinymistQueryResult,
  TinymistShikiReturn,
  TinymistVirtualFile,
  TransformerTinymistOptions,
} from './types.js'
import { createTinymistWasmProvider } from './wasm.js'

const defaultTrigger = /\b(?:tinymist|typst-lsp)\b/

export async function createTinymistTransformer(
  code: string,
  options: CreateTinymistTransformerOptions = {},
): Promise<ShikiTransformer> {
  const result = await prepareTinymistCode(code, options)

  return transformerTinymist({
    ...options,
    result,
  })
}

export async function prepareTinymistCode(
  code: string,
  options: CreateTinymistTransformerOptions = {},
): Promise<TinymistShikiReturn> {
  const parsed = parseTinymistCode(code)
  const provider: TinymistProvider =
    options.provider ?? createTinymistWasmProvider()
  const queryMarkers = parsed.markers.filter(
    (marker) => marker.kind !== 'highlight',
  )
  const queryFiles = resolveQueryFiles(
    parsed.files,
    options.documentUri,
    parsed.code,
  )
  const activeFile = findActiveFile(queryFiles, queryMarkers)
  const queryResult =
    queryMarkers.length > 0
      ? await provider.query({
          code: activeFile.code,
          uri:
            activeFile.uri ??
            resolveDocumentUri(options.documentUri, parsed.code),
          markers: queryMarkers,
          files: queryFiles,
        })
      : { hovers: [] }

  return createTinymistReturn(parsed, queryResult)
}

export function transformerTinymist(
  options: TransformerTinymistOptions = {},
): ShikiTransformer {
  const {
    langs = ['typ', 'typst'],
    langAlias = { typ: 'typst' },
    explicitTrigger = false,
    trigger = defaultTrigger,
    disableTriggers = [
      'notinymist',
      'no-tinymist',
      'notypst-lsp',
      'no-typst-lsp',
    ],
    renderer = rendererRich(),
    throws = true,
  } = options

  const onTinymistError =
    options.onTinymistError ||
    (throws
      ? (error: unknown) => {
          throw error
        }
      : () => undefined)
  const onShikiError =
    options.onShikiError ||
    (throws
      ? (error: unknown) => {
          throw error
        }
      : () => undefined)

  const map = new WeakMap<object, TinymistShikiReturn>()

  return {
    name: 'shiki-tinymist',
    enforce: 'pre',

    preprocess(code) {
      let lang = getLanguage(this.options.lang)
      if (lang && lang in langAlias) {
        lang = langAlias[lang] ?? lang
      }

      if (!shouldTransform(lang, code, this.options, this, options)) {
        return
      }

      try {
        const result =
          options.result ??
          createTinymistReturn(parseTinymistCode(code), options.queryResult)

        map.set(this.meta, result)
        ;(this.meta as { tinymist?: TinymistShikiReturn }).tinymist = result

        if (result.meta?.extension) {
          this.options.lang = result.meta.extension
        } else if (lang) {
          this.options.lang = lang
        }

        return result.code
      } catch (error) {
        const replacement = onTinymistError(error, code, lang ?? '')
        if (typeof replacement === 'string') {
          return replacement
        }
      }
    },

    tokens(tokens) {
      const result = map.get(this.meta)
      if (!result) {
        return
      }

      return splitTokens(
        tokens,
        result.nodes
          .filter((node) => node.length > 0)
          .flatMap((node) => [node.start, node.start + node.length]),
      )
    },

    pre(pre) {
      const result = map.get(this.meta)
      if (!result) {
        return
      }

      addClass(pre as HastElement, ['tinymist', 'lsp'])
    },

    code(codeEl) {
      const result = map.get(this.meta)
      if (!result) {
        return
      }

      const insertAfterLine = (line: number, nodes: HastNode[]): void => {
        if (!nodes.length) {
          return
        }

        let index: number
        if (line >= this.lines.length) {
          index = codeEl.children.length
        } else {
          const lineEl = this.lines[line]
          if (!lineEl) {
            onShikiError(
              new Error(`Cannot find line ${line} in code element`),
              this.source,
              getLanguage(this.options.lang) ?? '',
            )
            return
          }
          index = codeEl.children.indexOf(lineEl)
          if (index === -1) {
            onShikiError(
              new Error(`Cannot find line ${line} in code element`),
              this.source,
              getLanguage(this.options.lang) ?? '',
            )
            return
          }
        }

        const nodeAfter = codeEl.children[index + 1]
        if (
          nodeAfter &&
          nodeAfter.type === 'text' &&
          nodeAfter.value === '\n'
        ) {
          codeEl.children.splice(index + 1, 1)
        }

        codeEl.children.splice(index + 1, 0, ...(nodes as never[]))
      }

      const tokensMap: [
        line: number,
        charStart: number,
        charEnd: number,
        token: HastNode,
      ][] = []

      this.lines.forEach((lineEl, line) => {
        let index = 0
        for (const token of flattenLineTokens(lineEl as HastElement)) {
          const value = getTokenString(token)
          if (value) {
            tokensMap.push([line, index, index + value.length, token])
            index += value.length
          }
        }
      })

      const locateTextTokens = (node: TinymistNode): HastNode[] => {
        const start = node.character
        const end = node.character + node.length
        if (node.length === 0) {
          return tokensMap
            .filter(([line, tokenStart, tokenEnd]) => {
              return (
                line === node.line && tokenStart < start && start <= tokenEnd
              )
            })
            .map((item) => item[3])
        }

        return tokensMap
          .filter(([line, tokenStart, tokenEnd]) => {
            return (
              line === node.line &&
              start <= tokenStart &&
              tokenStart < end &&
              start < tokenEnd &&
              tokenEnd <= end
            )
          })
          .map((item) => item[3])
      }

      const wrapTokens = (
        node: TinymistNode,
        wrap: (children: HastNode[]) => HastNode[],
      ): void => {
        const line = this.lines[node.line] as HastElement | undefined
        if (!line?.children) {
          return
        }

        let charIndex = 0
        let itemStart = line.children.length
        let itemEnd = 0

        line.children.forEach((token, index) => {
          if (charIndex >= node.character && index < itemStart) {
            itemStart = index
          }
          if (charIndex <= node.character + node.length && index > itemEnd) {
            itemEnd = index
          }
          charIndex += getTokenString(token as HastNode).length
        })

        if (charIndex <= node.character + node.length) {
          itemEnd = line.children.length
        }

        const targets = line.children.slice(itemStart, itemEnd) as HastNode[]
        if (!targets.length) {
          return
        }

        line.children.splice(
          itemStart,
          targets.length,
          ...(wrap(targets) as never[]),
        )
      }

      const tokensSkipHover = new Set<HastNode>()
      const hoverActions: (() => void)[] = []
      const highlightActions: (() => void)[] = []

      for (const node of result.nodes) {
        if (node.type === 'completion') {
          if (renderer.lineCompletion) {
            insertAfterLine(node.line, renderer.lineCompletion.call(this, node))
          }
          continue
        }

        const tokens = locateTextTokens(node)

        if (
          !tokens.length &&
          !(node.type === 'diagnostic' && renderer.lineDiagnostic)
        ) {
          onShikiError(
            new Error(`Cannot find tokens for node: ${JSON.stringify(node)}`),
            this.source,
            getLanguage(this.options.lang) ?? '',
          )
          continue
        }

        if (node.type === 'diagnostic') {
          tokens.forEach((token) => tokensSkipHover.add(token))

          if (renderer.nodesDiagnostic) {
            highlightActions.push(() => {
              wrapTokens(
                node,
                (targets) =>
                  renderer.nodesDiagnostic?.call(this, node, targets) ??
                  targets,
              )
            })
          }

          if (renderer.lineDiagnostic) {
            insertAfterLine(node.line, renderer.lineDiagnostic.call(this, node))
          }
          continue
        }

        if (node.type === 'highlight') {
          if (renderer.nodesHighlight) {
            highlightActions.push(() => {
              wrapTokens(
                node,
                (targets) =>
                  renderer.nodesHighlight?.call(this, node, targets) ?? targets,
              )
            })
          }
          continue
        }

        hoverActions.push(() => {
          if (tokens.some((token) => tokensSkipHover.has(token))) {
            return
          }

          tokens.forEach((token) => tokensSkipHover.add(token))
          wrapTokens(node, (targets) => {
            const wrappedToken: HastElement = {
              type: 'element',
              tagName: 'span',
              properties: {},
              children: targets,
            }
            return [
              renderer.nodeHover.call(this, node, wrappedToken) as HastNode,
            ]
          })
        })
      }

      hoverActions.forEach((action) => action())
      highlightActions.forEach((action) => action())
    },
  }

  function shouldTransform(
    lang: string | undefined,
    code: string,
    codeOptions: unknown,
    context: unknown,
    transformOptions: TransformerTinymistOptions,
  ): boolean {
    if (transformOptions.filter) {
      return transformOptions.filter(lang ?? '', code, codeOptions, context)
    }

    const rawMeta = getMeta((codeOptions as { meta?: unknown }).meta) ?? ''
    const enabledByLang = !!lang && langs.includes(lang)
    const enabledByTrigger = !explicitTrigger || trigger.test(rawMeta)
    const disabled = disableTriggers.some((item) => {
      return typeof item === 'string'
        ? rawMeta.includes(item)
        : item.test(rawMeta)
    })

    return enabledByLang && enabledByTrigger && !disabled
  }
}

function createTinymistReturn(
  parsed: ParsedTinymistCode,
  queryResult?: TinymistQueryResult,
): TinymistShikiReturn {
  const lineOffsets = getLineOffsets(parsed.code)
  const nodes: TinymistNode[] = []

  for (const marker of parsed.markers) {
    if (marker.kind === 'highlight') {
      const line = marker.line - 1
      const character = marker.column - 1
      nodes.push({
        type: 'highlight',
        line,
        character,
        length: marker.length,
        start: (lineOffsets[line] ?? 0) + character,
      })
      continue
    }

    if (marker.kind === 'completion') {
      const completion = queryResult?.completions?.find(
        (item) => item.markerId === marker.id,
      )
      if (!completion?.items.length) {
        continue
      }

      const line =
        resolveOutputLine(
          parsed,
          completion.fileName ?? marker.fileName,
          completion.line ?? marker.queryLine,
          marker.line,
        ) - 1
      const character = (completion.column ?? marker.column) - 1
      nodes.push({
        type: 'completion',
        markerId: marker.id,
        line,
        character,
        length: 0,
        start: (lineOffsets[line] ?? 0) + character,
        items: completion.items,
      })
      continue
    }

    const hover = queryResult?.hovers.find(
      (item) => item.markerId === marker.id,
    )
    if (!hover?.markdown && !marker.label) {
      continue
    }

    const line =
      resolveOutputLine(
        parsed,
        hover?.fileName ?? marker.fileName,
        hover?.line ?? marker.queryLine,
        marker.line,
      ) - 1
    const character = (hover?.column ?? marker.column) - 1
    const length = hover?.length ?? marker.length
    nodes.push({
      type: 'hover',
      markerId: marker.id,
      line,
      character,
      length,
      start: (lineOffsets[line] ?? 0) + character,
      markdown: hover?.markdown ?? marker.label ?? '',
      ...(hover?.plainText ? { plainText: hover.plainText } : {}),
    })
  }

  for (const diagnostic of filterDiagnostics(
    parsed,
    queryResult?.diagnostics ?? [],
  )) {
    const outputLine = resolveDiagnosticOutputLine(parsed, diagnostic)
    if (!outputLine) {
      continue
    }

    const line = outputLine - 1
    const character = diagnostic.column - 1
    nodes.push({
      type: 'diagnostic',
      line,
      character,
      length: diagnostic.length ?? 1,
      start: (lineOffsets[line] ?? 0) + character,
      message: diagnostic.message,
      ...(diagnostic.severity ? { severity: diagnostic.severity } : {}),
    })
  }

  return {
    code: parsed.code,
    nodes,
    meta: {
      extension: 'typst',
    },
  }
}

function resolveQueryFiles(
  files: TinymistVirtualFile[],
  documentUri: TransformerTinymistOptions['documentUri'],
  code: string,
): TinymistVirtualFile[] {
  const baseUri = resolveDocumentUri(documentUri, code)
  if (files.length <= 1) {
    return [
      {
        ...(files[0] ?? { fileName: 'index.typ', code }),
        uri: baseUri,
      },
    ]
  }

  const rootUri = baseUri.replace(/\/?[^/]*$/, '/')
  return files.map((file) => ({
    ...file,
    uri: `${rootUri}${encodeFilePath(file.fileName)}`,
  }))
}

function findActiveFile(
  files: TinymistVirtualFile[],
  markers: Array<{ fileName?: string }>,
): TinymistVirtualFile {
  const markerFileName = markers.find((marker) => marker.fileName)?.fileName
  if (markerFileName) {
    const file = files.find((item) => item.fileName === markerFileName)
    if (file) {
      return file
    }
  }

  return (
    files.find((file) => file.code.trim()) ??
    files[0] ?? {
      fileName: 'index.typ',
      code: '',
    }
  )
}

function resolveOutputLine(
  parsed: ParsedTinymistCode,
  fileName: string | undefined,
  queryLine: number | undefined,
  fallbackLine: number,
): number {
  if (fileName && queryLine) {
    return (
      parsed.queryLineToOutputLine[lineKey(fileName, queryLine)] ?? fallbackLine
    )
  }

  return fallbackLine
}

function isOutputLineVisible(
  parsed: ParsedTinymistCode,
  line: number,
): boolean {
  return line >= 1 && line <= parsed.code.split('\n').length
}

function resolveDiagnosticOutputLine(
  parsed: ParsedTinymistCode,
  diagnostic: TinymistDiagnostic,
): number | undefined {
  const fileNames = diagnostic.fileName
    ? [diagnostic.fileName]
    : parsed.files.map((file) => file.fileName)

  for (const fileName of fileNames) {
    const outputLine =
      parsed.queryLineToOutputLine[lineKey(fileName, diagnostic.line)]
    if (outputLine && isOutputLineVisible(parsed, outputLine)) {
      return outputLine
    }
  }

  return undefined
}

function filterDiagnostics(
  parsed: ParsedTinymistCode,
  diagnostics: TinymistDiagnostic[],
): TinymistDiagnostic[] {
  if (parsed.diagnosticsMode === 'hide') {
    return []
  }

  if (parsed.diagnosticsMode !== 'expect') {
    return diagnostics
  }

  return diagnostics.filter((diagnostic) => {
    const text = [diagnostic.code, diagnostic.message]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return parsed.expectedErrors.some((expected) => {
      return text.includes(expected.toLowerCase())
    })
  })
}

function resolveDocumentUri(
  documentUri: TransformerTinymistOptions['documentUri'],
  code: string,
): string {
  if (typeof documentUri === 'function') {
    return documentUri(code)
  }

  if (typeof documentUri === 'string') {
    return documentUri
  }

  return `untitled://shiki-tinymist/${hashCode(code)}.typ`
}

function encodeFilePath(fileName: string): string {
  return fileName
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function getMeta(meta: unknown): string | undefined {
  if (typeof meta === 'string') {
    return meta
  }

  if (typeof meta === 'object' && meta && '__raw' in meta) {
    const raw = (meta as { __raw?: unknown }).__raw
    return typeof raw === 'string' ? raw : undefined
  }

  return undefined
}

function getLanguage(language: unknown): string | undefined {
  return typeof language === 'string' ? language : undefined
}

function addClass(node: HastElement, className: string | string[]): void {
  node.properties ??= {}
  const classNames = Array.isArray(className) ? className : [className]
  const current = node.properties.class

  if (Array.isArray(current)) {
    for (const name of classNames) {
      if (!current.includes(name)) {
        current.push(name)
      }
    }
    return
  }

  const names =
    typeof current === 'string'
      ? new Set(current.split(/\s+/).filter(Boolean))
      : new Set<string>()

  for (const name of classNames) {
    names.add(name)
  }

  node.properties.class = [...names].join(' ')
}

function flattenLineTokens(line: HastElement): HastNode[] {
  return (line.children ?? []).flatMap((child) => {
    if (child.type === 'element') {
      return (child.children ?? []) as HastNode[]
    }
    return [child]
  }) as HastNode[]
}

function getTokenString(token: HastNode): string {
  if (token.type === 'text') {
    return token.value
  }
  return (token.children ?? []).map(getTokenString).join('')
}

function getLineOffsets(code: string): number[] {
  const offsets = [0]
  for (let index = 0; index < code.length; index += 1) {
    if (code[index] === '\n') {
      offsets.push(index + 1)
    }
  }
  return offsets
}

function hashCode(input: string): string {
  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }

  return hash.toString(16)
}

export type { TinymistHover }
