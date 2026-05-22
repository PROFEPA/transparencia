import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { User } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const users = db.prepare('SELECT id, email, nombre, role, oficina, activo, created_at FROM users ORDER BY role, nombre').all();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { email, password, nombre, role, oficina } = await req.json();

  if (!email || !password || !nombre || !role) {
    return NextResponse.json({ error: 'Campos requeridos: email, password, nombre, role' }, { status: 400 });
  }

  if (!['admin', 'orpa'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as User | undefined;
  if (existing) {
    return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users(email, password_hash, nombre, role, oficina)
    VALUES(?,?,?,?,?)
  `).run(email, hash, nombre, role, oficina ?? null);

  return NextResponse.json({ id: result.lastInsertRowid, ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, activo, password, nombre, oficina } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const db = getDb();
  if (activo !== undefined) {
    db.prepare('UPDATE users SET activo=? WHERE id=?').run(activo ? 1 : 0, id);
  }
  if (password) {
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), id);
  }
  if (nombre !== undefined) {
    db.prepare('UPDATE users SET nombre=? WHERE id=?').run(nombre, id);
  }
  if (oficina !== undefined) {
    db.prepare('UPDATE users SET oficina=? WHERE id=?').run(oficina, id);
  }
  return NextResponse.json({ ok: true });
}
