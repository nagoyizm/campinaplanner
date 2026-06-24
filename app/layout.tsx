import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'Cabañas La Campiña — Sistema de Reservas',
  description: 'Sistema de gestión de reservas para Cabañas La Campiña',
  keywords: ['reservas', 'cabañas', 'la campiña', 'planner'],
  openGraph: {
    title: 'Cabañas La Campiña — Sistema de Reservas',
    description: 'Sistema de gestión de reservas para Cabañas La Campiña',
    url: 'https://campinaplanner.vercel.app',
    siteName: 'Planner La Campiña',
    images: [
      {
        url: 'https://campinaplanner.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cabañas La Campiña',
      },
    ],
    locale: 'es_CL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cabañas La Campiña — Sistema de Reservas',
    description: 'Sistema de gestión de reservas para Cabañas La Campiña',
    images: ['https://campinaplanner.vercel.app/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={outfit.variable} suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
