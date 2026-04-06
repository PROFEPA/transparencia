"""
Database configuration and models for POA 2026 indicator tracking system.
Uses SQLAlchemy with PostgreSQL.
"""
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, Enum as SQLEnum, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://profepa:profepa2026@localhost:5432/profepa_poa"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserRole(str, enum.Enum):
    SUPERADMIN = "SUPERADMIN"
    ADMIN = "ADMIN"
    SUBCOR = "SUBCOR"
    ORPA = "ORPA"


class Area(Base):
    __tablename__ = "areas"

    id = Column(String(20), primary_key=True)
    nombre = Column(String(200), nullable=False)
    siglas = Column(String(20), nullable=False)

    indicadores = relationship("IndicadorPOA", back_populates="area")
    usuarios = relationship("User", back_populates="area")


class EntidadFederativa(Base):
    __tablename__ = "entidades_federativas"

    id = Column(Integer, primary_key=True)
    clave = Column(String(5), nullable=False, unique=True)
    nombre = Column(String(100), nullable=False)
    abreviatura = Column(String(10), nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False, unique=True)
    password_hash = Column(String(200), nullable=False)
    descripcion = Column(String(300))
    siglas = Column(String(20))
    area_id = Column(String(20), ForeignKey("areas.id"), nullable=True)
    entidad_id = Column(Integer, ForeignKey("entidades_federativas.id"), nullable=True)
    rol = Column(SQLEnum(UserRole), nullable=False, default=UserRole.ORPA)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    area = relationship("Area", back_populates="usuarios")
    entidad = relationship("EntidadFederativa")


class IndicadorPOA(Base):
    __tablename__ = "indicadores_poa"

    id = Column(Integer, primary_key=True, autoincrement=True)
    clave = Column(String(20), nullable=False, unique=True)
    nombre = Column(String(500), nullable=False)
    area_id = Column(String(20), ForeignKey("areas.id"), nullable=False)
    unidad_medida = Column(String(100))
    metodo_calculo = Column(Text)
    definicion = Column(Text)
    nivel = Column(String(50))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    area = relationship("Area", back_populates="indicadores")
    metas = relationship("Meta", back_populates="indicador")


