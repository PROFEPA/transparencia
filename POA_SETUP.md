# Sistema de Captura POA 2026 - Instrucciones de Configuración

## Requisitos Previos

- Python 3.10+
- PostgreSQL 14+
- Node.js 18+

## 1. Configurar PostgreSQL

```sql
-- Crear usuario y base de datos
CREATE USER profepa WITH PASSWORD 'profepa2026';
CREATE DATABASE profepa_poa OWNER profepa;
GRANT ALL PRIVILEGES ON DATABASE profepa_poa TO profepa;
```

## 2. Instalar dependencias del backend

```bash
cd backend
pip install -r requirements.txt
```

## 3. Inicializar la base de datos y lanzar el servidor POA

```bash
cd backend
# El servidor inicializa automáticamente las tablas y datos semilla al arrancar
uvicorn poa_api:app --host 0.0.0.0 --port 8001 --reload
```

El API POA estará disponible en `http://localhost:8001`.

**Credenciales de administrador por defecto:**
- Email: `admin@profepa.gob.mx`
- Contraseña: `admin2026`

> **Importante:** Cambie la contraseña del administrador después del primer inicio de sesión.

## 4. Instalar dependencias del frontend

```bash
cd app
npm install
```

## 5. Iniciar el frontend

```bash
cd app
npm run dev
```

El dashboard estará en `http://localhost:3000` y el sistema de captura POA en `http://localhost:3000/admin`.

## Arquitectura

| Componente | Puerto | Descripción |
|---|---|---|
| Frontend Next.js | 3000 | Dashboard público + Admin POA |
| Backend API (existente) | 8000 | API de datos estáticos |
| Backend POA API | 8001 | API de captura POA con PostgreSQL |

## Estructura de Archivos Nuevos

```
backend/
  database.py          # Modelos SQLAlchemy + seed data
  poa_api.py           # FastAPI endpoints para POA

app/src/
  types/poa.ts         # Tipos TypeScript para POA
  lib/poa-api.ts       # Cliente API
  contexts/AuthContext.tsx  # Contexto de autenticación React
  app/admin/
    login/page.tsx     # Página de login
    layout.tsx         # Layout admin con sidebar
    page.tsx           # Dashboard/Tablero con filtros
    registrar/page.tsx # Captura de metas (valor planeado)
    editar/page.tsx    # Edición de metas (planeado + real)
    reporte/page.tsx   # Reporte tabulado mensual
    usuarios/page.tsx  # Administración de usuarios
    bitacora/page.tsx  # Bitácora/Auditoría de cambios
```

## Roles de Usuario

| Rol | Permisos |
|---|---|
| SUPERADMIN | Acceso total, gestión de usuarios y bitácora |
| ADMIN | Gestión de usuarios, captura y edición |
| SUBCOR | Captura y edición de su área |
| ORPA | Solo captura de su entidad |
