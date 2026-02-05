# Dashboard de Transparencia PROFEPA

Plataforma pública de consulta de indicadores institucionales de la Procuraduría Federal de Protección al Ambiente (PROFEPA) para los ejercicios fiscales 2025-2026.

## 🎯 Objetivo

Proporcionar a la ciudadanía una herramienta accesible para consultar, entender y descargar información institucional (bases de datos e indicadores) de forma clara, trazable y verificable.

## 📁 Estructura del Proyecto

```
Dashboard OIC/
├── etl/                          # Pipeline de extracción y transformación
│   ├── config.py                 # Configuración del ETL
│   ├── models.py                 # Modelos de datos
│   ├── main.py                   # Orquestador principal
│   ├── extractors/
│   │   ├── excel_extractor.py    # Extractor para archivos Excel
│   │   └── docx_extractor.py     # Extractor para documentos Word
│   └── tests/
│       └── test_etl.py           # Pruebas unitarias
├── backend/                      # API REST (FastAPI)
│   ├── main.py                   # Servidor API
│   └── requirements.txt          # Dependencias Python
├── app/                          # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                  # Páginas de la aplicación
│   │   │   ├── page.tsx          # Página de inicio
│   │   │   ├── indicadores/      # Catálogo y detalle de indicadores
│   │   │   ├── descargas/        # Página de descargas
│   │   │   ├── metodologia/      # Documentación metodológica
│   │   │   └── glosario/         # Glosario de términos
│   │   └── types/                # Tipos TypeScript
│   ├── package.json
│   └── tailwind.config.js
├── public/data/                  # Datos procesados (JSON y CSV)
│   ├── indicators.json
│   ├── observations.json
│   ├── metadata.json
│   ├── data_dictionary.json
│   ├── data_quality_report.json
│   ├── indicators.csv
│   └── observations.csv
└── mnt/Datos/                    # Archivos fuente (Excel y Word)
```

## 🚀 Instalación y Ejecución

### Requisitos Previos

- Python 3.11+
- Node.js 18+
- npm o yarn

### 1. Configurar el ETL

```bash
cd etl
pip install -r requirements.txt

# Ejecutar ETL para procesar archivos fuente
python main.py
```

### 2. Iniciar el Backend (opcional para desarrollo)

```bash
cd backend
pip install -r requirements.txt

# Iniciar servidor en desarrollo
uvicorn main:app --reload --port 8000
```

La API estará disponible en `http://localhost:8000`

### 3. Iniciar el Frontend

```bash
cd app
npm install

# Desarrollo
npm run dev

# Producción
npm run build
npm run start
```

La aplicación estará disponible en `http://localhost:3000`

## 📊 Fuentes de Datos

| Archivo | Tipo | Programa | Año |
|---------|------|----------|-----|
| POA_2025.xlsx | Excel | G005 | 2025 |
| MIR_G005_2025.xlsx | Excel | G005 | 2025 |
| FiME 2026 PFPA.xlsx | Excel | G014 | 2026 |
| G014 para Auditoría.docx | Word | G014 | 2026 |

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/indicators` | Lista de indicadores con filtros |
| GET | `/api/indicators/{id}` | Detalle de un indicador |
| GET | `/api/observations` | Datos temporales de observaciones |
| GET | `/api/metadata` | Metadatos del dataset |
| GET | `/api/data-dictionary` | Diccionario de datos |
| GET | `/api/quality-report` | Reporte de calidad |
| GET | `/api/download/{format}` | Descarga en CSV o JSON |
| GET | `/health` | Estado del servicio |

### Parámetros de Consulta

- `programa`: Filtrar por programa (G005, G014)
- `anio`: Filtrar por año (2025, 2026)
- `nivel`: Filtrar por nivel (Fin, Propósito, Componente, Actividad)
- `q`: Búsqueda por texto
- `page`: Número de página
- `page_size`: Elementos por página

## 🎨 Diseño

El diseño sigue los lineamientos de identidad gráfica del Gobierno de México:

- **Verde institucional**: #235B4E
- **Rojo institucional**: #691C32
- **Dorado institucional**: #BC955C

## ♿ Accesibilidad

- Compatible con WCAG 2.1 nivel AA
- Navegación completa por teclado
- Textos alternativos en imágenes
- Contraste de colores adecuado
- Estructura semántica HTML5

## 🔒 Seguridad

- Headers de seguridad HTTP configurados
- CORS restrictivo en producción
- Validación de entradas
- Sin almacenamiento de datos sensibles

## 📝 Licencia

Datos públicos del Gobierno de México. Uso libre con atribución a PROFEPA.

## 📞 Contacto

Procuraduría Federal de Protección al Ambiente (PROFEPA)
- Sitio web: [www.gob.mx/profepa](https://www.gob.mx/profepa)
- Órgano Interno de Control
