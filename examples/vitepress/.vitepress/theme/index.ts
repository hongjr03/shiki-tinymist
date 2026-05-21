import DefaultTheme from 'vitepress/theme'
import 'shiki-tinymist/style-rich.css'
import { initTinymistFloating } from 'shiki-tinymist/client'

if (typeof window !== 'undefined') {
  initTinymistFloating()
}

export default DefaultTheme
