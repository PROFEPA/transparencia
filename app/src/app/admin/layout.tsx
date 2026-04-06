'use client';
import { ReactNode, useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Tablero', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/admin/registrar', label: 'Registrar', icon: 'M12 4v16m8-8H4' },
  { href: '/admin/reporte', label: 'Ver Reporte', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/admin/editar', label: 'Editar', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', roles: ['SUPERADMIN', 'ADMIN'] },
  { href: '/admin/bitacora', label: 'Bitácora', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['SUPERADMIN', 'ADMIN'] },
];

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const { user, loading, logout, isRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [user, loading, pathname, router]);

  // Login page - no layout wrapper
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gob-green-200 border-t-gob-green-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const visibleNav = NAV_ITEMS.filter(
    item => !item.roles || item.roles.some(r => isRole(r))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 fixed inset-y-0 left-0 z-30`}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <a href="/" className="flex items-center gap-3">
            <img src="/picture/Profepa_-02.png" alt="PROFEPA" className="h-10 w-auto flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-gob-green-700 font-bold text-base leading-tight">PROFEPA</span>
                <span className="text-gray-400 text-[10px] leading-tight">Indicadores</span>
              </div>
            )}
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleNav.map(item => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gob-green-600 text-white shadow-lg shadow-gob-green-600/20'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={item.label}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-72'} transition-all duration-300`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800 uppercase tracking-wide">
                {visibleNav.find(n => pathname === n.href || (n.href !== '/admin' && pathname?.startsWith(n.href)))?.label || 'Gestión Federal de Indicadores'}
              </h1>
              {user.rol && (
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-gob-gold-100 text-gob-gold-700 text-xs font-semibold rounded-full uppercase">
                  {user.rol}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-800">{user.nombre}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
              </div>
              <button
                onClick={logout}
                className="w-10 h-10 rounded-full bg-gob-green-600 text-white flex items-center justify-center font-bold text-sm uppercase hover:bg-gob-green-700 transition-colors"
                title="Cerrar sesión"
              >
                {user.nombre?.charAt(0) || 'U'}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthProvider>
  );
}
