import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Captura } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = req.headers.get('x-user-role');
  const oficina = req.headers.get('x-user-oficina') ?? '';
  const db = getDb();

  const captura = db.prepare(`
    SELECT c.*, i.codigo, i.nombre, i.serie
    FROM capturas c JOIN indicadores_2026 i ON c.indicador_id = i.id
    WHERE c.id = ?
  `).get(id) as (Captura & { codigo: string; nombre: string }) | undefined;

  if (!captura) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (role !== 'admin' && captura.oficina !== oficina) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }
  return NextResponse.json(captura);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = req.headers.get('x-user-role');
  const oficina = req.headers.get('x-user-oficina') ?? '';
  const db = getDb();

  const captura = db.prepare('SELECT * FROM capturas WHERE id = ?').get(id) as Captura | undefined;
  if (!captura) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (role !== 'admin' && captura.oficina !== oficina) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }
  if (captura.status !== 'borrador' && captura.status !== 'rechazado') {
    return NextResponse.json({ error: 'Solo se pueden editar borradores o rechazados' }, { status: 400 });
  }

  const { avance, notas } = await req.json();
  db.prepare('UPDATE capturas SET avance=?, notas=?, status=\'borrador\', updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(avance ?? null, notas ?? null, id);

  return NextResponse.json({ ok: true });
}
