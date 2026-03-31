'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Indicator, Observation } from '@/types';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine
} from 'recharts';

const COLORS = {
  primary: '#235B4E', secondary: '#691C32', gold: '#BC955C',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444', gray: '#6B7280'
};

interface IndicatorDetail {
  indicador: Indicator;
  observaciones: Observation[];
  tiene_serie: boolean;
}

function getNivelExplicacion(nivel: string | undefined): string {
  switch (nivel) {
    case 'Fin': return 'Objetivo estratégico que contribuye al bienestar de la población.';
    case 'Propósito': return 'Resultado que se espera lograr con las acciones de PROFEPA.';
    case 'Componente': return 'Productos o servicios que genera la institución.';
    case 'Actividad': return 'Acciones específicas que realiza la institución.';
    default: return '';
  }
}

function colorNivel(nivel: string | undefined): string {
  switch (nivel) {
    case 'Fin': return 'bg-purple-500/20 text-purple-200';
    case 'Propósito': return 'bg-blue-500/20 text-blue-200';
    case 'Componente': return 'bg-emerald-500/20 text-emerald-200';
    case 'Actividad': return 'bg-orange-500/20 text-orange-200';
    default: return 'bg-white/10 text-white/70';
  }
}

function limpiarTexto(texto: string | null | undefined, maxLength: number = 500): string {
  if (!texto) return '';
  if (texto.length > maxLength) {
    const puntoIndex = texto.substring(0, maxLength).lastIndexOf('.');
    return puntoIndex > maxLength * 0.5 ? texto.substring(0, puntoIndex + 1) : texto.substring(0, maxLength) + '...';
  }
  return texto;
}

function textoMalFormateado(texto: string | null | undefined): boolean {
  if (!texto) return false;
  if (texto.length > 800) return true;
  if ((texto.match(/Método de Cálculo/gi) || []).length > 1) return true;
  return false;
}

const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' };

