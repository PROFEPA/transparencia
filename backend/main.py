"""
Backend FastAPI para Tablero de Indicadores PROFEPA.
API REST para servir indicadores y datos procesados.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from pathlib import Path
from datetime import datetime
import json
import csv
import io

# Configuración de rutas
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "public" / "data"

# Crear la aplicación FastAPI
app = FastAPI(
    title="API Tablero de Indicadores PROFEPA",
    description="""
    API pública para consultar indicadores institucionales de PROFEPA.
    
    Esta API proporciona acceso a:
    - Catálogo de indicadores (POA, MIR, FiME)
    - Series temporales de avances
    - Descargas en formatos abiertos (CSV, JSON)
    - Diccionario de datos y metodología
    
    **Aviso Legal:** La información proviene de documentos institucionales y se 
    publica con fines informativos; la interpretación oficial corresponde a PROFEPA.
    """,
    version="1.0.0",
    contact={
        "name": "PROFEPA - Transparencia",
        "url": "https://www.gob.mx/profepa"
    }
)

# Configurar CORS para permitir acceso desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


# Modelos Pydantic para respuestas
class Indicator(BaseModel):
    """Modelo de indicador."""
    id: str
    nombre: str
    programa: str
    anio: int
    fuente: str
    definicion: Optional[str] = None
    metodo_calculo: Optional[str] = None
    unidad_medida: Optional[str] = None
    nivel: Optional[str] = None
    notas: Optional[str] = None
    ultima_actualizacion: str


class Observation(BaseModel):
    """Modelo de observación/serie temporal."""
    indicator_id: str
    periodo: str
    valor: Optional[float] = None
    meta: Optional[float] = None
    avance_porcentual: Optional[float] = None
    entidad: Optional[str] = None
    categoria: Optional[str] = None
    fuente_detalle: str


class PaginatedResponse(BaseModel):
    """Respuesta paginada."""
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[Any]


class MetadataResponse(BaseModel):
    """Respuesta de metadatos."""
    version: str
    fecha_extraccion: str
    total_indicadores: int
    total_observaciones: int
    programas: List[str]
    anios: List[int]
    fuentes_procesadas: List[Dict[str, Any]]


# Funciones auxiliares para cargar datos
def load_json_file(filename: str) -> Any:
    """Carga un archivo JSON del directorio de datos."""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Archivo no encontrado: {filename}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def filter_indicators(
    indicators: List[dict],
    anio: Optional[int] = None,
    programa: Optional[str] = None,
    nivel: Optional[str] = None,
    search: Optional[str] = None
) -> List[dict]:
    """Filtra indicadores según criterios."""
    result = indicators
    
    if anio:
        result = [i for i in result if i.get("anio") == anio]
    
    if programa:
        result = [i for i in result if i.get("programa", "").upper() == programa.upper()]
    
    if nivel:
        result = [i for i in result if i.get("nivel", "").lower() == nivel.lower()]
    
    if search:
        search_lower = search.lower()
        result = [
            i for i in result 
            if search_lower in i.get("nombre", "").lower() 
            or search_lower in (i.get("definicion", "") or "").lower()
        ]
    
    return result


def paginate(data: List[Any], page: int, page_size: int) -> PaginatedResponse:
    """Pagina una lista de datos."""
    total = len(data)
    total_pages = (total + page_size - 1) // page_size
    
    start = (page - 1) * page_size
    end = start + page_size
    
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        data=data[start:end]
    )


# ===== ENDPOINTS =====

@app.get("/", tags=["General"])
async def root():
    """Información general de la API."""
    return {
        "nombre": "API Tablero de Indicadores PROFEPA",
        "version": "1.0.0",
        "descripcion": "API pública para consultar indicadores institucionales",
        "documentacion": "/docs",
        "endpoints_principales": {
            "indicadores": "/api/indicadores",
            "observaciones": "/api/observaciones",
            "descargas": "/api/descargas",
            "metadatos": "/api/metadata"
        },
        "aviso": "La información proviene de documentos institucionales y se publica con fines informativos."
    }


@app.get("/api/metadata", response_model=MetadataResponse, tags=["Metadatos"])
async def get_metadata():
    """Obtiene metadatos generales del dataset."""
    try:
        data = load_json_file("metadata.json")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/indicadores", tags=["Indicadores"])
async def get_indicadores(
    anio: Optional[int] = Query(None, description="Filtrar por año (2025 o 2026)"),
    programa: Optional[str] = Query(None, description="Filtrar por programa (G005 o G014)"),
    nivel: Optional[str] = Query(None, description="Filtrar por nivel MIR (Fin, Propósito, Componente, Actividad)"),
    search: Optional[str] = Query(None, description="Buscar por nombre o definición"),
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Elementos por página")
):
    """
    Lista todos los indicadores disponibles con filtros opcionales.
    
    Permite filtrar por:
    - **anio**: Año fiscal (2025 o 2026)
    - **programa**: Programa presupuestario (G005 o G014)
    - **nivel**: Nivel en la MIR (Fin, Propósito, Componente, Actividad)
    - **search**: Búsqueda por texto en nombre o definición
    """
    try:
        indicators = load_json_file("indicators.json")
        filtered = filter_indicators(indicators, anio, programa, nivel, search)
        return paginate(filtered, page, page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/indicadores/{indicator_id}", tags=["Indicadores"])
async def get_indicator_detail(indicator_id: str):
    """
    Obtiene el detalle completo de un indicador por su ID.
    
    Incluye:
    - Información del indicador
    - Serie de observaciones
    - Fuente y trazabilidad
    """
    try:
        indicators = load_json_file("indicators.json")
        
        indicator = next((i for i in indicators if i["id"] == indicator_id), None)
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicador no encontrado")
        
        # Cargar observaciones
        observations = load_json_file("observations.json")
        indicator_obs = [o for o in observations if o["indicator_id"] == indicator_id]
        
        return {
            "indicador": indicator,
            "observaciones": indicator_obs,
            "tiene_serie": len(indicator_obs) > 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/observaciones", tags=["Observaciones"])
async def get_observaciones(
    indicator_id: Optional[str] = Query(None, description="Filtrar por ID de indicador"),
    periodo: Optional[str] = Query(None, description="Filtrar por periodo (ej: 2025, 2025-01, 2025-Q1)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200)
):
    """
    Lista todas las observaciones (series temporales) disponibles.
    
    Permite filtrar por:
    - **indicator_id**: ID del indicador
    - **periodo**: Periodo específico
    """
    try:
        observations = load_json_file("observations.json")
        
        if indicator_id:
            observations = [o for o in observations if o["indicator_id"] == indicator_id]
        
        if periodo:
            observations = [o for o in observations if o["periodo"] == periodo]
        
        return paginate(observations, page, page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/estadisticas", tags=["Estadísticas"])
async def get_estadisticas():
    """
    Obtiene estadísticas generales del dashboard.
    
    Incluye:
    - Total de indicadores por año y programa
    - Porcentaje de completitud
    - Últimas actualizaciones
    """
    try:
        indicators = load_json_file("indicators.json")
        observations = load_json_file("observations.json")
        quality = load_json_file("data_quality_report.json")
        
        # Estadísticas por año
        by_year = {}
        for ind in indicators:
            year = ind["anio"]
            if year not in by_year:
                by_year[year] = 0
            by_year[year] += 1
        
        # Estadísticas por programa
        by_program = {}
        for ind in indicators:
            prog = ind["programa"]
            if prog not in by_program:
                by_program[prog] = 0
            by_program[prog] += 1
        
        # Indicadores con serie
        ids_con_serie = set(o["indicator_id"] for o in observations)
        
        return {
            "total_indicadores": len(indicators),
            "total_observaciones": len(observations),
            "indicadores_con_serie": len(ids_con_serie),
            "porcentaje_con_serie": round(len(ids_con_serie) / max(len(indicators), 1) * 100, 2),
            "por_anio": by_year,
            "por_programa": by_program,
            "completitud": quality.get("completitud_indicadores", {}),
            "fecha_extraccion": quality.get("fecha_generacion")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/diccionario", tags=["Documentación"])
async def get_data_dictionary():
    """
    Obtiene el diccionario de datos con la descripción de cada campo.
    
    Proporciona información sobre:
    - Nombre de columna
    - Tipo de dato
    - Descripción
    - Valores permitidos (si aplica)
    """
    try:
        return load_json_file("data_dictionary.json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/calidad", tags=["Documentación"])
async def get_quality_report():
    """
    Obtiene el reporte de calidad de datos.
    
    Incluye información sobre:
    - Filas procesadas y descartadas
    - Completitud de campos
    - Errores y advertencias encontrados
    """
    try:
        return load_json_file("data_quality_report.json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== ENDPOINTS DE DESCARGA =====

@app.get("/api/descargas/indicadores/csv", tags=["Descargas"])
async def download_indicators_csv():
    """Descarga todos los indicadores en formato CSV."""
    filepath = DATA_DIR / "indicators.csv"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Archivo CSV no disponible")
    
    return FileResponse(
        filepath,
        media_type="text/csv",
        filename=f"indicadores_profepa_{datetime.now().strftime('%Y%m%d')}.csv"
    )


@app.get("/api/descargas/indicadores/json", tags=["Descargas"])
async def download_indicators_json():
    """Descarga todos los indicadores en formato JSON."""
    filepath = DATA_DIR / "indicators.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Archivo JSON no disponible")
    
    return FileResponse(
        filepath,
        media_type="application/json",
        filename=f"indicadores_profepa_{datetime.now().strftime('%Y%m%d')}.json"
    )


@app.get("/api/descargas/observaciones/csv", tags=["Descargas"])
async def download_observations_csv():
    """Descarga todas las observaciones en formato CSV."""
    filepath = DATA_DIR / "observations.csv"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Archivo CSV no disponible")
    
    return FileResponse(
        filepath,
        media_type="text/csv",
        filename=f"observaciones_profepa_{datetime.now().strftime('%Y%m%d')}.csv"
    )


@app.get("/api/descargas/indicador/{indicator_id}/csv", tags=["Descargas"])
async def download_indicator_csv(indicator_id: str):
    """
    Descarga los datos de un indicador específico en formato CSV.
    
    Incluye:
    - Información del indicador
    - Serie de observaciones
    """
    try:
        indicators = load_json_file("indicators.json")
        observations = load_json_file("observations.json")
        
        indicator = next((i for i in indicators if i["id"] == indicator_id), None)
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicador no encontrado")
        
        indicator_obs = [o for o in observations if o["indicator_id"] == indicator_id]
        
        # Generar CSV en memoria
        output = io.StringIO()
        
        # Escribir información del indicador
        output.write("# INFORMACIÓN DEL INDICADOR\n")
        output.write(f"ID,{indicator['id']}\n")
        output.write(f"Nombre,\"{indicator['nombre']}\"\n")
        output.write(f"Programa,{indicator['programa']}\n")
        output.write(f"Año,{indicator['anio']}\n")
        output.write(f"Fuente,\"{indicator['fuente']}\"\n")
        output.write(f"Definición,\"{indicator.get('definicion', 'N/A')}\"\n")
        output.write(f"Método de cálculo,\"{indicator.get('metodo_calculo', 'N/A')}\"\n")
        output.write(f"Unidad de medida,{indicator.get('unidad_medida', 'N/A')}\n")
        output.write(f"Nivel,{indicator.get('nivel', 'N/A')}\n")
        output.write("\n")
        
        # Escribir observaciones
        if indicator_obs:
            output.write("# SERIE DE DATOS\n")
            writer = csv.DictWriter(
                output,
                fieldnames=["periodo", "valor", "meta", "avance_porcentual", "fuente_detalle"]
            )
            writer.writeheader()
            for obs in indicator_obs:
                writer.writerow({
                    "periodo": obs["periodo"],
                    "valor": obs.get("valor", ""),
                    "meta": obs.get("meta", ""),
                    "avance_porcentual": obs.get("avance_porcentual", ""),
                    "fuente_detalle": obs.get("fuente_detalle", "")
                })
        else:
            output.write("# Sin serie de datos disponible\n")
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=indicador_{indicator_id}.csv"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== HEALTH CHECK =====

@app.get("/health", tags=["Sistema"])
async def health_check():
    """Verifica el estado del servicio."""
    try:
        # Verificar que los archivos de datos existen
        files_status = {
            "indicators.json": (DATA_DIR / "indicators.json").exists(),
            "observations.json": (DATA_DIR / "observations.json").exists(),
            "metadata.json": (DATA_DIR / "metadata.json").exists()
        }
        
        all_ok = all(files_status.values())
        
        return {
            "status": "healthy" if all_ok else "degraded",
            "timestamp": datetime.now().isoformat(),
            "data_files": files_status
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
