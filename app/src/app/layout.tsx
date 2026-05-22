import type { Metadata } from 'next'
import './globals.css'
import PublicShell from '@/components/PublicShell'

export const metadata: Metadata = {
  title: 'Tablero de Indicadores | PROFEPA',
  description: 'Consulta los indicadores institucionales de la Procuraduría Federal de Protección al Ambiente. Información pública sobre inspección, vigilancia y regulación ambiental.',
  keywords: ['PROFEPA', 'transparencia', 'indicadores', 'medio ambiente', 'inspección ambiental', 'gobierno de México'],
  authors: [{ name: 'PROFEPA' }],
  openGraph: {
    title: 'Tablero de Indicadores | PROFEPA',
    description: 'Consulta los indicadores institucionales de inspección y vigilancia ambiental',
    type: 'website',
    locale: 'es_MX',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gob-green-500 text-white px-4 py-2 rounded-xl z-50"
        >
          Saltar al contenido principal
        </a>
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  )
}
