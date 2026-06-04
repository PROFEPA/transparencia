# Tablero de Indicadores PROFEPA — POA 2026

Plataforma institucional de seguimiento del Programa Operativo Anual 2026 de la Procuraduría Federal de Protección al Ambiente (PROFEPA). Incluye un módulo interno de captura para las Unidades Responsables (ORPA) y un panel de administración central.

## 🎯 Objetivo

Permitir a las 37 Unidades Responsables capturar mensualmente sus avances de indicadores POA 2026, y al administrador PROFEPA revisarlos, aprobarlos y publicarlos en el dashboard institucional.

## 📁 Estructura del Proyecto

```
transparencia/
├── app/                          # Aplicación Next.js (frontend + API)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                  # Dashboard público
│   │   │   ├── indicadores/              # Catálogo de indicadores
│   │   │   ├── descargas/                # Descarga de datos
│   │   │   ├── metodologia/              # Documentación metodológica
│   │   │   ├── glosario/                 # Glosario de términos
│   │   │   └── interno/                  # Módulo interno (autenticado)
│   │   │       ├── login/                # Autenticación JWT
│   │   │       ├── admin/                # Panel administrador
│   │   │       │   ├── page.tsx          # Dashboard admin (KPIs, gráficas, mapa)
│   │   │       │   ├── capturas/         # Gestión de capturas
│   │   │       │   ├── publicar/         # Publicar avances al dashboard
│   │   │       │   ├── usuarios/         # Gestión de usuarios
│   │   │       │   └── orpa/[oficina]/   # Detalle por Unidad Responsable
│   │   │       └── orpa/                 # Panel capturista ORPA
│   │   │           └── captura/[mes]/    # Formulario de captura mensual
│   │   ├── components/
│   │   │   ├── MapaInternoPOA.tsx        # Mapa de México por cumplimiento
│   │   │   └── ...
│   │   └── lib/
│   │       └── db.ts                     # Conexión SQLite (better-sqlite3)
│   └── data/
│       └── interno.db                    # Base de datos SQLite
├── etl/
│   └── scripts/
│       └── import_avances_poa2026.py     # Importación de Excel → SQLite
└── README.md
```

## 🚀 Instalación y Ejecución

### Requisitos

- Node.js 18+
- npm

### Desarrollo

```bash
cd app
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Producción

```bash
cd app
npm run build
npm run start -- -H 0.0.0.0 -p 3001
```

## 🔌 API Interna (autenticada con JWT)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/interno/auth/login` | Autenticación |
| GET | `/api/interno/admin/resumen` | KPIs globales (totales, metas registradas) |
| GET | `/api/interno/admin/estadisticas` | Matriz ORPA×mes, cumplimiento por indicador |
| GET | `/api/interno/admin/orpa/[oficina]` | Detalle de una Unidad Responsable |
| GET/POST | `/api/interno/capturas` | Gestión de capturas mensuales |
| POST | `/api/interno/capturas/[id]/approve` | Aprobar captura |

## 📊 Modelo de Datos

- **`indicadores_2026`** — 532 registros (24 códigos únicos × 37 URs), con metas mensuales programadas.
- **`capturas`** — Avances capturados por ORPA/mes/indicador (status: borrador → enviado → aprobado).
- **`users`** — Usuarios con roles `admin` / `orpa`.

## 🎨 Panel Admin — Funcionalidades

- **Dashboard**: KPIs nacionales, gráfica de cumplimiento por indicador, mapa de México por UR, ranking de cumplimiento por Unidad Responsable.
- **Por ORPA**: Detalle de cumplimiento por indicador, gráficas mensuales, matriz indicador × mes.
- **Capturas**: Revisión, aprobación y rechazo de avances enviados por las ORPAs.
- **Publicar**: Sincronización de datos aprobados al dashboard público.

## 🔑 Credenciales por defecto

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@profepa.gob.mx | Admin2026! |
| ORPA Jalisco | orpa.jal@profepa.gob.mx | Jal2026! |

> Las contraseñas se inicializan en `app/src/lib/db.ts` en el primer arranque.

## 🎨 Identidad Gráfica

- **Verde institucional**: `#235B4E`
- **Rojo institucional**: `#691C32`

## 📝 Licencia

Uso institucional PROFEPA. Datos públicos del Gobierno de México.
