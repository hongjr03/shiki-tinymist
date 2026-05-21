import 'shiki-tinymist/style-rich.css'
import { TinymistClient } from './tinymist-client'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <TinymistClient />
      </body>
    </html>
  )
}
