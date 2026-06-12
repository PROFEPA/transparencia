import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUnidadResponsableAliases, normalizeUnidadResponsable } from '@/lib/unidades-responsables';

const MESES_LABEL: Record<number, string> = {
  1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',
  7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre',
};
const MES_KEY: Record<number, string> = {
  1:'prog_ene',2:'prog_feb',3:'prog_mzo',4:'prog_abr',5:'prog_may',6:'prog_jun',
  7:'prog_jul',8:'prog_ago',9:'prog_sep',10:'prog_oct',11:'prog_nov',12:'prog_dic',
};

type DataRow = Record<string, number | string | null>;

function n(value: number | string | null | undefined): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function statusForGroup(rows: DataRow[]): string {
  if (rows.some(c => c.status === 'enviado')) return 'enviado';
  if (rows.some(c => c.status === 'rechazado')) return 'rechazado';
  if (rows.some(c => c.status === 'borrador')) return 'borrador';
  if (rows.some(c => c.status === 'aprobado')) return 'aprobado';
  return 'sin_captura';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ oficina: string }> }) {
  const { oficina } = await params;
  const decodedOficina = decodeURIComponent(oficina);
  const displayOficina = normalizeUnidadResponsable(decodedOficina);
  const aliases = getUnidadResponsableAliases(decodedOficina);
  const placeholders = aliases.map(() => '?').join(',');
  const db = getDb();

  const indicadoresRaw = db.prepare(`
    SELECT * FROM indicadores_2026 WHERE oficina IN (${placeholders}) ORDER BY codigo, oficina
  `).all(...aliases) as DataRow[];

  if (indicadoresRaw.length === 0) {
    return NextResponse.json({ error: 'Unidad responsable no encontrada' }, { status: 404 });
  }

  const indicadoresMap = new Map<string, DataRow>();
  for (const ind of indicadoresRaw) {
    const codigo = String(ind.codigo);
    const existing = indicadoresMap.get(codigo);
    if (!existing) {
      indicadoresMap.set(codigo, { ...ind });
      continue;
    }
    existing.meta_anual = n(existing.meta_anual) + n(ind.meta_anual);
    for (let mes = 1; mes <= 12; mes++) {
      const key = MES_KEY[mes];
      const a = existing[key];
      const b = ind[key];
      existing[key] = a == null && b == null ? null : n(a) + n(b);
    }
  }
  const indicadores = [...indicadoresMap.values()].sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));

  const capturas = db.prepare(`
    SELECT c.*, i.codigo, i.nombre, i.serie
    FROM capturas c
    JOIN indicadores_2026 i ON c.indicador_id = i.id
    WHERE c.oficina IN (${placeholders})
    ORDER BY c.mes, i.codigo, c.oficina
  `).all(...aliases) as DataRow[];

  const matrix: Record<string, Record<number, {
    id: number; status: string; avance: number | null; programado: number | null; pct: number | null; notas: string | null;
  }>> = {};

  for (const ind of indicadores) {
    const codigo = String(ind.codigo);
    matrix[codigo] = {};
    for (let mes = 1; mes <= 12; mes++) {
      const prog = ind[MES_KEY[mes]] as number | null;
      matrix[codigo][mes] = {
        id: 0, status: 'sin_captura', avance: null,
        programado: prog, pct: null, notas: null,
      };
    }
  }

  const groupedCapturas = new Map<string, DataRow[]>();
  for (const c of capturas) {
    const key = `${String(c.codigo)}:${n(c.mes)}`;
    groupedCapturas.set(key, [...(groupedCapturas.get(key) ?? []), c]);
  }

  for (const rows of groupedCapturas.values()) {
    const first = rows[0];
    const codigo = String(first.codigo);
    const mes = n(first.mes);
    const prog = rows.reduce((s, c) => s + n(c.programado), 0);
    const avan = rows.reduce((s, c) => s + n(c.avance), 0);
    if (matrix[codigo]) {
      matrix[codigo][mes] = {
        id: n(first.id),
        status: statusForGroup(rows),
        avance: avan || null,
        programado: prog || null,
        pct: prog > 0 ? Math.round((avan / prog) * 100) : null,
        notas: rows.map(c => c.notas).filter(Boolean).join(' | ') || null,
      };
    }
  }

  const chartMeses = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const mesCaptures = capturas.filter(c => c.mes === mes && c.status === 'aprobado');
    const prog = mesCaptures.reduce((s, c) => s + n(c.programado), 0);
    const avan = mesCaptures.reduce((s, c) => s + n(c.avance), 0);
    return {
      mes,
      label: MESES_LABEL[mes].slice(0, 3),
      prog,
      avan,
      pct: prog > 0 ? Math.round((avan / prog) * 100) : null,
      capturas: mesCaptures.length,
    };
  });

  const aprobadas = capturas.filter(c => c.status === 'aprobado').length;
  const enviadas = capturas.filter(c => c.status === 'enviado').length;
  const borradores = capturas.filter(c => c.status === 'borrador').length;
  const rechazadas = capturas.filter(c => c.status === 'rechazado').length;

  const approved = capturas.filter(c => c.status === 'aprobado');
  const progSum = approved.reduce((s, c) => s + n(c.programado), 0);
  const avanSum = approved.reduce((s, c) => s + n(c.avance), 0);

  const lastActivity = capturas
    .map(c => c.updated_at as string)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  return NextResponse.json({
    oficina: displayOficina,
    aliases,
    indicadores: indicadores.map(i => ({ id: i.id, codigo: i.codigo, nombre: i.nombre, serie: i.serie, meta_anual: i.meta_anual })),
    matrix,
    chartMeses,
    stats: {
      total_indicadores: indicadores.length,
      total_capturas: capturas.length,
      aprobadas, enviadas, borradores, rechazadas,
      prog_sum: progSum,
      avan_sum: avanSum,
      pct_overall: progSum > 0 ? Math.round((avanSum / progSum) * 100) : null,
      last_activity: lastActivity,
    },
  });
}
