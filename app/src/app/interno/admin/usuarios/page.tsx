'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: number; email: string; nombre: string; role: string;
  oficina: string | null; activo: number;
}

const OFICINAS = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','CDMX-ZMVM',
  'Chiapas','Chihuahua','Coahuila','Colima','Durango','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','México','Nayarit','Nuevo León',
  'Oaxaca','Oficinas Centrales','Puebla','Querétaro','Quintana Roo',
  'San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','ZMVM','Zacatecas',
];

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email:'', password:'', nombre:'', role:'orpa', oficina:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [searchQ, setSearchQ] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function load() {
    const res = await fetch('/api/interno/admin/usuarios');
    if (res.status === 401) { router.push('/interno/login'); return; }
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await fetch('/api/interno/admin/usuarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Error al crear usuario'); setSaving(false); return; }
    setShowForm(false);
    setForm({ email:'', password:'', nombre:'', role:'orpa', oficina:'' });
    showToast('Usuario creado correctamente');
    await load();
    setSaving(false);
  }

  async function toggleActive(id: number, activo: number) {
    await fetch('/api/interno/admin/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, activo: activo ? 0 : 1 }),
    });
    showToast(activo ? 'Usuario desactivado' : 'Usuario activado');
    await load();
  }

  const filtered = searchQ
    ? users.filter(u =>
        u.nombre.toLowerCase().includes(searchQ.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQ.toLowerCase()) ||
        (u.oficina ?? '').toLowerCase().includes(searchQ.toLowerCase())
      )
    : users;

  const adminCount = users.filter(u => u.role === 'admin').length;
  const orpaCount = users.filter(u => u.role === 'orpa').length;
  const activeCount = users.filter(u => u.activo).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#235B4E] to-[#1a4439] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-4 h-16">
            <Link href="/interno/admin"
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="font-bold text-lg leading-tight">Gestión de usuarios</h1>
              <p className="text-green-300 text-xs">POA 2026 · Panel Administrador</p>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/interno/admin/capturas" className="hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors">Capturas</Link>
              <Link href="/interno/admin/publicar" className="hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors">Publicar</Link>
              <Link href="/interno/admin/usuarios" className="bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium">Usuarios</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-black text-[#235B4E]">{users.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">usuarios totales</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-black text-blue-600">{orpaCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">usuarios ORPA</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">usuarios activos</div>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar por nombre, email u oficina..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E]" />
          </div>
          <div className="flex-1" />
          <button onClick={() => { setShowForm(!showForm); setError(''); }}
            className="bg-[#235B4E] hover:bg-[#1a4439] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
            {showForm ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nuevo usuario
              </>
            )}
          </button>
        </div>

        {/* New user form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-[#235B4E]/20 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#235B4E] text-white rounded-lg flex items-center justify-center text-sm">+</span>
              Crear nuevo usuario
            </h3>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex gap-2">
                <span className="flex-shrink-0">⚠</span> {error}
              </div>
            )}
            <form onSubmit={createUser} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre completo *</label>
                <input required value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E]"
                  placeholder="Nombre del responsable" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Correo electrónico *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E]"
                  placeholder="usuario@profepa.gob.mx" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Contraseña *</label>
                <input required type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E]"
                  placeholder="Mínimo 8 caracteres" minLength={8} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Rol *</label>
                <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E] bg-white">
                  <option value="orpa">ORPA — Oficina regional de protección ambiental</option>
                  <option value="admin">Administrador — Acceso total</option>
                </select>
              </div>
              {form.role === 'orpa' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Oficina / Estado *</label>
                  <select value={form.oficina} onChange={e => setForm(f => ({...f, oficina: e.target.value}))} required
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#235B4E] bg-white">
                    <option value="">Selecciona la oficina...</option>
                    {OFICINAS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2 bg-[#235B4E] hover:bg-[#1a4439] text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors flex items-center gap-2">
                  {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-8 h-8 border-4 border-[#235B4E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Cargando usuarios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-4xl mb-3">👤</div>
            <p className="font-medium text-gray-600">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{filtered.length} usuarios</span>
              <span className="text-xs text-gray-400">{adminCount} admin · {orpaCount} ORPA</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Oficina</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${!u.activo ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{u.nombre}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'ORPA'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {u.oficina ? (
                        <Link href={`/interno/admin/orpa/${encodeURIComponent(u.oficina)}`}
                          className="hover:text-[#235B4E] hover:underline">
                          {u.oficina}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => toggleActive(u.id, u.activo)}
                        className={`text-xs border px-3 py-1.5 rounded-lg transition-colors ${
                          u.activo
                            ? 'border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-gray-600'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#235B4E] text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
