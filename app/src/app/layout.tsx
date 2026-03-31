import type { Metadata } from 'next'
import './globals.css'

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
        
        {/* Top institutional bar */}
        <div className="bg-gob-red-500 text-white relative z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between text-xs font-medium">
            <span className="tracking-wide">Gobierno de México</span>
            <a 
              href="https://www.gob.mx/profepa" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white/80 transition-colors"
            >
              gob.mx/profepa →
            </a>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="sticky top-0 z-40 bg-gob-green-500/95 backdrop-blur-lg border-b border-white/10 shadow-lg shadow-gob-green-900/20" role="navigation" aria-label="Navegación principal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center font-black text-lg text-white group-hover:bg-white/30 transition-colors">
                  P
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-base leading-tight tracking-tight">PROFEPA</span>
                  <span className="text-white/60 text-[10px] leading-tight hidden sm:block">Tablero de Indicadores</span>
                </div>
              </a>
              
              <div className="hidden md:flex items-center gap-1">
                {[
                  { href: '/', label: 'Inicio' },
                  { href: '/indicadores', label: 'Indicadores' },
                  { href: '/descargas', label: 'Descargas' },
                  { href: '/metodologia', label: 'Metodología' },
                  { href: '/glosario', label: 'Glosario' },
                ].map(link => (
                  <a 
                    key={link.href}
                    href={link.href} 
                    className="text-white/80 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="md:hidden">
                <button 
                  type="button"
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Abrir menú"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main id="main-content" className="min-h-screen" role="main">
          {children}
        </main>

        {/* Modern Footer */}
        <footer className="relative bg-gray-900 text-white overflow-hidden" role="contentinfo">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gob-green-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gob-gold-500 rounded-full blur-3xl" />
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gob-green-500 flex items-center justify-center font-black text-lg">P</div>
                  <div>
                    <div className="font-bold text-lg">PROFEPA</div>
                    <div className="text-gray-400 text-xs">Procuraduría Federal de Protección al Ambiente</div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                  Órgano administrativo desconcentrado de la SEMARNAT, responsable de la procuración de la justicia ambiental en México.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider text-gray-300 mb-4">Navegación</h4>
                <ul className="space-y-3">
                  {['Indicadores', 'Metodología', 'Descargas', 'Glosario'].map(item => (
                    <li key={item}>
                      <a href={`/${item.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`} className="text-gray-400 hover:text-white transition-colors text-sm">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider text-gray-300 mb-4">Legal</h4>
                <p className="text-gray-500 text-xs leading-relaxed">
                  La información proviene de documentos institucionales y se publica con fines informativos. La interpretación oficial corresponde a PROFEPA.
                </p>
              </div>
            </div>
            
            <div className="border-t border-gray-800 pt-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <p className="text-gray-400 text-sm font-medium">Desarrollado por la Coordinación de Estudios Prospectivos y Valoración de Riesgos</p>
                  <p className="text-gray-500 text-xs mt-1">Alan Jesús Guerrero Sandoval · <a href="mailto:alan.guerrero@profepa.gob.mx" className="text-gob-gold-400 hover:text-gob-gold-500 transition-colors">alan.guerrero@profepa.gob.mx</a></p>
                </div>
                <p className="text-gray-600 text-xs">© {new Date().getFullYear()} PROFEPA — Gobierno de México</p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