class Meta(Base):
    __tablename__ = "metas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    indicador_id = Column(Integer, ForeignKey("indicadores_poa.id"), nullable=False)
    entidad_id = Column(Integer, ForeignKey("entidades_federativas.id"), nullable=False)
    mes = Column(Integer, nullable=False)  # 1-12
    anio = Column(Integer, nullable=False, default=2026)
    valor_planeado = Column(Float, nullable=True)
    valor_real = Column(Float, nullable=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    indicador = relationship("IndicadorPOA", back_populates="metas")
    entidad = relationship("EntidadFederativa")
    usuario = relationship("User")

    __table_args__ = (
        UniqueConstraint("indicador_id", "entidad_id", "mes", "anio", name="uq_meta_indicador_entidad_mes_anio"),
    )


class Bitacora(Base):
    __tablename__ = "bitacora"

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    operacion = Column(String(50), nullable=False)  # REGISTRO, EDICION, ELIMINACION
    meta_id = Column(Integer, ForeignKey("metas.id"), nullable=True)
    detalles = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("User")
    meta = relationship("Meta")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables and seed initial data."""
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed areas if empty
        if db.query(Area).count() == 0:
            areas = [
                Area(id="SPA", nombre="Subprocuraduría de Prevención Ambiental", siglas="SPA"),
                Area(id="SIVI", nombre="Subprocuraduría de Inspección y Vigilancia Industrial", siglas="SIVI"),
                Area(id="SRN", nombre="Subprocuraduría de Recursos Naturales", siglas="SRN"),
                Area(id="SLEJA", nombre="Subprocuraduría de Litigio Estratégico y Justicia Ambiental", siglas="SLEJA"),
                Area(id="CORPAGT", nombre="Coordinación de Oficinas de Representación de Protección Ambiental y Gestión Territorial", siglas="CORPAGT"),
            ]
            db.add_all(areas)
            db.commit()

        # Seed entidades if empty
        if db.query(EntidadFederativa).count() == 0:
            entidades = [
                (1, "01", "Aguascalientes", "AGS"),
                (2, "02", "Baja California", "BC"),
                (3, "03", "Baja California Sur", "BCS"),
                (4, "04", "Campeche", "CAMP"),
                (5, "05", "Coahuila de Zaragoza", "COAH"),
                (6, "06", "Colima", "COL"),
                (7, "07", "Chiapas", "CHIS"),
                (8, "08", "Chihuahua", "CHIH"),
                (9, "09", "Ciudad de México", "CDMX"),
                (10, "10", "Durango", "DGO"),
                (11, "11", "Guanajuato", "GTO"),
                (12, "12", "Guerrero", "GRO"),
                (13, "13", "Hidalgo", "HGO"),
                (14, "14", "Jalisco", "JAL"),
                (15, "15", "México", "MEX"),
                (16, "16", "Michoacán de Ocampo", "MICH"),
                (17, "17", "Morelos", "MOR"),
                (18, "18", "Nayarit", "NAY"),
                (19, "19", "Nuevo León", "NL"),
                (20, "20", "Oaxaca", "OAX"),
                (21, "21", "Puebla", "PUE"),
                (22, "22", "Querétaro", "QRO"),
                (23, "23", "Quintana Roo", "QROO"),
                (24, "24", "San Luis Potosí", "SLP"),
                (25, "25", "Sinaloa", "SIN"),
                (26, "26", "Sonora", "SON"),
                (27, "27", "Tabasco", "TAB"),
                (28, "28", "Tamaulipas", "TAMPS"),
                (29, "29", "Tlaxcala", "TLAX"),
                (30, "30", "Veracruz de Ignacio de la Llave", "VER"),
                (31, "31", "Yucatán", "YUC"),
                (32, "32", "Zacatecas", "ZAC"),
            ]
            for id_, clave, nombre, abrev in entidades:
                db.add(EntidadFederativa(id=id_, clave=clave, nombre=nombre, abreviatura=abrev))
            db.commit()

        # Seed default admin user if empty
        if db.query(User).count() == 0:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            admin = User(
                nombre="admin",
                email="admin@profepa.gob.mx",
                password_hash=pwd_context.hash("admin2026"),
                descripcion="Administrador del Sistema",
                siglas="ADMIN",
                rol=UserRole.SUPERADMIN,
                activo=True,
            )
            db.add(admin)
            db.commit()

        # Seed sample POA indicators if empty
        if db.query(IndicadorPOA).count() == 0:
            sample_indicators = [
                ("SPA.01", "Porcentaje de Certificados y Reconocimientos Ambientales Emitidos", "SPA", "Porcentaje"),
                ("SPA.07", "Acciones de Promoción (Jornadas por la certificación, Salas informativas, Visitas personalizadas de promoción)", "SPA", "Número"),
                ("SPA.08", "Porcentaje de Empresas e instituciones que participaron en eventos de capacitación en materia de prevención ambiental", "SPA", "Porcentaje"),
                ("SIVI.01", "Porcentaje de visitas de verificación con cumplimiento de las medidas dictadas", "SIVI", "Porcentaje"),
                ("SIVI.02", "Acciones de inspección y vigilancia industrial realizadas", "SIVI", "Número"),
                ("SRN.01", "Porcentaje de Áreas Naturales Protegidas con acciones de inspección", "SRN", "Porcentaje"),
                ("SRN.02", "Porcentaje de municipios y alcaldías con acciones de inspección en materia de recursos naturales", "SRN", "Porcentaje"),
                ("SLEJA.01", "Porcentaje de resoluciones emitidas a los recursos de revisión", "SLEJA", "Porcentaje"),
                ("SLEJA.02", "Porcentaje de denuncias populares en materia ambiental concluidas", "SLEJA", "Porcentaje"),
                ("CORPAGT.01", "Acciones de inspección realizadas por las ORPAs", "CORPAGT", "Número"),
            ]
            for clave, nombre, area_id, unidad in sample_indicators:
                db.add(IndicadorPOA(
                    clave=clave,
                    nombre=nombre,
                    area_id=area_id,
                    unidad_medida=unidad,
                ))
            db.commit()

    finally:
        db.close()
