import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUnidadResponsableAliases } from '@/lib/unidades-responsables';

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  const oficina = req.headers.get('x-user-oficina') ?? '';

  const db = getDb();
  let rows;

  if (role === 'admin') {
    const filterOficina = req.nextUrl.searchParams.get('oficina');
    if (filterOficina) {
      const aliases = getUnidadResponsableAliases(filterOficina);
      rows = db.prepare(`SELECT * FROM indicadores_2026 WHERE oficina IN (${aliases.map(() => '?').join(',')}) ORDER BY codigo, oficina`).all(...aliases);
    } else {
      rows = db.prepare('SELECT * FROM indicadores_2026 ORDER BY codigo, oficina').all();
    }
  } else {
    rows = db.prepare('SELECT * FROM indicadores_2026 WHERE oficina = ? ORDER BY codigo').all(oficina);
  }

  return NextResponse.json(rows);
}
