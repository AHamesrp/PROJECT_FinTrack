import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

/* ============================================================
   Fonte: Inter para heading e body (única família tipográfica)
   ============================================================ */
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FinTrack — Análise de Extratos Bancários',
  description:
    'Plataforma inteligente para análise e visualização de extratos bancários.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f7' },
    { media: '(prefers-color-scheme: dark)', color: '#1e1e1e' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /* bg-background → token: fundo geral da página (veja globals.css) */
    <html lang="pt-BR" suppressHydrationWarning className="bg-background">
      <body className={`${inter.className} antialiased`}>
        {/* ThemeProvider habilita alternância claro/escuro via next-themes */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
