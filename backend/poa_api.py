"""
Backend FastAPI for POA 2026 indicator capture system.
Authentication, CRUD operations, and reporting endpoints.
"""
from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from passlib.context import CryptContext
import jwt
import os

from database import (
    get_db, init_db, User, Area, EntidadFederativa,
    IndicadorPOA, Meta, Bitacora, UserRole
)

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "profepa-poa-2026-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/poa/auth/login")

app = FastAPI(
    title="API Sistema de Captura POA 2026 - PROFEPA",
    description="Sistema de registro y monitoreo de metas POA 2026",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== Pydantic Schemas =====

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    nombre: str
    email: str
    password: str
    descripcion: Optional[str] = None
    siglas: Optional[str] = None
    area_id: Optional[str] = None
    entidad_id: Optional[int] = None
    rol: str = "ORPA"
    activo: bool = True

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    descripcion: Optional[str] = None
    siglas: Optional[str] = None
    area_id: Optional[str] = None
    entidad_id: Optional[int] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    nombre: str
    email: str
    descripcion: Optional[str]
    siglas: Optional[str]
    area_id: Optional[str]
    area_nombre: Optional[str] = None
    entidad_id: Optional[int]
    entidad_nombre: Optional[str] = None
    rol: str
    activo: bool

class IndicadorCreate(BaseModel):
    clave: str
    nombre: str
    area_id: str
    unidad_medida: Optional[str] = None
    metodo_calculo: Optional[str] = None
    definicion: Optional[str] = None
    nivel: Optional[str] = None

class IndicadorResponse(BaseModel):
    id: int
    clave: str
    nombre: str
    area_id: str
    area_nombre: Optional[str] = None
    unidad_medida: Optional[str]
    metodo_calculo: Optional[str]
    definicion: Optional[str]
    nivel: Optional[str]
    activo: bool

class MetaCreate(BaseModel):
    indicador_id: int
    entidad_id: int
    mes: int
    anio: int = 2026
    valor_planeado: Optional[float] = None

class MetaUpdate(BaseModel):
    valor_planeado: Optional[float] = None
    valor_real: Optional[float] = None

class MetaResponse(BaseModel):
    id: int
    indicador_id: int
    indicador_clave: Optional[str] = None
    indicador_nombre: Optional[str] = None
    entidad_id: int
    entidad_nombre: Optional[str] = None
    mes: int
    anio: int
    valor_planeado: Optional[float]
    valor_real: Optional[float]

class BitacoraResponse(BaseModel):
    id: int
    usuario_nombre: Optional[str] = None
    usuario_id: int
    operacion: str
    meta_id: Optional[int]
    detalles: Optional[str]
    created_at: str

class AreaResponse(BaseModel):
    id: str
    nombre: str
    siglas: str

class EntidadResponse(BaseModel):
    id: int
    clave: str
    nombre: str
    abreviatura: str


# ===== Auth helpers =====

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.activo:
        raise credentials_exception
    return user

def require_role(*roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.rol not in [r.value for r in roles]:
            raise HTTPException(status_code=403, detail="Permisos insuficientes")
        return current_user
    return role_checker


# ===== Startup =====

@app.on_event("startup")
async def startup_event():
    init_db()


# ===== Auth Endpoints =====

@app.post("/api/poa/auth/login", response_model=Token)
async def login(form_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "rol": user.rol.value if isinstance(user.rol, UserRole) else user.rol,
            "area_id": user.area_id,
            "entidad_id": user.entidad_id,
            "descripcion": user.descripcion,
            "siglas": user.siglas,
        }
    }

@app.get("/api/poa/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        nombre=current_user.nombre,
        email=current_user.email,
        descripcion=current_user.descripcion,
        siglas=current_user.siglas,
        area_id=current_user.area_id,
        area_nombre=current_user.area.nombre if current_user.area else None,
        entidad_id=current_user.entidad_id,
        entidad_nombre=current_user.entidad.nombre if current_user.entidad else None,
        rol=current_user.rol.value if isinstance(current_user.rol, UserRole) else current_user.rol,
        activo=current_user.activo,
    )


# ===== Catalog Endpoints (Areas, Entidades) =====

@app.get("/api/poa/areas", response_model=List[AreaResponse])
async def list_areas(db: Session = Depends(get_db)):
    return db.query(Area).all()

@app.get("/api/poa/entidades", response_model=List[EntidadResponse])
async def list_entidades(db: Session = Depends(get_db)):
    return db.query(EntidadFederativa).order_by(EntidadFederativa.id).all()


# ===== Indicador POA Endpoints =====

@app.get("/api/poa/indicadores", response_model=List[IndicadorResponse])
async def list_indicadores_poa(
    area_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(IndicadorPOA).filter(IndicadorPOA.activo == True)
    if area_id:
        query = query.filter(IndicadorPOA.area_id == area_id)
    indicadores = query.order_by(IndicadorPOA.clave).all()
    return [
        IndicadorResponse(
            id=i.id,
            clave=i.clave,
            nombre=i.nombre,
            area_id=i.area_id,
            area_nombre=i.area.nombre if i.area else None,
            unidad_medida=i.unidad_medida,
            metodo_calculo=i.metodo_calculo,
            definicion=i.definicion,
            nivel=i.nivel,
            activo=i.activo,
        )
        for i in indicadores
    ]

@app.post("/api/poa/indicadores", response_model=IndicadorResponse)
async def create_indicador(
    data: IndicadorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERADMIN, UserRole.ADMIN)),
):
    existing = db.query(IndicadorPOA).filter(IndicadorPOA.clave == data.clave).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un indicador con esa clave")

    indicador = IndicadorPOA(**data.dict())
    db.add(indicador)
    db.commit()
    db.refresh(indicador)
    return IndicadorResponse(
        id=indicador.id,
        clave=indicador.clave,
        nombre=indicador.nombre,
        area_id=indicador.area_id,
        area_nombre=indicador.area.nombre if indicador.area else None,
        unidad_medida=indicador.unidad_medida,
        metodo_calculo=indicador.metodo_calculo,
        definicion=indicador.definicion,
        nivel=indicador.nivel,
        activo=indicador.activo,
    )

