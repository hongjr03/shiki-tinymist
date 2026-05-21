'use client'

import { useEffect } from 'react'
import { initTinymistFloating } from 'shiki-tinymist/client'

export function TinymistClient() {
  useEffect(() => {
    initTinymistFloating()
  }, [])

  return null
}
