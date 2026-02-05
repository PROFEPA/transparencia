'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Indicator, Observation } from '@/types';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine
} from 'recharts';

// Colores institucionales
const COLORS = {
  primary: '#235B4E',
  secondary: '#691C32',
  gold: '#BC955C',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: '#6B7280'
};

interface IndicatorDetail {
  indicador: Indicator;
  observaciones: Observation[];
  tiene_serie: boolean;
}

// Helper para obtener explicación del nivel
function getNivelExplicacion(nivel: string | undefined): string {
  switch (nivel) {
    case 'Fin': return 'Este es un objetivo estratégico que contribuye al bienestar de la población.';
    case 'Propósito': return 'Muestra el resultado que se espera lograr con las acciones de PROFEPA.';
    case 'Componente': return 'Representa los productos o servicios que genera la institución.';
    case 'Actividad': return 'Mide las acciones específicas que realiza la institución.';
    default: return '';
  }
}

// Helper para limpiar texto muy largo o mal formateado
function limpiarTexto(texto: string | null | undefined, maxLength: number = 500): string {
  if (!texto) return '';
  // Si el texto contiene demasiadas repeticiones o es muy largo, truncarlo
  if (texto.length > maxLength) {
    // Buscar un punto para cortar de forma natural
    const puntoIndex = texto.substring(0, maxLength).lastIndexOf('.');
    if (puntoIndex > maxLength * 0.5) {
      return texto.substring(0, puntoIndex + 1);
    }
    return texto.substring(0, maxLength) + '...';
  }
  return texto;
}

// Helper para detectar si el texto parece estar mal formateado
function textoMalFormateado(texto: string | null | undefined): boolean {
  if (!texto) return false;
  // Si es muy largo o contiene patrones repetidos
  if (texto.length > 800) return true;
  // Si contiene "Método de Cálculo:" varias veces, está mal parseado
  if ((texto.match(/Método de Cálculo/gi) || []).length > 1) return true;
  return false;
}