export default function IndicadorDetailPage() {
  const params = useParams();
  const indicatorId = params.id as string;

  const [data, setData] = useState<IndicatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [selectedEntity, setSelectedEntity] = useState<string>('Nacional');
  const [stateTab, setStateTab] = useState<'ranking' | 'comparison'>('ranking');
  const [stateChartCount, setStateChartCount] = useState<number>(35);

  useEffect(() => {
    async function loadData() {
      try {
        const [indRes, obsRes] = await Promise.all([
          fetch('/data/indicators.json'),
          fetch('/data/observations.json')
        ]);
        if (!indRes.ok || !obsRes.ok) throw new Error('Error cargando datos');
        const indicators: Indicator[] = await indRes.json();
        const observations: Observation[] = await obsRes.json();
        const indicator = indicators.find(i => i.id === indicatorId);
        if (!indicator) { setError('Indicador no encontrado'); return; }
        const indicatorObs = observations.filter(o => o.indicator_id === indicatorId);
        setData({ indicador: indicator, observaciones: indicatorObs, tiene_serie: indicatorObs.length > 0 });
      } catch (err) {
        console.error('Error:', err);
        setError('Error cargando el indicador');
      } finally {
        setLoading(false);
      }
    }
    if (indicatorId) loadData();
  }, [indicatorId]);

  const allEntities = Array.from(
    new Set(data?.observaciones.map(o => o.entidad || 'Nacional').filter(Boolean))
  ).sort((a, b) => { if (a === 'Nacional') return -1; if (b === 'Nacional') return 1; return a.localeCompare(b, 'es'); });

  const hasStateData = allEntities.length > 1;

  const entityObservations = data?.observaciones.filter(
    obs => (obs.entidad || 'Nacional') === selectedEntity
  ) || [];

  const chartData = entityObservations
    .filter(obs => obs.periodo.includes('-'))
    .map(obs => ({
      periodo: obs.periodo,
      valor: obs.valor,
      meta: obs.meta,
      avance: obs.avance_porcentual,
      diferencia: obs.valor && obs.meta ? obs.valor - obs.meta : 0
    })).sort((a, b) => a.periodo.localeCompare(b.periodo)) || [];

  const datosAnuales = entityObservations
    .filter(obs => !obs.periodo.includes('-'))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  const mesesConMeta = chartData.filter(d => d.meta && d.meta > 0);
  const mesesSinMeta = chartData.filter(d => !d.meta || d.meta === 0);

  const stats = {
    promedio: chartData.length > 0 ? chartData.reduce((sum, d) => sum + (d.valor || 0), 0) / chartData.filter(d => d.valor).length : 0,
    maximo: chartData.length > 0 ? Math.max(...chartData.filter(d => d.valor).map(d => d.valor!)) : 0,
    minimo: chartData.length > 0 ? Math.min(...chartData.filter(d => d.valor).map(d => d.valor!)) : 0,
    ultimoValor: chartData.length > 0 ? chartData[chartData.length - 1]?.valor : null,
    ultimaMeta: chartData.length > 0 ? chartData[chartData.length - 1]?.meta : null,
    cumplimiento: mesesConMeta.length > 0 ? mesesConMeta.filter(d => d.avance && d.avance >= 100).length / mesesConMeta.length * 100 : 0,
    avanceAnual: datosAnuales.length > 0 ? datosAnuales[0].avance_porcentual : null,
  };

  const cumplimientoData = [
    { name: 'Cumplidas', value: mesesConMeta.filter(d => d.avance && d.avance >= 100).length, color: COLORS.success },
    { name: 'En progreso', value: mesesConMeta.filter(d => d.avance && d.avance >= 80 && d.avance < 100).length, color: COLORS.warning },
    { name: 'Rezagadas', value: mesesConMeta.filter(d => d.avance != null && d.avance < 80).length, color: COLORS.danger },
    { name: 'Sin meta prog.', value: mesesSinMeta.filter(d => d.valor && d.valor > 0).length, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  const stateComparisonData = hasStateData
    ? allEntities.filter(e => e !== 'Nacional').map(entity => {
        const annual = data?.observaciones.find(o => (o.entidad || 'Nacional') === entity && !o.periodo.includes('-'));
        return { entidad: entity.length > 14 ? entity.slice(0, 12) + '…' : entity, entidadFull: entity, valor: annual?.valor ?? 0, meta: annual?.meta ?? 0, avance: annual?.avance_porcentual ?? 0, };
      }).filter(d => d.valor > 0 || d.meta > 0).sort((a, b) => b.avance - a.avance)
    : [];

  const downloadCSV = () => {
    if (!data) return;
    const { indicador } = data;
    const allObs = data.observaciones;
    let csv = '# INFORMACIÓN DEL INDICADOR\n';
    csv += `ID,${indicador.id}\nNombre,"${indicador.nombre}"\nPrograma,${indicador.programa}\nAño,${indicador.anios?.join(', ')}\nFuente,"${indicador.fuente}"\n`;
    csv += `Definición,"${indicador.definicion || 'N/A'}"\nMétodo de cálculo,"${indicador.metodo_calculo || 'N/A'}"\nUnidad de medida,${indicador.unidad_medida || 'N/A'}\nNivel,${indicador.nivel || 'N/A'}\n\n`;
    if (allObs.length > 0) {
      csv += '# SERIE DE DATOS\nPeriodo,Valor,Meta,Avance Porcentual,Entidad,Fuente\n';
      allObs.forEach(obs => { csv += `${obs.periodo},${obs.valor || ''},${obs.meta || ''},${obs.avance_porcentual || ''},${obs.entidad || ''},"${obs.fuente_detalle || ''}"\n`; });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `indicador_${indicatorId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gob-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Cargando indicador...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <div className="card p-12 text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Error'}</h2>
          <p className="text-gray-500 mb-6">No se pudo cargar el indicador solicitado.</p>
          <Link href="/indicadores" className="btn-primary">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  const { indicador, tiene_serie } = data;
  const observaciones = entityObservations;

  return (
    <div className="min-h-screen bg-mesh">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <Link href="/indicadores">Indicadores</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <span aria-current="page" className="truncate max-w-xs">{indicador.nombre.slice(0, 40)}...</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header del indicador */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card mb-6 bg-gradient-to-r from-gob-green-500 to-gob-green-600 text-white"
        >
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1.5 bg-white/20 rounded-full text-sm font-semibold">{indicador.programa}</span>
            {indicador.anios?.map(a => (
              <span key={a} className="px-3 py-1.5 bg-white/20 rounded-full text-sm">{a}</span>
            ))}
            {indicador.nivel && (
              <span className="px-3 py-1.5 bg-white/20 rounded-full text-sm">{indicador.nivel}</span>
            )}
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            {indicador.nombre}
          </h1>

          {indicador.definicion && !textoMalFormateado(indicador.definicion) && (
            <p className="text-white/90 text-lg leading-relaxed">{limpiarTexto(indicador.definicion, 250)}</p>
          )}
        </motion.div>

        {/* KPIs */}
        {tiene_serie && chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8"
          >
            {datosAnuales.length > 0 && datosAnuales[0].valor && (
              <div className="card p-4 text-center border-2 border-gob-green-200">
                <div className="text-2xl font-bold text-gob-green-700">{datosAnuales[0].valor.toLocaleString('es-MX', {maximumFractionDigits: 1})}</div>
                <div className="text-xs text-gob-green-600 font-medium mt-1">Total {datosAnuales[0].periodo}</div>
              </div>
            )}
            {datosAnuales.length > 0 && datosAnuales[0].meta && (
              <div className="card p-4 text-center border-2 border-gob-gold-200">
                <div className="text-2xl font-bold text-gob-gold-700">{datosAnuales[0].meta.toLocaleString('es-MX', {maximumFractionDigits: 1})}</div>
                <div className="text-xs text-gob-gold-600 font-medium mt-1">Meta anual</div>
              </div>
            )}
            <div className="card p-5 text-center">
              <div className="text-2xl font-extrabold text-blue-600">{stats.promedio.toLocaleString('es-MX', {maximumFractionDigits: 1})}</div>
              <div className="text-xs text-gray-500 mt-1">Promedio mensual</div>
            </div>
            <div className="card p-5 text-center">
              <div className="text-2xl font-extrabold text-emerald-600">{stats.maximo.toLocaleString('es-MX', {maximumFractionDigits: 1})}</div>
              <div className="text-xs text-gray-500 mt-1">Máximo mensual</div>
            </div>
            <div className="card p-5 text-center">
              <div className="text-2xl font-extrabold text-red-500">{stats.minimo.toLocaleString('es-MX', {maximumFractionDigits: 1})}</div>
              <div className="text-xs text-gray-500 mt-1">Mínimo mensual</div>
            </div>
            {datosAnuales.length > 0 && datosAnuales[0].avance_porcentual != null ? (
              <div className="card p-4 text-center border-2 border-blue-200">
                <div className={`text-2xl font-extrabold ${datosAnuales[0].avance_porcentual >= 100 ? 'text-emerald-600' : datosAnuales[0].avance_porcentual >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {datosAnuales[0].avance_porcentual.toFixed(1)}%
                </div>
                <div className="text-xs text-blue-600 font-medium mt-1">Avance anual</div>
              </div>
            ) : (
              <div className="card p-5 text-center">
                <div className={`text-2xl font-extrabold ${stats.cumplimiento >= 80 ? 'text-emerald-600' : stats.cumplimiento >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {stats.cumplimiento.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Meses cumplidos</div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ Entity Selector ═══ */}
        {hasStateData && (
          <div className="card p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gob-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gob-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <label htmlFor="entity-select" className="font-bold text-gray-800">Desglose por entidad</label>
              </div>
              <select
                id="entity-select"
                value={selectedEntity}
                onChange={e => setSelectedEntity(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gob-green-500/30 focus:border-gob-green-500 transition-all outline-none min-w-[220px]"
              >
                {allEntities.map(e => (
                  <option key={e} value={e}>{e === 'Nacional' ? 'Nacional (Todos los estados)' : e}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">{allEntities.length - 1} entidades disponibles</span>
            </div>
          </div>
        )}

        {/* ═══ Charts ═══ */}
        {tiene_serie && chartData.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 card p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Evolución temporal</h2>
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                  {(['line', 'bar', 'area'] as const).map(type => (
                    <button key={type} onClick={() => setChartType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${chartType === type ? 'bg-white text-gob-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {type === 'line' ? 'Línea' : type === 'bar' ? 'Barras' : 'Área'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="periodo" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => value?.toLocaleString('es-MX', {maximumFractionDigits: 2})} />
                      <Legend />
                      <ReferenceLine y={stats.promedio} stroke="#d1d5db" strokeDasharray="4 4" label={{ value: 'Prom.', fill: '#9ca3af', fontSize: 10 }} />
                      <Line type="monotone" dataKey="valor" stroke={COLORS.primary} strokeWidth={3} dot={{ fill: COLORS.primary, strokeWidth: 2, r: 5 }} name="Valor" />
                      <Line type="monotone" dataKey="meta" stroke={COLORS.gold} strokeWidth={2} strokeDasharray="5 5" dot={{ fill: COLORS.gold, strokeWidth: 2, r: 4 }} name="Meta" />
                    </ComposedChart>
                  ) : chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="periodo" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="valor" fill={COLORS.primary} name="Valor" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="meta" fill={COLORS.gold} name="Meta" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="periodo" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Area type="monotone" dataKey="valor" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.15} name="Valor" />
                      <Area type="monotone" dataKey="meta" stroke={COLORS.gold} fill={COLORS.gold} fillOpacity={0.1} name="Meta" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Estado de metas</h2>
              {cumplimientoData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cumplimientoData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {cumplimientoData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-gray-400">Sin datos de cumplimiento</div>
              )}
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {[
                  { label: 'Cumplidas', color: 'bg-emerald-500' },
                  { label: 'En progreso', color: 'bg-yellow-500' },
                  { label: 'Rezagadas', color: 'bg-red-500' },
                  ...(mesesSinMeta.some(d => d.valor && d.valor > 0) ? [{ label: 'Sin meta', color: 'bg-gray-400' }] : [])
                ].map(item => (
                  <span key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-10 mb-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-center md:text-left">
                <h3 className="font-bold text-gray-800 text-lg mb-2">Datos de avance no disponibles</h3>
                <p className="text-gray-500 mb-4">Este indicador aún no cuenta con registros de avance mensual o trimestral.</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• El indicador se mide de forma anual</li>
                  <li>• Los datos están en proceso de captura</li>
                  <li>• La información proviene de otra fuente oficial</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Avance % ══ */}
        {tiene_serie && chartData.some(d => d.avance) && (
          <div className="card p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Avance porcentual por periodo</h2>
              {mesesSinMeta.some(d => d.valor && d.valor > 0) && (
                <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">Meses sin meta en gris</span>
              )}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis domain={[0, 'auto']} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => value == null ? ['Sin meta', 'Avance'] : [`${value.toFixed(1)}%`, 'Avance']} />
                  <ReferenceLine y={100} stroke={COLORS.success} strokeWidth={2} label={{ value: '100%', fill: COLORS.success, fontSize: 11 }} />
                  <Bar dataKey="avance" name="Avance %" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avance == null ? '#d1d5db' : entry.avance >= 100 ? COLORS.success : entry.avance >= 80 ? COLORS.warning : COLORS.danger} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ═══ State comparison ═══ */}
        {hasStateData && stateComparisonData.length > 0 && (
          <div className="card p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gob-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gob-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Comparativo por entidad
              </h2>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setStateTab('ranking')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${stateTab === 'ranking' ? 'bg-white text-gob-green-600 shadow-sm' : 'text-gray-500'}`}>Ranking</button>
                <button onClick={() => setStateTab('comparison')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${stateTab === 'comparison' ? 'bg-white text-gob-green-600 shadow-sm' : 'text-gray-500'}`}>Valores</button>
              </div>
            </div>

            {stateTab === 'ranking' ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {stateComparisonData.map((d, idx) => (
                  <div key={d.entidadFull}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedEntity === d.entidadFull ? 'bg-gob-green-50 ring-2 ring-gob-green-200' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedEntity(d.entidadFull)}>
                    <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl text-xs font-bold ${idx < 3 ? 'bg-gob-green-500 text-white' : idx >= stateComparisonData.length - 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{idx + 1}</span>
                    <span className="w-36 text-sm font-medium truncate">{d.entidadFull}</span>
                    <span className="text-xs text-gray-400 min-w-[80px] text-right">{d.valor.toLocaleString('es-MX', {maximumFractionDigits: 0})}/{d.meta.toLocaleString('es-MX', {maximumFractionDigits: 0})}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${d.avance >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : d.avance >= 80 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                        style={{ width: `${Math.min(d.avance, 150) / 1.5}%` }} />
                    </div>
                    <span className={`text-sm font-bold min-w-[60px] text-right ${d.avance >= 100 ? 'text-emerald-600' : d.avance >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>{d.avance.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <label htmlFor="state-count" className="text-sm text-gray-400">Mostrar {Math.min(stateChartCount, stateComparisonData.length)} de {stateComparisonData.length}</label>
                  <input id="state-count" type="range" min={5} max={stateComparisonData.length} value={Math.min(stateChartCount, stateComparisonData.length)} onChange={e => setStateChartCount(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gob-green-500" />
                </div>
                <div style={{ height: Math.max(300, Math.min(stateChartCount, stateComparisonData.length) * 32 + 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stateComparisonData.slice(0, stateChartCount)} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis dataKey="entidad" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={95} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value?.toLocaleString('es-MX', { maximumFractionDigits: 2 }), name === 'valor' ? 'Alcanzado' : 'Meta']}
                        labelFormatter={(label) => stateComparisonData.find(d => d.entidad === label)?.entidadFull || label} />
                      <Legend />
                      <Bar dataKey="valor" fill={COLORS.primary} name="Alcanzado" radius={[0, 6, 6, 0]} />
                      <Bar dataKey="meta" fill={COLORS.gold} name="Meta" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ Ficha técnica + Tabla ═══ */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="card p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Ficha técnica
            </h2>
            <dl className="space-y-5">
              {indicador.nivel && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <dt className="text-sm font-medium text-blue-800 mb-1">¿Qué tipo de indicador es?</dt>
                  <dd className="text-blue-700 text-sm"><strong>{indicador.nivel}</strong>: {getNivelExplicacion(indicador.nivel)}</dd>
                </div>
              )}
              {indicador.definicion && !textoMalFormateado(indicador.definicion) && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">¿Qué mide este indicador?</dt>
                  <dd className="text-gray-800 bg-gray-50 p-4 rounded-xl text-sm leading-relaxed">{limpiarTexto(indicador.definicion, 400)}</dd>
                </div>
              )}
              {indicador.metodo_calculo && !textoMalFormateado(indicador.metodo_calculo) && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">¿Cómo se calcula?</dt>
                  <dd className="text-gray-800 bg-gray-50 p-4 rounded-xl text-sm font-mono leading-relaxed">{limpiarTexto(indicador.metodo_calculo, 400)}</dd>
                </div>
              )}
              {indicador.unidad_medida && !textoMalFormateado(indicador.unidad_medida) && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Unidad de medida</dt>
                    <dd className="font-semibold text-gray-900">{indicador.unidad_medida}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Última actualización</dt>
                  <dd className="font-semibold text-gray-900">{indicador.ultima_actualizacion}</dd>
                </div>
              </div>
              {indicador.notas && (
                <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl"><span className="font-medium">Nota:</span> {indicador.notas}</div>
              )}
            </dl>
          </div>

          {tiene_serie && observaciones.length > 0 && (
            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Datos de la serie</h2>
                <button onClick={downloadCSV} className="inline-flex items-center gap-2 text-sm font-semibold text-gob-green-600 hover:text-gob-green-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  CSV
                </button>
              </div>
              <div className="overflow-auto max-h-80 rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Periodo</th>
                      {hasStateData && <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Entidad</th>}
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Valor</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Meta</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Avance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {observaciones.sort((a, b) => b.periodo.localeCompare(a.periodo)).map((obs, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{obs.periodo}</td>
                        {hasStateData && <td className="py-3 px-4 text-gray-500 text-xs">{obs.entidad || 'Nacional'}</td>}
                        <td className="py-3 px-4 text-right font-medium">{obs.valor?.toLocaleString('es-MX', {maximumFractionDigits: 2}) || '-'}</td>
                        <td className="py-3 px-4 text-right text-gray-400">{obs.meta?.toLocaleString('es-MX', {maximumFractionDigits: 2}) || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          {obs.avance_porcentual != null ? (
                            <span className={`font-semibold ${obs.avance_porcentual >= 100 ? 'text-emerald-600' : obs.avance_porcentual >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {obs.avance_porcentual.toFixed(1)}%
                            </span>
                          ) : <span className="text-gray-300 text-xs">{obs.valor && (!obs.meta || obs.meta === 0) ? 'S/Meta' : '-'}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Trazabilidad ═══ */}
        <div className="card p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            Trazabilidad y fuente
          </h2>
          <div className="grid md:grid-cols-2 gap-4 bg-gray-50 rounded-xl p-6">
            <div>
              <span className="text-sm font-medium text-gray-500">Fuente del dato</span>
              <p className="text-gray-800 mt-1 font-medium">{indicador.fuente}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Identificador único</span>
              <code className="block mt-1 text-sm bg-gray-200 px-3 py-2 rounded-lg break-all font-mono">{indicador.id}</code>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={downloadCSV} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Descargar CSV
            </button>
            <Link href="/descargas" className="btn-outline">Ver descargas</Link>
            <Link href="/metodologia" className="btn-outline">Metodología</Link>
          </div>
        </div>

        <div className="mb-8">
          <Link href="/indicadores" className="inline-flex items-center gap-2 text-gob-green-600 font-semibold hover:gap-3 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Volver al catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
