import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { unidadResponsableSql } from '@/lib/unidades-responsables';

export const dynamic = 'force-dynamic';

const MESES_LABEL = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

type NumericRow = Record<string, number | string | null>;

function n(value: number | string | null | undefined): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function aggregateStatus(row: NumericRow): string {
  if (n(row.enviadas) > 0) return 'enviado';
  if (n(row.rechazadas) > 0) return 'rechazado';
  if (n(row.borradores) > 0) return 'borrador';
  if (n(row.aprobadas) > 0) return 'aprobado';
  return 'sin_captura';
}

export async function GET() {
  const db = getDb();
  const oficinaExpr = unidadResponsableSql('c.oficina');

  const corteRow = db.prepare(`
    SELECT MAX(mes) AS mes
    FROM capturas
    WHERE status='aprobado'
  `).get() as { mes: number | null } | undefined;
  const corteMes = corteRow?.mes ?? null;

  // Monthly aggregates: programado vs avance totals
  const porMes = db.prepare(`
    SELECT
      mes,
      COUNT(*) AS total_capturas,
      SUM(CASE WHEN status='aprobado'  THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN status='enviado'   THEN 1 ELSE 0 END) AS enviadas,
      SUM(CASE WHEN status='borrador'  THEN 1 ELSE 0 END) AS borradores,
      SUM(CASE WHEN status='rechazado' THEN 1 ELSE 0 END) AS rechazadas,
      SUM(CASE WHEN status='aprobado' AND programado IS NOT NULL THEN programado ELSE 0 END) AS prog_total,
      SUM(CASE WHEN status='aprobado' AND avance    IS NOT NULL THEN avance    ELSE 0 END) AS avan_total
    FROM capturas
    GROUP BY mes
    ORDER BY mes
  `).all() as NumericRow[];

  const porMesChart = MESES_LABEL.slice(1).map((label, i) => {
    const mes = i + 1;
    const row = porMes.find(r => r.mes === mes);
    const prog = n(row?.prog_total);
    const avan = n(row?.avan_total);
    return {
      mes,
      label,
      aprobadas: n(row?.aprobadas),
      enviadas: n(row?.enviadas),
      borradores: n(row?.borradores),
      rechazadas: n(row?.rechazadas),
      prog,
      avan,
      pct: prog > 0 ? Math.round((avan / prog) * 100) : null,
    };
  });

  // Per Unidad Responsable x month status matrix, aliases normalized.
  const matrizRaw = db.prepare(`
    SELECT
      ${oficinaExpr} AS oficina,
      c.mes,
      COUNT(*) AS total,
      SUM(CASE WHEN c.status='aprobado'  THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN c.status='enviado'   THEN 1 ELSE 0 END) AS enviadas,
      SUM(CASE WHEN c.status='borrador'  THEN 1 ELSE 0 END) AS borradores,
      SUM(CASE WHEN c.status='rechazado' THEN 1 ELSE 0 END) AS rechazadas,
      SUM(CASE WHEN c.status='aprobado' AND c.programado>0 THEN c.programado ELSE 0 END) AS prog_sum,
      SUM(CASE WHEN c.status='aprobado' AND c.programado>0 THEN c.avance ELSE 0 END) AS avan_sum
    FROM capturas c
    GROUP BY ${oficinaExpr}, c.mes
    ORDER BY oficina, c.mes
  `).all() as NumericRow[];

  const oficinasMap: Record<string, {
    oficina: string;
    meses: Record<number, { status: string; pct: number | null; avance: number | null; programado: number | null }>;
    total: number;
    aprobadas: number;
    enviadas: number;
    pct_overall: number | null;
  }> = {};

  for (const row of matrizRaw) {
    const ofc = String(row.oficina);
    if (!oficinasMap[ofc]) {
      oficinasMap[ofc] = { oficina: ofc, meses: {}, total: 0, aprobadas: 0, enviadas: 0, pct_overall: null };
    }
    const prog = n(row.prog_sum);
    const avan = n(row.avan_sum);
    oficinasMap[ofc].meses[n(row.mes)] = {
      status: aggregateStatus(row),
      pct: prog > 0 ? Math.round((avan / prog) * 100) : null,
      avance: avan || null,
      programado: prog || null,
    };
  }

  const countRaw = db.prepare(`
    SELECT
      ${oficinaExpr} AS oficina,
      COUNT(*) AS total,
      SUM(CASE WHEN c.status='aprobado'  THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN c.status='enviado'   THEN 1 ELSE 0 END) AS enviadas,
      SUM(CASE WHEN c.status='aprobado' AND c.programado>0 THEN c.avance ELSE 0 END) AS avan_sum,
      SUM(CASE WHEN c.status='aprobado' AND c.programado>0 THEN c.programado ELSE 0 END) AS prog_sum
    FROM capturas c
    GROUP BY ${oficinaExpr}
  `).all() as NumericRow[];

  for (const row of countRaw) {
    const ofc = String(row.oficina);
    if (oficinasMap[ofc]) {
      const prog = n(row.prog_sum);
      const avan = n(row.avan_sum);
      oficinasMap[ofc].total = n(row.total);
      oficinasMap[ofc].aprobadas = n(row.aprobadas);
      oficinasMap[ofc].enviadas = n(row.enviadas);
      oficinasMap[ofc].pct_overall = prog > 0 ? Math.round((avan / prog) * 100) : null;
    }
  }

  const matriz = Object.values(oficinasMap).sort((a, b) => a.oficina.localeCompare(b.oficina));

  // Per indicator compliance. Group by codigo+serie to avoid duplicates from office/name variants.
  const porIndicador = db.prepare(`
    SELECT
      i.codigo,
      MAX(i.nombre) AS nombre,
      i.serie,
      COUNT(c.id) AS capturas_total,
      SUM(CASE WHEN c.status='aprobado' THEN 1 ELSE 0 END) AS aprobadas,
      COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN ${oficinaExpr} END) AS oficinas,
      SUM(CASE WHEN c.status='aprobado' AND c.programado>0 THEN c.avance ELSE 0 END) AS avan_sum,
      SUM(CASE WHEN c.status='aprobado' AND c.programado>0 THEN c.programado ELSE 0 END) AS prog_sum
    FROM indicadores_2026 i
    LEFT JOIN capturas c ON c.indicador_id = i.id
    GROUP BY i.codigo, i.serie
    ORDER BY i.codigo
  `).all() as NumericRow[];

  const metasRows = db.prepare(`
    SELECT codigo, SUM(COALESCE(meta_anual, 0)) AS meta_sum
    FROM indicadores_2026
    GROUP BY codigo
  `).all() as NumericRow[];
  const metasByCode = new Map(metasRows.map(row => [String(row.codigo), n(row.meta_sum)]));

  const indicadores = porIndicador.map(r => {
    const prog = n(r.prog_sum);
    const avan = n(r.avan_sum);
    const meta = metasByCode.get(String(r.codigo)) ?? 0;
    return {
      codigo: r.codigo,
      nombre: r.nombre,
      serie: r.serie,
      capturas: n(r.capturas_total),
      aprobadas: n(r.aprobadas),
      oficinas: n(r.oficinas),
      pct: prog > 0 ? Math.round((avan / prog) * 100) : null,
      prog_pct: meta > 0 ? Math.round((prog / meta) * 100) : null,
      avan_pct: meta > 0 ? Math.round((avan / meta) * 100) : null,
    };
  });

  const totalRaw = db.prepare(`
    SELECT
      SUM(CASE WHEN status='aprobado'  THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN status='enviado'   THEN 1 ELSE 0 END) AS enviadas,
      SUM(CASE WHEN status='borrador'  THEN 1 ELSE 0 END) AS borradores,
      SUM(CASE WHEN status='rechazado' THEN 1 ELSE 0 END) AS rechazadas,
      COUNT(*) AS total
    FROM capturas
  `).get() as Record<string, number>;

  const pie = [
    { name: 'Aprobadas', value: totalRaw.aprobadas ?? 0, color: '#10B981' },
    { name: 'Enviadas',  value: totalRaw.enviadas  ?? 0, color: '#3B82F6' },
    { name: 'Borradores',value: totalRaw.borradores?? 0, color: '#F59E0B' },
    { name: 'Rechazadas',value: totalRaw.rechazadas?? 0, color: '#EF4444' },
  ].filter(d => d.value > 0);

  return NextResponse.json({ porMesChart, matriz, indicadores, pie, total: totalRaw.total ?? 0, corteMes });
}
