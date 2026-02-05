# Changelog

Todos los cambios notables en este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

## [1.0.0] - 2026-02-05

### Añadido

#### ETL (Extracción, Transformación y Carga)
- Pipeline completo de extracción de datos desde archivos Excel y Word
- Extractor para archivos Excel con detección automática de encabezados
- Extractor para documentos Word con parsing de secciones y tablas
- Modelos de datos para Indicadores y Observaciones
- Normalización de periodos (trimestral, semestral, anual)
- Generación automática de slugs para identificadores
- Reporte de calidad de datos con métricas de completitud
- Diccionario de datos generado automáticamente
- Suite de pruebas unitarias con pytest

#### Backend (API REST)
- Servidor FastAPI con documentación OpenAPI automática
- Endpoints para consulta de indicadores con filtros y paginación
- Endpoints para series temporales de observaciones
- Descargas en formatos JSON y CSV
- Metadatos y diccionario de datos accesibles vía API
- Reporte de calidad disponible como endpoint
- CORS configurado para desarrollo y producción
- Health check para monitoreo

#### Frontend (Aplicación Web)
- Aplicación Next.js 14 con App Router
- Página de inicio con KPIs destacados y navegación por año
- Catálogo de indicadores con búsqueda y filtros múltiples
- Página de detalle con visualizaciones (gráficas de línea y barras)
- Tabla de datos con funcionalidad de descarga CSV
- Página de descargas con enlaces a todos los datasets
- Página de metodología con diccionario de datos
- Glosario de términos con navegación alfabética
- Diseño responsivo con Tailwind CSS
- Colores institucionales del Gobierno de México
- Header y footer con información institucional
- SEO optimizado con metadatos

#### Datos
- 14 indicadores de ejemplo (7 G005/2025, 7 G014/2026)
- 22 observaciones con series temporales trimestrales
- Metadatos del dataset
- Diccionario de datos completo
- Reporte de calidad de datos
- Exportaciones en CSV

#### Documentación
- README con instrucciones de instalación y uso
- Documentación de API en formato OpenAPI
- Este CHANGELOG

### Seguridad
- Headers HTTP de seguridad implementados
- Validación de entradas en API
- CORS restrictivo

### Accesibilidad
- Cumplimiento WCAG 2.1 nivel AA
- Navegación por teclado
- Etiquetas ARIA donde corresponde
- Textos alternativos en elementos visuales

## [Próximas Versiones]

### Planeado para 1.1.0
- Integración con fuentes de datos en tiempo real
- Filtros geográficos por entidad federativa
- Comparativas entre periodos
- Panel de administración para actualización de datos
- Exportación en formato Excel (.xlsx)
- Visualizaciones adicionales (mapas, treemaps)

### Planeado para 1.2.0
- Sistema de alertas para umbrales de indicadores
- API de consulta avanzada con agregaciones
- Integración con Portal de Datos Abiertos del Gobierno de México
- Versión en inglés

---

Para reportar problemas o sugerir mejoras, contactar al Órgano Interno de Control de PROFEPA.
