import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dashboard de Transparencia | PROFEPA',
  description: 'Consulta los indicadores institucionales de la Procuraduría Federal de Protección al Ambiente. Información pública sobre inspección, vigilancia y regulación ambiental.',
  keywords: ['PROFEPA', 'transparencia', 'indicadores', 'medio ambiente', 'inspección ambiental', 'gobierno de México'],
  authors: [{ name: 'PROFEPA' }],
  openGraph: {
    title: 'Dashboard de Transparencia | PROFEPA',
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
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gob-green-500 text-white px-4 py-2 rounded z-50"
        >
          Saltar al contenido principal
        </a>
        
        {/* Header institucional */}
        <header className="bg-gob-red-500 text-white" role="banner">
          <div className="max-w-7xl mx-auto px-4 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Gobierno de México</span>
              <nav aria-label="Enlaces institucionales">
                <a 
                  href="https://www.gob.mx/profepa" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline focus:underline focus:outline-none"
                >
                  gob.mx/profepa
                </a>
              </nav>
            </div>
          </div>
        </header>
        
        {/* Navegación principal */}
        <nav className="bg-gob-green-500 text-white shadow-lg" role="navigation" aria-label="Navegación principal">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <a href="/" className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-white rounded">
                  <span className="text-xl font-bold">PROFEPA</span>
                  <span className="hidden sm:inline text-sm opacity-90">| Dashboard de Transparencia</span>
                </a>
              </div>
              
              <div className="hidden md:flex items-center space-x-6">
                <a href="/" className="hover:opacity-80 focus:outline-none focus:underline py-2">Inicio</a>
                <a href="/indicadores" className="hover:opacity-80 focus:outline-none focus:underline py-2">Indicadores</a>
                <a href="/descargas" className="hover:opacity-80 focus:outline-none focus:underline py-2">Descargas</a>
                <a href="/metodologia" className="hover:opacity-80 focus:outline-none focus:underline py-2">Metodología</a>
                <a href="/glosario" className="hover:opacity-80 focus:outline-none focus:underline py-2">Glosario</a>
              </div>
              
              {/* Menú móvil */}
              <div className="md:hidden">
                <button 
                  type="button"
                  className="p-2 rounded hover:bg-gob-green-600 focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Abrir menú de navegación"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Contenido principal */}
        <main id="main-content" className="min-h-screen" role="main">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white mt-12" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-bold text-lg mb-4">PROFEPA</h3>
                <p className="text-gray-300 text-sm">
                  Procuraduría Federal de Protección al Ambiente
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Órgano administrativo desconcentrado de la SEMARNAT
                </p>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-4">Enlaces</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>
                    <a href="/metodologia" className="hover:text-white focus:outline-none focus:underline">
                      Metodología y fuentes
                    </a>
                  </li>
                  <li>
                    <a href="/descargas" className="hover:text-white focus:outline-none focus:underline">
                      Descargas de datos
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://www.gob.mx/profepa" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-white focus:outline-none focus:underline"
                    >
                      Sitio oficial PROFEPA
                    </a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-4">Aviso Legal</h3>
                <p className="text-gray-400 text-xs">
                  La información proviene de documentos institucionales y se publica con fines 
                  informativos. La interpretación oficial corresponde a PROFEPA.
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Última actualización: {new Date().toLocaleDateString('es-MX')}
                </p>
              </div>
            </div>
            
            <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-xs">
              <p>© {new Date().getFullYear()} PROFEPA - Gobierno de México</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