export default function IndicadorDetailPage() {
  const params = useParams();
  const indicatorId = params.id as string;
  
  const [data, setData] = useState<IndicatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');

  useEffect(() => {
    async function loadData() {
      try {
        const [indRes, obsRes] = await Promise.all([
          fetch('/data/indicators.json'),
          fetch('/data/observations.json')
        ]);

        if (!indRes.ok || !obsRes.ok) {
          throw new Error('Error cargando datos');
        }

        const indicators: Indicator[] = await indRes.json();
        const observations: Observation[] = await obsRes.json();

        const indicator = indicators.find(i => i.id === indicatorId);
        
        if (!indicator) {
          setError('Indicador no encontrado');
          return;
        }

        const indicatorObs = observations.filter(o => o.indicator_id === indicatorId);

        setData({
          indicador: indicator,
          observaciones: indicatorObs,
          tiene_serie: indicatorObs.length > 0
        });

      } catch (err) {
        console.error('Error:', err);
        setError('Error cargando el indicador');
      } finally {
        setLoading(false);
      }
    }

    if (indicatorId) {
      loadData();
    }
  }, [indicatorId]);

  // Preparar datos para gráficas - EXCLUIR periodos anuales (solo YYYY) para no distorsionar escala
  const chartData = data?.observaciones
    .filter(obs => obs.periodo.includes('-')) // Solo periodos mensuales (YYYY-MM)
    .map(obs => ({
      periodo: obs.periodo,
      valor: obs.valor,
      meta: obs.meta,
      avance: obs.avance_porcentual,
      diferencia: obs.valor && obs.meta ? obs.valor - obs.meta : 0
    })).sort((a, b) => a.periodo.localeCompare(b.periodo)) || [];

  // Datos anuales acumulados (para mostrar resumen)
  const datosAnuales = data?.observaciones
    .filter(obs => !obs.periodo.includes('-')) // Solo periodos anuales (YYYY)
    .sort((a, b) => a.periodo.localeCompare(b.periodo)) || [];

  // Calcular estadísticas
  const stats = {
    promedio: chartData.length > 0 
      ? chartData.reduce((sum, d) => sum + (d.valor || 0), 0) / chartData.filter(d => d.valor).length 
      : 0,
    maximo: chartData.length > 0 
      ? Math.max(...chartData.filter(d => d.valor).map(d => d.valor!)) 
      : 0,
    minimo: chartData.length > 0 
      ? Math.min(...chartData.filter(d => d.valor).map(d => d.valor!)) 
      : 0,
    ultimoValor: chartData.length > 0 ? chartData[chartData.length - 1]?.valor : null,
    ultimaMeta: chartData.length > 0 ? chartData[chartData.length - 1]?.meta : null,
    cumplimiento: chartData.length > 0 
      ? chartData.filter(d => d.avance && d.avance >= 100).length / chartData.length * 100 
      : 0
  };

  // Datos para gráfica de cumplimiento (pie chart)
  const cumplimientoData = [
    { name: 'Cumplidas', value: chartData.filter(d => d.avance && d.avance >= 100).length, color: COLORS.success },
    { name: 'En progreso', value: chartData.filter(d => d.avance && d.avance >= 80 && d.avance < 100).length, color: COLORS.warning },
    { name: 'Rezagadas', value: chartData.filter(d => d.avance && d.avance < 80).length, color: COLORS.danger }
  ].filter(d => d.value > 0);

  const downloadCSV = () => {
    if (!data) return;
    
    const { indicador, observaciones } = data;
    
    let csv = '# INFORMACIÓN DEL INDICADOR\n';
    csv += `ID,${indicador.id}\n`;
    csv += `Nombre,"${indicador.nombre}"\n`;
    csv += `Programa,${indicador.programa}\n`;
    csv += `Año,${indicador.anio}\n`;
    csv += `Fuente,"${indicador.fuente}"\n`;
    csv += `Definición,"${indicador.definicion || 'N/A'}"\n`;
    csv += `Método de cálculo,"${indicador.metodo_calculo || 'N/A'}"\n`;
    csv += `Unidad de medida,${indicador.unidad_medida || 'N/A'}\n`;
    csv += `Nivel,${indicador.nivel || 'N/A'}\n\n`;
    
    if (observaciones.length > 0) {
      csv += '# SERIE DE DATOS\n';
      csv += 'Periodo,Valor,Meta,Avance Porcentual,Entidad,Fuente\n';
      observaciones.forEach(obs => {
        csv += `${obs.periodo},${obs.valor || ''},${obs.meta || ''},${obs.avance_porcentual || ''},${obs.entidad || ''},"${obs.fuente_detalle || ''}"\n`;
      });
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `indicador_${indicatorId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gob-green-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando indicador...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <svg className="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Error'}</h2>
          <p className="text-gray-600 mb-4">No se pudo cargar el indicador solicitado.</p>
          <Link href="/indicadores" className="btn-primary">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const { indicador, observaciones, tiene_serie } = data;

  return (
    <div className="animate-fade-in">
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header del indicador */}
        <div className="card mb-6 bg-gradient-to-r from-gob-green-500 to-gob-green-600 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">{indicador.programa}</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{indicador.anio}</span>
            {indicador.nivel && (
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{indicador.nivel}</span>
            )}
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            {indicador.nombre}
          </h1>
          
          {indicador.definicion && (
            <p className="text-white/90 text-lg">{indicador.definicion}</p>
          )}
        </div>

        {/* KPIs rápidos */}
        {tiene_serie && chartData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {/* Mostrar total anual si existe */}
            {datosAnuales.length > 0 && datosAnuales[0].valor && (
              <div className="card text-center p-4 bg-gob-green-50 border-2 border-gob-green-200">
                <div className="text-2xl font-bold text-gob-green-700">
                  {datosAnuales[0].valor.toLocaleString('es-MX', {maximumFractionDigits: 1})}
                </div>
                <div className="text-xs text-gob-green-600 font-medium">Total {datosAnuales[0].periodo}</div>
              </div>
            )}
            {datosAnuales.length > 0 && datosAnuales[0].meta && (
              <div className="card text-center p-4 bg-gob-gold-50 border-2 border-gob-gold-200">
                <div className="text-2xl font-bold text-gob-gold-700">
                  {datosAnuales[0].meta.toLocaleString('es-MX', {maximumFractionDigits: 1})}
                </div>
                <div className="text-xs text-gob-gold-600 font-medium">Meta anual</div>
              </div>
            )}
            <div className="card text-center p-4">
              <div className="text-2xl font-bold text-blue-600">
                {stats.promedio.toLocaleString('es-MX', {maximumFractionDigits: 1})}
              </div>
              <div className="text-xs text-gray-500">Promedio mensual</div>
            </div>
            <div className="card text-center p-4">
              <div className="text-2xl font-bold text-green-600">
                {stats.maximo.toLocaleString('es-MX', {maximumFractionDigits: 1})}
              </div>
              <div className="text-xs text-gray-500">Máximo mensual</div>
            </div>
            <div className="card text-center p-4">
              <div className="text-2xl font-bold text-red-600">
                {stats.minimo.toLocaleString('es-MX', {maximumFractionDigits: 1})}
              </div>
              <div className="text-xs text-gray-500">Mínimo mensual</div>
            </div>
            <div className="card text-center p-4">
              <div className={`text-2xl font-bold ${stats.cumplimiento >= 80 ? 'text-green-600' : stats.cumplimiento >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {stats.cumplimiento.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Meses cumplidos</div>
            </div>
          </div>
        )}

        {/* Gráficas principales */}
        {tiene_serie && chartData.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Gráfica principal - 2 columnas */}
            <div className="lg:col-span-2 card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Evolución temporal</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartType('line')}
                    className={`px-3 py-1 rounded text-sm ${chartType === 'line' ? 'bg-gob-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Línea
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-3 py-1 rounded text-sm ${chartType === 'bar' ? 'bg-gob-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Barras
                  </button>
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-3 py-1 rounded text-sm ${chartType === 'area' ? 'bg-gob-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Área
                  </button>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="periodo" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: number) => value?.toLocaleString('es-MX', {maximumFractionDigits: 2})}
                      />
                      <Legend />
                      <ReferenceLine y={stats.promedio} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Promedio', fill: '#94a3b8', fontSize: 10 }} />
                      <Line type="monotone" dataKey="valor" stroke={COLORS.primary} strokeWidth={3} dot={{ fill: COLORS.primary, strokeWidth: 2, r: 5 }} name="Valor" />
                      <Line type="monotone" dataKey="meta" stroke={COLORS.gold} strokeWidth={2} strokeDasharray="5 5" dot={{ fill: COLORS.gold, strokeWidth: 2, r: 4 }} name="Meta" />
                    </ComposedChart>
                  ) : chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="periodo" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="valor" fill={COLORS.primary} name="Valor" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="meta" fill={COLORS.gold} name="Meta" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="periodo" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="valor" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} name="Valor" />
                      <Area type="monotone" dataKey="meta" stroke={COLORS.gold} fill={COLORS.gold} fillOpacity={0.2} name="Meta" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica de cumplimiento - Pie */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Estado de metas</h2>
              {cumplimientoData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cumplimientoData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {cumplimientoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  Sin datos de cumplimiento
                </div>
              )}
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span> Cumplidas
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span> En progreso
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span> Rezagadas
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="card mb-6 p-8 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-center md:text-left">
                <h3 className="font-bold text-gray-800 text-lg mb-2">Datos de avance no disponibles</h3>
                <p className="text-gray-600 mb-3">
                  Este indicador aún no cuenta con registros de avance mensual o trimestral en nuestro sistema. 
                  Esto puede deberse a que:
                </p>
                <ul className="text-sm text-gray-500 space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    El indicador se mide de forma anual
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    Los datos están en proceso de captura
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    La información proviene de otra fuente oficial
                  </li>
                </ul>
                <p className="text-sm text-gob-green-600">
                  Consulta la fuente original indicada abajo para información completa.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gráfica de avance porcentual */}
        {tiene_serie && chartData.some(d => d.avance) && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Avance porcentual por periodo</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="periodo" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis domain={[0, 'auto']} tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value?.toFixed(1)}%`, 'Avance']}
                  />
                  <ReferenceLine y={100} stroke="#10B981" strokeWidth={2} label={{ value: '100% Meta', fill: '#10B981', fontSize: 11 }} />
                  <Bar 
                    dataKey="avance" 
                    name="Avance %"
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.avance && entry.avance >= 100 ? COLORS.success : entry.avance && entry.avance >= 80 ? COLORS.warning : COLORS.danger} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Información del indicador */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gob-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Información del indicador
            </h2>
            <dl className="space-y-4">
              {/* Explicación del nivel para ciudadanos */}
              {indicador.nivel && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r">
                  <dt className="text-sm font-medium text-blue-800">¿Qué tipo de indicador es?</dt>
                  <dd className="mt-1 text-blue-700 text-sm">
                    <strong>{indicador.nivel}</strong>: {getNivelExplicacion(indicador.nivel)}
                  </dd>
                </div>
              )}
              
              {/* Definición - solo si existe y está bien formateada */}
              {indicador.definicion && !textoMalFormateado(indicador.definicion) ? (
                <div>
                  <dt className="text-sm font-medium text-gray-500">¿Qué mide este indicador?</dt>
                  <dd className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg text-sm">
                    {limpiarTexto(indicador.definicion, 400)}
                  </dd>
                </div>
              ) : !indicador.definicion && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r">
                  <dt className="text-sm font-medium text-amber-800">Información pendiente</dt>
                  <dd className="mt-1 text-amber-700 text-sm">
                    La definición detallada de este indicador se encuentra en proceso de integración. 
                    Consulta la fuente original para más detalles.
                  </dd>
                </div>
              )}
              
              {/* Método de cálculo - solo si existe y está bien formateado */}
              {indicador.metodo_calculo && !textoMalFormateado(indicador.metodo_calculo) ? (
                <div>
                  <dt className="text-sm font-medium text-gray-500">¿Cómo se calcula?</dt>
                  <dd className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg text-sm font-mono">
                    {limpiarTexto(indicador.metodo_calculo, 400)}
                  </dd>
                </div>
              ) : null}
              
              {indicador.unidad_medida && !textoMalFormateado(indicador.unidad_medida) && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gob-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-gob-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Unidad de medida</dt>
                    <dd className="text-gray-900 font-medium">{indicador.unidad_medida}</dd>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Última actualización</dt>
                  <dd className="text-gray-900">{indicador.ultima_actualizacion}</dd>
                </div>
              </div>
              
              {indicador.notas && (
                <div className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded">
                  <span className="font-medium">Nota:</span> {indicador.notas}
                </div>
              )}
            </dl>
          </div>

          {/* Tabla de datos compacta */}
          {tiene_serie && observaciones.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Datos de la serie</h2>
                <button onClick={downloadCSV} className="btn-secondary text-sm py-1 px-3">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  CSV
                </button>
              </div>
              <div className="overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Periodo</th>
                      <th className="text-right py-2 px-3 font-medium">Valor</th>
                      <th className="text-right py-2 px-3 font-medium">Meta</th>
                      <th className="text-right py-2 px-3 font-medium">Avance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {observaciones.sort((a, b) => b.periodo.localeCompare(a.periodo)).map((obs, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{obs.periodo}</td>
                        <td className="py-2 px-3 text-right">{obs.valor?.toLocaleString('es-MX', {maximumFractionDigits: 2}) || '-'}</td>
                        <td className="py-2 px-3 text-right text-gray-500">{obs.meta?.toLocaleString('es-MX', {maximumFractionDigits: 2}) || '-'}</td>
                        <td className="py-2 px-3 text-right">
                          {obs.avance_porcentual ? (
                            <span className={`font-medium ${obs.avance_porcentual >= 100 ? 'text-green-600' : obs.avance_porcentual >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {obs.avance_porcentual.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Trazabilidad */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gob-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Trazabilidad y fuente
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Fuente del dato</span>
              <p className="text-gray-700 mt-1">{indicador.fuente}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Identificador único</span>
              <code className="block mt-1 text-sm bg-gray-200 px-2 py-1 rounded break-all">{indicador.id}</code>
            </div>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={downloadCSV} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar CSV
            </button>
            <Link href="/descargas" className="btn-outline">Ver todas las descargas</Link>
            <Link href="/metodologia" className="btn-outline">Metodología</Link>
          </div>
        </div>

        {/* Navegación */}
        <div className="mt-8">
          <Link href="/indicadores" className="inline-flex items-center text-gob-green-600 hover:underline">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
