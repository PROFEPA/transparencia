import { NextRequest, NextResponse } from 'next/server';
import { getDb, MES_KEY } from '@/lib/db';
import type { Indicador2026 } from '@/lib/db';

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  const oficina = req.headers.get('x-user-oficina') ?? '';
  const { searchParams } = req.nextUrl;

  const db = getDb();
  let sql = `
    SELECT c.*, i.codigo, i.nombre, i.serie
    FROM capturas c
    JOIN indicadores_2026 i ON c.indicador_id = i.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (role !== 'admin') {
    sql += ' AND c.oficina = ?';
    params.push(oficina);
  } else if (searchParams.get('oficina')) {
    sql += ' AND c.oficina = ?';
    params.push(searchParams.get('oficina')!);
  }

  if (searchParams.get('mes')) {
    sql += ' AND c.mes = ?';
    params.push(Number(searchParams.get('mes')));
  }
  if (searchParams.get('status')) {
    sql += ' AND c.status = ?';
    params.push(searchParams.get('status')!);
  }
  if (searchParams.get('anio')) {
    sql += ' AND c.anio = ?';
    params.push(Number(searchParams.get('anio')));
  }

  sql += ' ORDER BY c.mes, i.codigo, c.oficina';
  return NextResponse.json(db.prepare(sql).all(...params));
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  const userOficina = req.headers.get('x-user-oficina') ?? '';

  const body = await req.json();
  const { indicador_id, mes, avance, notas } = body;

  if (!indicador_id || !mes) {
    return NextResponse.json({ error: 'indicador_id y mes son requeridos' }, { status: 400 });
  }

  const oficina = role === 'admin' ? (body.oficina ?? userOficina) : userOficina;

  const db = getDb();
  const ind = db.prepare('SELECT * FROM indicadores_2026 WHERE id = ? AND oficina = ?').get(indicador_id, oficina) as Indicador2026 | undefined;
  if (!ind) {
    return NextResponse.json({ error: 'Indicador no encontrado' }, { status: 404 });
  }

  const progKey = MES_KEY[Number(mes)] as keyof Indicador2026;
  const programado = ind[progKey] as number | null ?? null;

  const existing = db.prepare('SELECT id FROM capturas WHERE indicador_id=? AND oficina=? AND anio=? AND mes=?')
    .get(indicador_id, oficina, 2026, mes) as { id: number } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE capturas SET avance=?, notas=?, updated_at=CURRENT_TIMESTAMP, created_by=COALESCE(created_by,?)
      WHERE id=?
    `).run(avance ?? null, notas ?? null, userId, existing.id);
    return NextResponse.json({ id: existing.id, updated: true });
  }

  const result = db.prepare(`
    INSERT INTO capturas(indicador_id, oficina, anio, mes, programado, avance, notas, created_by)
    VALUES(?,?,?,?,?,?,?,?)
  `).run(indicador_id, oficina, 2026, mes, programado, avance ?? null, notas ?? null, userId);

  return NextResponse.json({ id: result.lastInsertRowid, created: true }, { status: 201 });
}
