// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '../contexts/ThemeContext'
import { HistoricalModeProvider } from '../contexts/HistoricalModeContext'

// Force dynamic rendering for the entire app
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Diamond Link',
  description: 'Sistema de gestión clínica dental',
  icons: {
    icon: '/Logo.svg',
    shortcut: '/Logo.svg',
    apple: '/Logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
    >
      <html lang="es" suppressHydrationWarning>
        <head>
          <link 
            rel="stylesheet" 
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
            integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          <link rel="icon" href="/Logo.svg" type="image/svg+xml" />
          <link rel="shortcut icon" href="/Logo.svg" />
          <link rel="apple-touch-icon" href="/Logo.svg" />
        </head>
        <body className={inter.className}>
          <ThemeProvider>
            <HistoricalModeProvider>
              <main className="min-h-screen">
                {children}
              </main>
            </HistoricalModeProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}