@app.put("/api/poa/indicadores/{indicador_id}", response_model=IndicadorResponse)
async def update_indicador(
    indicador_id: int,
    data: IndicadorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERADMIN, UserRole.ADMIN)),
):
    indicador = db.query(IndicadorPOA).filter(IndicadorPOA.id == indicador_id).first()
    if not indicador:
        raise HTTPException(status_code=404, detail="Indicador no encontrado")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(indicador, field, value)
    db.commit()
    db.refresh(indicador)
    return IndicadorResponse(
        id=indicador.id,
        clave=indicador.clave,
        nombre=indicador.nombre,
        area_id=indicador.area_id,
        area_nombre=indicador.area.nombre if indicador.area else None,
        unidad_medida=indicador.unidad_medida,
        metodo_calculo=indicador.metodo_calculo,
        definicion=indicador.definicion,
        nivel=indicador.nivel,
        activo=indicador.activo,
    )


# ===== Meta (Progress) Endpoints =====

@app.post("/api/poa/metas", response_model=MetaResponse)
async def create_meta(
    data: MetaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.mes < 1 or data.mes > 12:
        raise HTTPException(status_code=400, detail="Mes inválido (1-12)")

    existing = db.query(Meta).filter(
        Meta.indicador_id == data.indicador_id,
        Meta.entidad_id == data.entidad_id,
        Meta.mes == data.mes,
        Meta.anio == data.anio,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un registro para este indicador/entidad/mes")

    meta = Meta(
        indicador_id=data.indicador_id,
        entidad_id=data.entidad_id,
        mes=data.mes,
        anio=data.anio,
        valor_planeado=data.valor_planeado,
        usuario_id=current_user.id,
    )
    db.add(meta)
    db.commit()
    db.refresh(meta)

    # Log to bitacora
    db.add(Bitacora(
        usuario_id=current_user.id,
        operacion="REGISTRO",
        meta_id=meta.id,
        detalles=f"Registro de meta: indicador={meta.indicador.clave}, entidad={meta.entidad.nombre}, mes={meta.mes}, planeado={meta.valor_planeado}",
    ))
    db.commit()

    return MetaResponse(
        id=meta.id,
        indicador_id=meta.indicador_id,
        indicador_clave=meta.indicador.clave,
        indicador_nombre=meta.indicador.nombre,
        entidad_id=meta.entidad_id,
        entidad_nombre=meta.entidad.nombre,
        mes=meta.mes,
        anio=meta.anio,
        valor_planeado=meta.valor_planeado,
        valor_real=meta.valor_real,
    )

@app.put("/api/poa/metas/{meta_id}", response_model=MetaResponse)
async def update_meta(
    meta_id: int,
    data: MetaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meta = db.query(Meta).filter(Meta.id == meta_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    old_planeado = meta.valor_planeado
    old_real = meta.valor_real

    if data.valor_planeado is not None:
        meta.valor_planeado = data.valor_planeado
    if data.valor_real is not None:
        meta.valor_real = data.valor_real
    meta.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(meta)

    db.add(Bitacora(
        usuario_id=current_user.id,
        operacion="EDICION",
        meta_id=meta.id,
        detalles=f"Edición: indicador={meta.indicador.clave}, entidad={meta.entidad.nombre}, mes={meta.mes}. Planeado: {old_planeado}→{meta.valor_planeado}, Real: {old_real}→{meta.valor_real}",
    ))
    db.commit()

    return MetaResponse(
        id=meta.id,
        indicador_id=meta.indicador_id,
        indicador_clave=meta.indicador.clave,
        indicador_nombre=meta.indicador.nombre,
        entidad_id=meta.entidad_id,
        entidad_nombre=meta.entidad.nombre,
        mes=meta.mes,
        anio=meta.anio,
        valor_planeado=meta.valor_planeado,
        valor_real=meta.valor_real,
    )

@app.delete("/api/poa/metas/{meta_id}")
async def delete_meta(
    meta_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERADMIN, UserRole.ADMIN)),
):
    meta = db.query(Meta).filter(Meta.id == meta_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    db.add(Bitacora(
        usuario_id=current_user.id,
        operacion="ELIMINACION",
        meta_id=meta.id,
        detalles=f"Eliminación: indicador={meta.indicador.clave}, entidad={meta.entidad.nombre}, mes={meta.mes}",
    ))
    db.delete(meta)
    db.commit()
    return {"message": "Meta eliminada"}

@app.get("/api/poa/metas", response_model=List[MetaResponse])
async def list_metas(
    indicador_id: Optional[int] = None,
    entidad_id: Optional[int] = None,
    area_id: Optional[str] = None,
    mes: Optional[int] = None,
    anio: int = 2026,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Meta).filter(Meta.anio == anio)
    if indicador_id:
        query = query.filter(Meta.indicador_id == indicador_id)
    if entidad_id:
        query = query.filter(Meta.entidad_id == entidad_id)
    if area_id:
        query = query.join(IndicadorPOA).filter(IndicadorPOA.area_id == area_id)
    if mes:
        query = query.filter(Meta.mes == mes)

    metas = query.all()
    return [
        MetaResponse(
            id=m.id,
            indicador_id=m.indicador_id,
            indicador_clave=m.indicador.clave,
            indicador_nombre=m.indicador.nombre,
            entidad_id=m.entidad_id,
            entidad_nombre=m.entidad.nombre,
            mes=m.mes,
            anio=m.anio,
            valor_planeado=m.valor_planeado,
            valor_real=m.valor_real,
        )
        for m in metas
    ]


# ===== Report Endpoints =====

@app.get("/api/poa/reporte")
async def get_reporte(
    entidad_id: Optional[int] = None,
    area_id: Optional[str] = None,
    anio: int = 2026,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get report data grouped by area → indicator → entity with monthly values."""
    areas = db.query(Area).all()
    result = []

    for area in areas:
        if area_id and area.id != area_id:
            continue

        indicadores = db.query(IndicadorPOA).filter(
            IndicadorPOA.area_id == area.id,
            IndicadorPOA.activo == True,
        ).order_by(IndicadorPOA.clave).all()

        area_data = {
            "area_id": area.id,
            "area_nombre": area.nombre,
            "indicadores": [],
        }

        for ind in indicadores:
            query = db.query(Meta).filter(
                Meta.indicador_id == ind.id,
                Meta.anio == anio,
            )
            if entidad_id:
                query = query.filter(Meta.entidad_id == entidad_id)

            metas = query.all()

            # Group by entity
            by_entity: Dict[int, Dict] = {}
            for m in metas:
                if m.entidad_id not in by_entity:
                    by_entity[m.entidad_id] = {
                        "entidad_id": m.entidad_id,
                        "entidad_nombre": m.entidad.nombre,
                        "meses": {},
                    }
                by_entity[m.entidad_id]["meses"][m.mes] = {
                    "id": m.id,
                    "valor_planeado": m.valor_planeado,
                    "valor_real": m.valor_real,
                }

            area_data["indicadores"].append({
                "id": ind.id,
                "clave": ind.clave,
                "nombre": ind.nombre,
                "unidad_medida": ind.unidad_medida,
                "entidades": list(by_entity.values()),
            })

        if area_data["indicadores"]:
            result.append(area_data)

    return result


# ===== Dashboard Endpoints =====

@app.get("/api/poa/dashboard")
async def get_dashboard(
    area_id: Optional[str] = None,
    indicador_ids: Optional[str] = None,
    entidad_ids: Optional[str] = None,
    anio: int = 2026,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dashboard consolidated view with filters."""
    query = db.query(Meta).filter(Meta.anio == anio)

    if area_id:
        query = query.join(IndicadorPOA).filter(IndicadorPOA.area_id == area_id)

    if indicador_ids:
        ids = [int(x) for x in indicador_ids.split(",") if x.strip()]
        query = query.filter(Meta.indicador_id.in_(ids))

    if entidad_ids:
        ids = [int(x) for x in entidad_ids.split(",") if x.strip()]
        query = query.filter(Meta.entidad_id.in_(ids))

    metas = query.all()

    # Aggregate by indicator
    by_indicator: Dict[int, Dict] = {}
    for m in metas:
        if m.indicador_id not in by_indicator:
            by_indicator[m.indicador_id] = {
                "indicador_id": m.indicador_id,
                "clave": m.indicador.clave,
                "nombre": m.indicador.nombre,
                "area": m.indicador.area.nombre if m.indicador.area else None,
                "unidad_medida": m.indicador.unidad_medida,
                "meses": {},
                "total_planeado": 0,
                "total_real": 0,
            }
        key = m.mes
        if key not in by_indicator[m.indicador_id]["meses"]:
            by_indicator[m.indicador_id]["meses"][key] = {
                "planeado": 0,
                "real": 0,
                "count": 0,
            }
        if m.valor_planeado:
            by_indicator[m.indicador_id]["meses"][key]["planeado"] += m.valor_planeado
            by_indicator[m.indicador_id]["total_planeado"] += m.valor_planeado
        if m.valor_real:
            by_indicator[m.indicador_id]["meses"][key]["real"] += m.valor_real
            by_indicator[m.indicador_id]["total_real"] += m.valor_real
        by_indicator[m.indicador_id]["meses"][key]["count"] += 1

    return list(by_indicator.values())


# ===== User Management Endpoints =====

@app.get("/api/poa/usuarios", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERADMIN, UserRole.ADMIN)),
):
    users = db.query(User).order_by(User.id).all()
    return [
        UserResponse(
            id=u.id,
            nombre=u.nombre,
            email=u.email,
            descripcion=u.descripcion,
            siglas=u.siglas,
            area_id=u.area_id,
            area_nombre=u.area.nombre if u.area else None,
            entidad_id=u.entidad_id,
            entidad_nombre=u.entidad.nombre if u.entidad else None,
            rol=u.rol.value if isinstance(u.rol, UserRole) else u.rol,
            activo=u.activo,
        )
        for u in users
    ]

@app.post("/api/poa/usuarios", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERADMIN, UserRole.ADMIN)),
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")

    user = User(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password),
        descripcion=data.descripcion,
        siglas=data.siglas,
        area_id=data.area_id,
        entidad_id=data.entidad_id,
        rol=UserRole(data.rol),
        activo=data.activo,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id,
        nombre=user.nombre,
        email=user.email,
        descripcion=user.descripcion,
        siglas=user.siglas,
        area_id=user.area_id,
        area_nombre=user.area.nombre if user.area else None,
        entidad_id=user.entidad_id,
        entidad_nombre=user.entidad.nombre if user.entidad else None,
        rol=user.rol.value if isinstance(user.rol, UserRole) else user.rol,
        activo=user.activo,
    )

