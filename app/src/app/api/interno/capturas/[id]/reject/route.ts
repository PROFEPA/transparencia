import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Captura } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.headers.get('x-user-id');
  const db = getDb();

  const captura = db.prepare('SELECT * FROM capturas WHERE id = ?').get(id) as Captura | undefined;
  if (!captura) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (captura.status !== 'enviado') {
    return NextResponse.json({ error: 'Solo se pueden rechazar capturas enviadas' }, { status: 400 });
  }

  const { motivo } = await req.json();
  db.prepare(`UPDATE capturas SET status='rechazado', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP,
    motivo_rechazo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(userId, motivo ?? null, id);

  return NextResponse.json({ ok: true });
}
