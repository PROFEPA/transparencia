import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// On Vercel the root filesystem is read-only; use /tmp for the writable DB file.
// The seed JSON lives in data/ (committed to git) and is always readable from cwd.
const IS_VERCEL = process.env.VERCEL === '1';
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'interno.db');
const SEED_PATH = path.join(process.cwd(), 'data', 'seed_poa2026.json');
const SEED_CAPTURAS_PATH = path.join(process.cwd(), 'data', 'seed_capturas.json');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      nombre        TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK(role IN ('admin','orpa')),
      oficina       TEXT,
      activo        INTEGER DEFAULT 1,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS indicadores_2026 (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo     TEXT NOT NULL,
      nombre     TEXT NOT NULL,
      serie      TEXT,
      oficina    TEXT NOT NULL,
      meta_anual REAL,
      prog_ene   REAL, prog_feb REAL, prog_mzo REAL, prog_abr REAL,
      prog_may   REAL, prog_jun REAL, prog_jul REAL, prog_ago REAL,
      prog_sep   REAL, prog_oct REAL, prog_nov REAL, prog_dic REAL,
      UNIQUE(codigo, oficina)
    );

    CREATE TABLE IF NOT EXISTS capturas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      indicador_id     INTEGER NOT NULL REFERENCES indicadores_2026(id),
      oficina          TEXT    NOT NULL,
      anio             INTEGER NOT NULL DEFAULT 2026,
      mes              INTEGER NOT NULL,
      programado       REAL,
      avance           REAL,
      notas            TEXT,
      status           TEXT NOT NULL DEFAULT 'borrador'
                         CHECK(status IN ('borrador','enviado','aprobado','rechazado')),
      created_by       INTEGER REFERENCES users(id),
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at     DATETIME,
      reviewed_by      INTEGER REFERENCES users(id),
      reviewed_at      DATETIME,
      motivo_rechazo   TEXT,
      UNIQUE(indicador_id, oficina, anio, mes)
    );

    CREATE TABLE IF NOT EXISTS publicaciones (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      anio            INTEGER NOT NULL,
      meses_incluidos TEXT,
      publicado_por   INTEGER REFERENCES users(id),
      publicado_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      capturas_count  INTEGER,
      descripcion     TEXT
    );

    CREATE TABLE IF NOT EXISTS _meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const seeded = db.prepare("SELECT value FROM _meta WHERE key='seeded'").get() as { value: string } | undefined;
  if (!seeded) {
    seedData(db);
    seedCapturas(db);
    db.prepare("INSERT INTO _meta(key, value) VALUES('seeded','1')").run();
  }
}

const MESES_KEYS = ['prog_ene','prog_feb','prog_mzo','prog_abr','prog_may','prog_jun',
                    'prog_jul','prog_ago','prog_sep','prog_oct','prog_nov','prog_dic'];

