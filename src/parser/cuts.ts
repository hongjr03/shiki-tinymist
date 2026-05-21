export interface CutDirective {
  kind: 'before' | 'after' | 'start' | 'end'
  outputLineIndex: number
}

export function parseCutDirective(
  line: string,
  outputLineIndex: number,
): CutDirective | undefined {
  const match = /^\s*\/\/\s*---cut(?:-(before|after|start|end))?---\s*$/.exec(
    line,
  )
  if (!match) {
    return undefined
  }

  return {
    kind: normalizeCutKind(match[1]),
    outputLineIndex,
  }
}

export function applyCuts<T>(outputLines: T[], cuts: CutDirective[]): T[] {
  if (!cuts.length) {
    return outputLines
  }

  const visible = outputLines.map(() => true)
  let beforeIndex = 0
  let afterIndex = outputLines.length
  const startStack: number[] = []

  for (const cut of cuts) {
    if (cut.kind === 'before') {
      beforeIndex = Math.max(beforeIndex, cut.outputLineIndex)
    } else if (cut.kind === 'after') {
      afterIndex = Math.min(afterIndex, cut.outputLineIndex)
    } else if (cut.kind === 'start') {
      startStack.push(cut.outputLineIndex)
    } else {
      const start = startStack.pop()
      if (start === undefined) {
        continue
      }

      for (let index = start; index < cut.outputLineIndex; index += 1) {
        visible[index] = false
      }
    }
  }

  return outputLines.filter((_, index) => {
    return visible[index] && index >= beforeIndex && index < afterIndex
  })
}

function normalizeCutKind(value: string | undefined): CutDirective['kind'] {
  if (value === 'after' || value === 'start' || value === 'end') {
    return value
  }

  return 'before'
}
