'use client';
import { useState, useEffect } from 'react';
import { getBitacora } from '@/lib/poa-api';
import type { BitacoraEntry } from '@/types/poa';

export default function BitacoraPage() {
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    getBitacora(page, 20)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const operationColor = (op: string) => {
    switch (op) {
      case 'REGISTRO': return 'bg-green-100 text-green-700';
      case 'EDICION': return 'bg-blue-100 text-blue-700';
      case 'ELIMINACION': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('es-MX', {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
      });
    } catch { return iso; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900">Registro de Actividad</h3>
        <p className="text-gray-500 text-sm mt-1">
          Historial completo de cambios en las metas (altas, bajas y modificaciones).
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-gob-green-200 border-t-gob-green-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No hay registros en la bitácora
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Fecha / Hora</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Operación</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Meta ID</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4 px-6 text-gray-600">{formatDate(entry.created_at)}</td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-800">{entry.usuario_nombre || 'Sistema'}</div>
                    <div className="text-xs text-gray-400">ID: {entry.usuario_id}</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${operationColor(entry.operacion)}`}>
                      {entry.operacion}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center font-medium text-gray-700">
                    #{entry.meta_id}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => toggleExpand(entry.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gob-green-600 hover:bg-gob-green-50 transition-colors"
                    >
                      <svg className={`w-5 h-5 transition-transform ${expandedIds.has(entry.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedIds.has(entry.id) && entry.detalles && (
                      <div className="mt-2 text-left text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                        {entry.detalles}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            Página {page}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              « Anterior
            </button>
            <span className="px-3 py-1.5 bg-gob-green-600 text-white rounded-lg text-sm font-medium">
              {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={entries.length < 20}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
