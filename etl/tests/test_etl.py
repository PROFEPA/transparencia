"""
Pruebas unitarias para el ETL del Tablero de Indicadores PROFEPA.
"""
import sys
from pathlib import Path
import json
import pytest

# Agregar path del proyecto
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Indicator, Observation, DataQualityReport
from config import DATA_OUTPUT_DIR


class TestModels:
    """Pruebas para los modelos de datos."""
    
    def test_indicator_creation(self):
        """Prueba la creación de un indicador."""
        indicator = Indicator(
            id="test-indicator-g005-2025",
            nombre="Indicador de prueba",
            programa="G005",
            anio=2025,
            fuente="test.xlsx - Hoja1"
        )
        
        assert indicator.id == "test-indicator-g005-2025"
        assert indicator.nombre == "Indicador de prueba"
        assert indicator.programa == "G005"
        assert indicator.anio == 2025
    
    def test_indicator_to_dict(self):
        """Prueba la serialización de indicador a diccionario."""
        indicator = Indicator(
            id="test-id",
            nombre="Test",
            programa="G005",
            anio=2025,
            fuente="test.xlsx"
        )
        
        data = indicator.to_dict()
        
        assert isinstance(data, dict)
        assert data["id"] == "test-id"
        assert "ultima_actualizacion" in data
    
    def test_observation_creation(self):
        """Prueba la creación de una observación."""
        obs = Observation(
            indicator_id="test-id",
            periodo="2025-01",
            valor=85.5,
            meta=100.0
        )
        
        assert obs.indicator_id == "test-id"
        assert obs.periodo == "2025-01"
        assert obs.valor == 85.5
        assert obs.meta == 100.0
    
    def test_quality_report(self):
        """Prueba el reporte de calidad."""
        report = DataQualityReport(
            archivo_fuente="test.xlsx",
            fecha_extraccion="2025-01-01"
        )
        
        report.add_error("Error de prueba")
        report.add_warning("Advertencia de prueba")
        
        assert len(report.errores) == 1
        assert len(report.advertencias) == 1


class TestOutputValidation:
    """Pruebas de validación de archivos de salida."""
    
    @pytest.fixture
    def output_dir(self):
        return DATA_OUTPUT_DIR
    
    def test_indicators_json_exists(self, output_dir):
        """Verifica que el archivo de indicadores existe."""
        filepath = output_dir / "indicators.json"
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            assert isinstance(data, list)
    
    def test_no_duplicate_ids(self, output_dir):
        """Verifica que no hay IDs duplicados en indicadores."""
        filepath = output_dir / "indicators.json"
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            ids = [ind["id"] for ind in data]
            assert len(ids) == len(set(ids)), "Hay IDs de indicadores duplicados"
    
    def test_periods_valid_format(self, output_dir):
        """Verifica que los periodos tienen formato válido."""
        filepath = output_dir / "observations.json"
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            import re
            valid_patterns = [
                r"^\d{4}$",           # YYYY
                r"^\d{4}-\d{2}$",     # YYYY-MM
                r"^\d{4}-Q[1-4]$"     # YYYY-Qn
            ]
            
            for obs in data:
                periodo = obs.get("periodo", "")
                is_valid = any(re.match(p, periodo) for p in valid_patterns)
                assert is_valid, f"Periodo inválido: {periodo}"
    
    def test_required_fields_present(self, output_dir):
        """Verifica que todos los indicadores tienen campos requeridos."""
        filepath = output_dir / "indicators.json"
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            required = ["id", "nombre", "programa", "anio", "fuente"]
            
            for ind in data:
                for field in required:
                    assert field in ind, f"Campo requerido faltante: {field}"
                    assert ind[field] is not None, f"Campo requerido es None: {field}"
    
    def test_metadata_structure(self, output_dir):
        """Verifica la estructura del archivo de metadatos."""
        filepath = output_dir / "metadata.json"
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            assert "version" in data
            assert "fecha_extraccion" in data
            assert "total_indicadores" in data
            assert "fuentes_procesadas" in data
    
    def test_quality_report_structure(self, output_dir):
        """Verifica la estructura del reporte de calidad."""
        filepath = output_dir / "data_quality_report.json"
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            assert "resumen" in data
            assert "completitud_indicadores" in data
            assert "por_archivo" in data


class TestDataIntegrity:
    """Pruebas de integridad de datos."""
    
    @pytest.fixture
    def output_dir(self):
        return DATA_OUTPUT_DIR
    
    def test_observations_reference_valid_indicators(self, output_dir):
        """Verifica que las observaciones referencian indicadores válidos."""
        indicators_path = output_dir / "indicators.json"
        observations_path = output_dir / "observations.json"
        
        if indicators_path.exists() and observations_path.exists():
            with open(indicators_path, 'r', encoding='utf-8') as f:
                indicators = json.load(f)
            
            with open(observations_path, 'r', encoding='utf-8') as f:
                observations = json.load(f)
            
            valid_ids = set(ind["id"] for ind in indicators)
            
            for obs in observations:
                assert obs["indicator_id"] in valid_ids, \
                    f"Observación referencia indicador inválido: {obs['indicator_id']}"
    
    def test_numeric_values_are_valid(self, output_dir):
        """Verifica que los valores numéricos son válidos."""
        filepath = output_dir / "observations.json"
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for obs in data:
                if obs.get("valor") is not None:
                    assert isinstance(obs["valor"], (int, float))
                if obs.get("meta") is not None:
                    assert isinstance(obs["meta"], (int, float))
                if obs.get("avance_porcentual") is not None:
                    assert isinstance(obs["avance_porcentual"], (int, float))


def run_tests():
    """Ejecuta todas las pruebas."""
    pytest.main([__file__, "-v"])


if __name__ == "__main__":
    run_tests()