function seedData(db: Database.Database) {
  // Demo users
  const hash = (p: string) => bcrypt.hashSync(p, 10);
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users(email, password_hash, nombre, role, oficina)
    VALUES(?,?,?,?,?)
  `);
  insertUser.run('admin@profepa.gob.mx', hash('Admin2026!'), 'Administrador PROFEPA', 'admin', null);
  insertUser.run('orpa.ags@profepa.gob.mx', hash('Ags2026!'), 'ORPA Aguascalientes', 'orpa', 'Aguascalientes');
  insertUser.run('orpa.bc@profepa.gob.mx', hash('BC2026!'), 'ORPA Baja California', 'orpa', 'Baja California');
  insertUser.run('orpa.cdmx@profepa.gob.mx', hash('CDMX2026!'), 'ORPA CDMX-ZMVM', 'orpa', 'CDMX-ZMVM');

  // Indicators from seed JSON
  if (!fs.existsSync(SEED_PATH)) {
    console.warn('[db] seed_poa2026.json not found — run etl/scripts/init_poa2026.py first');
    return;
  }

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8')) as Record<string, unknown>[];
  const insertInd = db.prepare(`
    INSERT OR IGNORE INTO indicadores_2026
      (codigo, nombre, serie, oficina, meta_anual,
       prog_ene, prog_feb, prog_mzo, prog_abr,
       prog_may, prog_jun, prog_jul, prog_ago,
       prog_sep, prog_oct, prog_nov, prog_dic)
    VALUES
      (@codigo, @nombre, @serie, @oficina, @meta_anual,
       @prog_ene, @prog_feb, @prog_mzo, @prog_abr,
       @prog_may, @prog_jun, @prog_jul, @prog_ago,
       @prog_sep, @prog_oct, @prog_nov, @prog_dic)
  `);

  const insertMany = db.transaction((rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      const rec: Record<string, unknown> = {
        codigo: row.codigo, nombre: row.nombre,
        serie: row.serie, oficina: row.oficina,
        meta_anual: row.meta_anual ?? null,
      };
      for (const k of MESES_KEYS) rec[k] = (row[k] ?? null);
      insertInd.run(rec);
    }
  });
  insertMany(seed);
  console.log(`[db] Seeded ${seed.length} indicadores_2026 rows`);
}

function seedCapturas(db: Database.Database) {
  if (!fs.existsSync(SEED_CAPTURAS_PATH)) {
    console.warn('[db] seed_capturas.json not found — skipping capturas seed');
    return;
  }

  type SeedCaptura = { codigo: string; oficina: string; mes: number; programado: number | null; avance: number | null; anio: number };
  const seed = JSON.parse(fs.readFileSync(SEED_CAPTURAS_PATH, 'utf8')) as SeedCaptura[];

  const getAdminId = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1");
  const admin = getAdminId.get() as { id: number } | undefined;
  const adminId = admin?.id ?? null;

  const getIndId = db.prepare('SELECT id FROM indicadores_2026 WHERE codigo=? AND oficina=? LIMIT 1');
  const insertCap = db.prepare(`
    INSERT OR IGNORE INTO capturas
      (indicador_id, oficina, anio, mes, programado, avance,
       status, created_by, reviewed_by, reviewed_at, submitted_at, updated_at, notas)
    VALUES (?,?,?,?,?,?, 'aprobado',?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,
            'Datos POA 2026 Ene-Abr (importado del Excel oficial)')
  `);

  const insertMany = db.transaction((rows: SeedCaptura[]) => {
    let count = 0;
    for (const c of rows) {
      const ind = getIndId.get(c.codigo, c.oficina) as { id: number } | undefined;
      if (!ind) continue;
      insertCap.run(ind.id, c.oficina, c.anio, c.mes, c.programado, c.avance, adminId, adminId);
      count++;
    }
    return count;
  });

  const n = insertMany(seed);
  console.log(`[db] Seeded ${n} capturas from seed_capturas.json`);
}

// Helpers

export interface User {
  id: number;
  email: string;
  nombre: string;
  role: 'admin' | 'orpa';
  oficina: string | null;
  activo: number;
}

export interface Indicador2026 {
  id: number;
  codigo: string;
  nombre: string;
  serie: string | null;
  oficina: string;
  meta_anual: number | null;
  prog_ene: number | null; prog_feb: number | null; prog_mzo: number | null;
  prog_abr: number | null; prog_may: number | null; prog_jun: number | null;
  prog_jul: number | null; prog_ago: number | null; prog_sep: number | null;
  prog_oct: number | null; prog_nov: number | null; prog_dic: number | null;
}

export interface Captura {
  id: number;
  indicador_id: number;
  oficina: string;
  anio: number;
  mes: number;
  programado: number | null;
  avance: number | null;
  notas: string | null;
  status: 'borrador' | 'enviado' | 'aprobado' | 'rechazado';
  created_by: number | null;
  updated_at: string;
  submitted_at: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  motivo_rechazo: string | null;
}

export const MES_KEY: Record<number, string> = {
  1:'prog_ene', 2:'prog_feb', 3:'prog_mzo', 4:'prog_abr',
  5:'prog_may', 6:'prog_jun', 7:'prog_jul', 8:'prog_ago',
  9:'prog_sep', 10:'prog_oct', 11:'prog_nov', 12:'prog_dic',
};

export const MES_NOMBRE: Record<number, string> = {
  1:'Enero', 2:'Febrero', 3:'Marzo', 4:'Abril',
  5:'Mayo', 6:'Junio', 7:'Julio', 8:'Agosto',
  9:'Septiembre', 10:'Octubre', 11:'Noviembre', 12:'Diciembre',
};
