import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken, COOKIE } from '@/lib/auth-interno';
import type { User } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND activo = 1').get(email) as User & { password_hash: string } | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const token = await signToken({
      sub: String(user.id),
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      oficina: user.oficina,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, nombre: user.nombre, role: user.role, oficina: user.oficina },
    });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (e) {
    console.error('[login]', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
