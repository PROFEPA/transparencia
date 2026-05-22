import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

const OBS_PATH = path.join(process.cwd(), 'public', 'data', 'observations.json');
const IND_PATH = path.join(process.cwd(), 'public', 'data', 'indicators_2026.json');

const MES_STR: Record<number, string> = {
  1:'01',2:'02',3:'03',4:'04',5:'05',6:'06',
  7:'07',8:'08',9:'09',10:'10',11:'11',12:'12',
};

function slugify(str: string): string {
  return str.toLowerCase()
    .normalize('NFD').replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-');
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const body = await req.json() as { meses?: number[]; descripcion?: string };
  const meses: number[] = body.meses ?? [1,2,3,4,5,6,7,8,9,10,11,12];

  const db = getDb();

  const placeholders = meses.map(() => '?').join(',');
  const capturas = db.prepare(`
    SELECT c.*, i.codigo, i.nombre, i.serie
    FROM capturas c
    JOIN indicadores_2026 i ON c.indicador_id = i.id
    WHERE c.status = 'aprobado' AND c.mes IN (${placeholders})
  `).all(...meses) as Array<Record<string, unknown>>;

  if (capturas.length === 0) {
    return NextResponse.json({ error: 'No hay capturas aprobadas para los meses seleccionados' }, { status: 400 });
  }

  // Build new observations
  const newObs = capturas.map(c => ({
    indicator_id: `${slugify(c.nombre as string)}-poa2026`,
    periodo: `2026-${MES_STR[c.mes as number]}`,
    valor: c.avance ?? null,
    meta: c.programado ?? null,
    avance_porcentual: (c.programado && (c.programado as number) > 0)
      ? Math.round(((c.avance as number ?? 0) / (c.programado as number)) * 10000) / 100
      : null,
    entidad: c.oficina,
    categoria: c.serie ?? null,
    fuente_detalle: 'POA_2026 - Captura interna',
  }));

  // Load existing observations and remove old POA 2026 internal ones for same periods
  let existing: Record<string, unknown>[] = [];
  if (fs.existsSync(OBS_PATH)) {
    existing = JSON.parse(fs.readFileSync(OBS_PATH, 'utf8'));
  }

  const periodosNuevos = new Set(newObs.map(o => `${o.indicator_id}|${o.periodo}|${o.entidad}`));
  const filtered = existing.filter(o => {
    const key = `${o.indicator_id}|${o.periodo}|${o.entidad}`;
    return !periodosNuevos.has(key);
  });

  const merged = [...filtered, ...newObs];

  // Write to public/data/ — works on the local server; on Vercel the filesystem is
  // read-only so we skip the write and continue (the DB publication is still recorded).
  let filesWritten = false;
  try {
    fs.writeFileSync(OBS_PATH, JSON.stringify(merged, null, 2));

    const seenIds: Record<string, boolean> = {};
    const uniqueIndicatorIds = newObs.map(o => o.indicator_id).filter(id => {
      if (seenIds[id]) return false;
      seenIds[id] = true;
      return true;
    });
    let indicators2026: Record<string, unknown>[] = [];
    if (fs.existsSync(IND_PATH)) {
      indicators2026 = JSON.parse(fs.readFileSync(IND_PATH, 'utf8'));
    }
    const existingIds = new Set(indicators2026.map((i: Record<string, unknown>) => i.id));
    for (const indId of uniqueIndicatorIds) {
      if (!existingIds.has(indId)) {
        const sample = newObs.find(o => o.indicator_id === indId)!;
        const captura = capturas.find(c => `${slugify(c.nombre as string)}-poa2026` === indId)!;
        indicators2026.push({
          id: indId,
          nombre: captura.nombre,
          programa: 'POA2026',
          fuente: 'POA_2026 - Captura interna',
          anios: [2026],
          unidad_medida: 'Número',
          notas: `Serie: ${sample.categoria}`,
          ultima_actualizacion: new Date().toISOString().split('T')[0],
        });
      }
    }
    fs.writeFileSync(IND_PATH, JSON.stringify(indicators2026, null, 2));
    filesWritten = true;
  } catch {
    // Read-only filesystem (Vercel) — publication is recorded in DB but static files
    // are not updated. Run locally or redeploy to apply JSON changes.
    console.warn('[publicar] Filesystem write skipped (read-only env)');
  }

  // Register publication
  db.prepare(`
    INSERT INTO publicaciones(anio, meses_incluidos, publicado_por, capturas_count, descripcion)
    VALUES(?,?,?,?,?)
  `).run(2026, meses.join(','), userId, capturas.length, body.descripcion ?? null);

  return NextResponse.json({
    ok: true,
    capturas_publicadas: capturas.length,
    meses,
    observaciones_totales: merged.length,
    files_updated: filesWritten,
  });
}
