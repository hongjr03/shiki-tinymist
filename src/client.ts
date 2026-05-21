export interface TinymistFloatingOptions {
  root?: ParentNode | string
  portal?: HTMLElement
  hoverSelector?: string
  offset?: number
  padding?: number
}

export function initTinymistFloating(
  options: TinymistFloatingOptions = {},
): () => void {
  if (typeof document === 'undefined') {
    return () => {}
  }

  const root = resolveRoot(options.root)
  const portal = options.portal ?? ensurePortalRoot()
  const hoverSelector = options.hoverSelector ?? '.tinymist-hover'
  const offset = options.offset ?? 8
  const padding = options.padding ?? 8
  const cleanups: Array<() => void> = []

  for (const anchor of root.querySelectorAll<HTMLElement>(hoverSelector)) {
    const popup = findDirectPopup(anchor)
    if (!popup) {
      continue
    }
    const popupElement = popup

    const placeholder = document.createComment('tinymist-popup')
    popupElement.before(placeholder)
    portal.append(popupElement)
    popupElement.classList.add('tinymist-floating-popup')
    popupElement.hidden = true

    let hideTimer = 0
    let visible = false

    const clearHideTimer = () => {
      if (hideTimer) {
        window.clearTimeout(hideTimer)
        hideTimer = 0
      }
    }

    const show = () => {
      clearHideTimer()
      if (!visible) {
        visible = true
        popupElement.hidden = false
        popupElement.style.display = 'inline-flex'
        popupElement.style.opacity = '0'
        popupElement.style.pointerEvents = 'auto'
        window.addEventListener('scroll', position, true)
        window.addEventListener('resize', position)
      }

      position()
      popupElement.style.opacity = '1'
    }

    const hide = () => {
      clearHideTimer()
      if (!visible) {
        return
      }

      visible = false
      popupElement.hidden = true
      popupElement.style.display = 'none'
      popupElement.style.opacity = '0'
      popupElement.style.pointerEvents = 'none'
      window.removeEventListener('scroll', position, true)
      window.removeEventListener('resize', position)
    }

    const scheduleHide = () => {
      clearHideTimer()
      hideTimer = window.setTimeout(hide, 80)
    }

    function position() {
      const anchorRect = anchor.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = document.documentElement.clientHeight

      popupElement.style.left = '0px'
      popupElement.style.top = '0px'
      popupElement.style.maxWidth = `${Math.max(160, viewportWidth - padding * 2)}px`

      const popupRect = popupElement.getBoundingClientRect()
      const left = clamp(
        anchorRect.left,
        padding,
        viewportWidth - popupRect.width - padding,
      )

      let top = anchorRect.bottom + offset
      let placement = 'bottom'

      if (
        top + popupRect.height > viewportHeight - padding &&
        anchorRect.top - popupRect.height - offset >= padding
      ) {
        top = anchorRect.top - popupRect.height - offset
        placement = 'top'
      } else {
        top = Math.min(top, viewportHeight - popupRect.height - padding)
      }

      popupElement.style.left = `${Math.max(padding, left)}px`
      popupElement.style.top = `${Math.max(padding, top)}px`
      popupElement.dataset.tinymistPlacement = placement
    }

    anchor.addEventListener('mouseenter', show)
    anchor.addEventListener('mouseleave', scheduleHide)
    anchor.addEventListener('focusin', show)
    anchor.addEventListener('focusout', scheduleHide)
    popupElement.addEventListener('mouseenter', clearHideTimer)
    popupElement.addEventListener('mouseleave', scheduleHide)
    popupElement.addEventListener('focusout', scheduleHide)

    cleanups.push(() => {
      hide()
      anchor.removeEventListener('mouseenter', show)
      anchor.removeEventListener('mouseleave', scheduleHide)
      anchor.removeEventListener('focusin', show)
      anchor.removeEventListener('focusout', scheduleHide)
      popupElement.removeEventListener('mouseenter', clearHideTimer)
      popupElement.removeEventListener('mouseleave', scheduleHide)
      popupElement.removeEventListener('focusout', scheduleHide)
      popupElement.classList.remove('tinymist-floating-popup')
      popupElement.removeAttribute('style')
      popupElement.hidden = false
      placeholder.replaceWith(popupElement)
    })
  }

  return () => {
    for (const cleanup of cleanups.reverse()) {
      cleanup()
    }
  }
}

function resolveRoot(root: ParentNode | string | undefined): ParentNode {
  if (typeof root === 'string') {
    return document.querySelector(root) ?? document
  }

  return root ?? document
}

function ensurePortalRoot(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(
    '.tinymist-floating-root',
  )
  if (existing) {
    return existing
  }

  const portal = document.createElement('div')
  portal.className = 'tinymist tinymist-floating-root'
  document.body.append(portal)
  return portal
}

function findDirectPopup(anchor: HTMLElement): HTMLElement | undefined {
  for (const child of anchor.children) {
    if (child.classList.contains('tinymist-popup-container')) {
      return child as HTMLElement
    }
  }

  return undefined
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}
