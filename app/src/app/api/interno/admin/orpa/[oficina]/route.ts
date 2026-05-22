import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const MESES_LABEL: Record<number, string> = {
  1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',
  7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre',
};
const MES_KEY: Record<number, string> = {
  1:'prog_ene',2:'prog_feb',3:'prog_mzo',4:'prog_abr',5:'prog_may',6:'prog_jun',
  7:'prog_jul',8:'prog_ago',9:'prog_sep',10:'prog_oct',11:'prog_nov',12:'prog_dic',
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ oficina: string }> }) {
  const { oficina } = await params;
  const decodedOficina = decodeURIComponent(oficina);
  const db = getDb();

  // Indicadores for this oficina
  const indicadores = db.prepare(`
    SELECT * FROM indicadores_2026 WHERE oficina = ? ORDER BY codigo
  `).all(decodedOficina) as Record<string, unknown>[];

  if (indicadores.length === 0) {
    return NextResponse.json({ error: 'Oficina no encontrada' }, { status: 404 });
  }

  // Capturas for this oficina
  const capturas = db.prepare(`
    SELECT c.*, i.codigo, i.nombre, i.serie
    FROM capturas c
    JOIN indicadores_2026 i ON c.indicador_id = i.id
    WHERE c.oficina = ?
    ORDER BY c.mes, i.codigo
  `).all(decodedOficina) as Record<string, unknown>[];

  // Build matrix: indicador → mes → captura
  const matrix: Record<string, Record<number, {
    id: number; status: string; avance: number | null; programado: number | null; pct: number | null; notas: string | null;
  }>> = {};

  for (const ind of indicadores) {
    matrix[ind.codigo as string] = {};
    for (let mes = 1; mes <= 12; mes++) {
      const prog = ind[MES_KEY[mes]] as number | null;
      matrix[ind.codigo as string][mes] = {
        id: 0, status: 'sin_captura', avance: null,
        programado: prog, pct: null, notas: null,
      };
    }
  }

  for (const c of capturas) {
    const codigo = c.codigo as string;
    const mes = c.mes as number;
    const prog = c.programado as number | null;
    const avan = c.avance as number | null;
    if (matrix[codigo]) {
      matrix[codigo][mes] = {
        id: c.id as number,
        status: c.status as string,
        avance: avan,
        programado: prog,
        pct: (prog && prog > 0 && avan !== null) ? Math.round((avan / prog) * 100) : null,
        notas: c.notas as string | null,
      };
    }
  }

  // Chart data: monthly prog vs avan (approved only)
  const chartMeses = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const mesCaptures = capturas.filter(c => c.mes === mes && c.status === 'aprobado');
    const prog = mesCaptures.reduce((s, c) => s + ((c.programado as number) ?? 0), 0);
    const avan = mesCaptures.reduce((s, c) => s + ((c.avance as number) ?? 0), 0);
    return {
      mes,
      label: MESES_LABEL[mes].slice(0, 3),
      prog,
      avan,
      pct: prog > 0 ? Math.round((avan / prog) * 100) : null,
      capturas: mesCaptures.length,
    };
  });

  // Summary stats
  const aprobadas = capturas.filter(c => c.status === 'aprobado').length;
  const enviadas = capturas.filter(c => c.status === 'enviado').length;
  const borradores = capturas.filter(c => c.status === 'borrador').length;
  const rechazadas = capturas.filter(c => c.status === 'rechazado').length;

  const progSum = capturas
    .filter(c => c.status === 'aprobado')
    .reduce((s, c) => s + ((c.programado as number) ?? 0), 0);
  const avanSum = capturas
    .filter(c => c.status === 'aprobado')
    .reduce((s, c) => s + ((c.avance as number) ?? 0), 0);

  const lastActivity = capturas
    .map(c => c.updated_at as string)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  return NextResponse.json({
    oficina: decodedOficina,
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