@app.put("/api/poa/usuarios/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERADMIN, UserRole.ADMIN)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if data.nombre is not None:
        user.nombre = data.nombre
    if data.email is not None:
        user.email = data.email
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    if data.descripcion is not None:
        user.descripcion = data.descripcion
    if data.siglas is not None:
        user.siglas = data.siglas
    if data.area_id is not None:
        user.area_id = data.area_id
    if data.entidad_id is not None:
        user.entidad_id = data.entidad_id
    if data.rol is not None:
        user.rol = UserRole(data.rol)
    if data.activo is not None:
        user.activo = data.activo

    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id,
        nombre=user.nombre,
        email=user.email,
        descripcion=user.descripcion,
        siglas=user.siglas,
        area_id=user.area_id,
        area_nombre=user.area.nombre if user.area else None,
        entidad_id=user.entidad_id,
        entidad_nombre=user.entidad.nombre if user.entidad else None,
        rol=user.rol.value if isinstance(user.rol, UserRole) else user.rol,
        activo=user.activo,
    )


# ===== Bitacora Endpoints =====

@app.get("/api/poa/bitacora", response_model=List[BitacoraResponse])
async def list_bitacora(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERADMIN, UserRole.ADMIN)),
):
    total = db.query(Bitacora).count()
    bitacoras = (
        db.query(Bitacora)
        .order_by(Bitacora.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [
        BitacoraResponse(
            id=b.id,
            usuario_nombre=b.usuario.nombre if b.usuario else None,
            usuario_id=b.usuario_id,
            operacion=b.operacion,
            meta_id=b.meta_id,
            detalles=b.detalles,
            created_at=b.created_at.isoformat() if b.created_at else "",
        )
        for b in bitacoras
    ]


# ===== Export Endpoints =====

@app.get("/api/poa/export/reporte")
async def export_reporte(
    entidad_id: Optional[int] = None,
    area_id: Optional[str] = None,
    anio: int = 2026,
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export report data as CSV."""
    import csv
    import io
    from fastapi.responses import StreamingResponse

    query = db.query(Meta).filter(Meta.anio == anio)
    if area_id:
        query = query.join(IndicadorPOA).filter(IndicadorPOA.area_id == area_id)
    if entidad_id:
        query = query.filter(Meta.entidad_id == entidad_id)

    metas = query.order_by(Meta.indicador_id, Meta.entidad_id, Meta.mes).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Indicador Clave", "Indicador Nombre", "Área",
        "Entidad", "Mes", "Año",
        "Valor Planeado", "Valor Real"
    ])
    for m in metas:
        writer.writerow([
            m.indicador.clave,
            m.indicador.nombre,
            m.indicador.area.nombre if m.indicador.area else "",
            m.entidad.nombre,
            m.mes,
            m.anio,
            m.valor_planeado or "",
            m.valor_real or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=reporte_poa_{anio}.csv"},
    )
