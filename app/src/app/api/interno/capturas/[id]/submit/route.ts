import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Captura } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = req.headers.get('x-user-role');
  const oficina = req.headers.get('x-user-oficina') ?? '';
  const db = getDb();

  const captura = db.prepare('SELECT * FROM capturas WHERE id = ?').get(id) as Captura | undefined;
  if (!captura) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (role !== 'admin' && captura.oficina !== oficina) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }
  if (!['borrador', 'rechazado'].includes(captura.status)) {
    return NextResponse.json({ error: 'Solo se pueden enviar borradores o rechazados' }, { status: 400 });
  }

  // Auto-aprobado: la revisión ocurre al publicar, no por captura individual
  const userId = req.headers.get('x-user-id');
  db.prepare(`UPDATE capturas SET status='aprobado', submitted_at=CURRENT_TIMESTAMP,
    reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP,
    motivo_rechazo=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(userId, id);

  return NextResponse.json({ ok: true });
}
