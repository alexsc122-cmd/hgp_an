from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud.presupuestos import presupuesto_crud
from app.database import get_db
from app.schemas.presupuesto import (
    EjecucionPresupuestaria,
    PresupuestoCreate,
    PresupuestoOut,
    PresupuestoUpdate,
)

router = APIRouter(prefix="/presupuestos", tags=["Presupuestos"])


@router.get("", response_model=list[PresupuestoOut])
def listar_presupuestos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    solo_activos: bool = Query(True),
    db: Session = Depends(get_db),
):
    return presupuesto_crud.get_all(db, skip=skip, limit=limit, solo_activos=solo_activos)


@router.post("", response_model=PresupuestoOut, status_code=status.HTTP_201_CREATED)
def crear_presupuesto(data: PresupuestoCreate, db: Session = Depends(get_db)):
    return presupuesto_crud.create(db, data)


@router.get("/{presupuesto_id}", response_model=PresupuestoOut)
def obtener_presupuesto(presupuesto_id: int, db: Session = Depends(get_db)):
    obj = presupuesto_crud.get_by_id(db, presupuesto_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado")
    return obj


@router.get("/{presupuesto_id}/ejecucion", response_model=EjecucionPresupuestaria)
def obtener_ejecucion(presupuesto_id: int, db: Session = Depends(get_db)):
    """
    Retorna el resumen de ejecución presupuestaria:
    - **monto_asignado**: total asignado al presupuesto
    - **monto_comprometido**: suma de órdenes en estado BORRADOR, APROBADA o EN_PROCESO
    - **monto_ejecutado**: suma de órdenes ENTREGADAS
    - **monto_disponible**: asignado - comprometido - ejecutado
    - **porcentaje_ejecutado** y **porcentaje_comprometido**
    """
    resultado = presupuesto_crud.get_ejecucion(db, presupuesto_id)
    if not resultado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado")
    return resultado


@router.put("/{presupuesto_id}", response_model=PresupuestoOut)
def actualizar_presupuesto(
    presupuesto_id: int, data: PresupuestoUpdate, db: Session = Depends(get_db)
):
    obj = presupuesto_crud.update(db, presupuesto_id, data)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado")
    return obj


@router.delete("/{presupuesto_id}", response_model=PresupuestoOut)
def desactivar_presupuesto(presupuesto_id: int, db: Session = Depends(get_db)):
    obj = presupuesto_crud.delete(db, presupuesto_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado")
    return obj
