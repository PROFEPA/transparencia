'use client';
import { useState, useEffect, FormEvent } from 'react';
import { getUsers, createUser, updateUser, getAreas, getEntidades } from '@/lib/poa-api';
import type { UserPOA, AreaPOA, EntidadFederativa } from '@/types/poa';

const ROLES = ['SUPERADMIN', 'ADMIN', 'SUBCOR', 'ORPA'];

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserPOA[]>([]);
  const [areas, setAreas] = useState<AreaPOA[]>([]);
  const [entidades, setEntidades] = useState<EntidadFederativa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPOA | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [siglas, setSiglas] = useState('');
  const [areaId, setAreaId] = useState('');
  const [entidadId, setEntidadId] = useState<number | ''>('');
  const [rol, setRol] = useState('ORPA');
  const [activo, setActivo] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([getUsers(), getAreas(), getEntidades()])
      .then(([u, a, e]) => { setUsers(u); setAreas(a); setEntidades(e); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setNombre(''); setEmail(''); setPassword(''); setConfirmPassword('');
    setDescripcion(''); setSiglas(''); setAreaId(''); setEntidadId('');
    setRol('ORPA'); setActivo(true); setEditingUser(null); setShowForm(false);
    setError(''); setSuccess('');
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (user: UserPOA) => {
    setEditingUser(user);
    setNombre(user.nombre);
    setEmail(user.email);
    setPassword('');
    setConfirmPassword('');
    setDescripcion(user.descripcion || '');
    setSiglas(user.siglas || '');
    setAreaId(user.area_id || '');
    setEntidadId(user.entidad_id || '');
    setRol(user.rol);
    setActivo(user.activo);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!editingUser && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        const data: any = {
          nombre, email, descripcion, siglas, rol, activo,
          area_id: areaId || null,
          entidad_id: entidadId || null,
        };
        if (password) data.password = password;
        await updateUser(editingUser.id, data);
        setSuccess('Usuario actualizado');
      } else {
        await createUser({
          nombre, email, password, descripcion, siglas,
          area_id: areaId || undefined,
          entidad_id: entidadId || undefined,
          rol, activo,
        });
        setSuccess('Usuario creado exitosamente');
      }
      loadData();
      setTimeout(resetForm, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al guardar usuario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-end">
        <button
          onClick={openCreateForm}
          className="px-5 py-2.5 bg-gob-green-600 text-white rounded-xl text-sm font-semibold hover:bg-gob-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-gob-green-600/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar Nuevo Usuario
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            {editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account data */}
            <div>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                1. Datos de Cuenta (Acceso)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre de Usuario (Login)</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-gob-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-gob-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Contraseña {editingUser && '(dejar vacío para mantener actual)'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required={!editingUser}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-gob-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Confirmar Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required={!editingUser}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-gob-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Profile data */}
            <div>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                2. Datos del Perfil (Sistema)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Descripción Completa (Nombre Subprocuraduría/ORPA)
                  </label>
                  <input
                    type="text"
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-gob-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción Corta (Siglas)</label>
                  <input
                    type="text"
                    value={siglas}
                    onChange={e => setSiglas(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-gob-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Entidad de Adscripción</label>
                  <select
                    value={entidadId}
                    onChange={e => setEntidadId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none"
                  >
                    <option value="">Seleccione una entidad</option>
                    {entidades.map(e => (
                      <option key={e.id} value={e.id}>{e.clave} - {e.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Área</label>
                  <select
                    value={areaId}
                    onChange={e => setAreaId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none"
                  >
                    <option value="">Seleccione un área</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Rol de Usuario</label>
                  <select
                    value={rol}
                    onChange={e => setRol(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gob-green-500 appearance-none"
                  >
                    <option value="">Seleccione un rol</option>
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={e => setActivo(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-gob-green-600 focus:ring-gob-green-500"
                  />
                  <label className="text-sm text-gray-700 font-medium">Usuario Activo en el Sistema</label>
                </div>
              </div>
            </div>

            {/* Messages */}
            {success && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-200 text-sm">✓ {success}</div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 text-sm">{error}</div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gob-green-600 text-white rounded-xl font-semibold hover:bg-gob-green-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Registrar Usuario'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-gob-green-200 border-t-gob-green-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Nombre / Correo</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Perfil (Descripción)</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Rol / Entidad</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gob-gold-200 text-gob-gold-700 flex items-center justify-center font-bold text-sm">
                        {u.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{u.nombre}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-700">{u.siglas || '-'}</div>
                    <div className="text-xs text-gray-400">{u.descripcion || u.area_nombre || '-'}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gob-green-100 text-gob-green-700">
                      {u.rol}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => openEditForm(u)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gob-green-600 hover:bg-gob-green-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
