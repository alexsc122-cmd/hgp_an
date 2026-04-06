from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud.ordenes_compra import orden_compra_crud
from app.database import get_db
from app.models.orden_compra import EstadoOrden
from app.schemas.orden_compra import (
    OrdenCompraCreate,
    OrdenCompraEstadoUpdate,
    OrdenCompraOut,
    OrdenCompraUpdate,
)

router = APIRouter(prefix="/ordenes-compra", tags=["Órdenes de Compra"])


@router.get("", response_model=list[OrdenCompraOut])
def listar_ordenes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    presupuesto_id: int | None = Query(None),
    estado: EstadoOrden | None = Query(None),
    db: Session = Depends(get_db),
):
    return orden_compra_crud.get_all(
        db, skip=skip, limit=limit, presupuesto_id=presupuesto_id, estado=estado
    )


@router.post("", response_model=OrdenCompraOut, status_code=status.HTTP_201_CREATED)
def crear_orden(data: OrdenCompraCreate, db: Session = Depends(get_db)):
    if orden_compra_crud.get_by_numero(db, data.numero_orden):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una orden con el número '{data.numero_orden}'",
        )
    return orden_compra_crud.create(db, data)


@router.get("/{orden_id}", response_model=OrdenCompraOut)
def obtener_orden(orden_id: int, db: Session = Depends(get_db)):
    obj = orden_compra_crud.get_by_id(db, orden_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de compra no encontrada")
    return obj


@router.put("/{orden_id}", response_model=OrdenCompraOut)
def actualizar_orden(orden_id: int, data: OrdenCompraUpdate, db: Session = Depends(get_db)):
    obj = orden_compra_crud.update(db, orden_id, data)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de compra no encontrada")
    return obj


@router.patch("/{orden_id}/estado", response_model=OrdenCompraOut)
def cambiar_estado(orden_id: int, data: OrdenCompraEstadoUpdate, db: Session = Depends(get_db)):
    obj = orden_compra_crud.get_by_id(db, orden_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de compra no encontrada")
    if obj.estado == EstadoOrden.CANCELADA:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se puede cambiar el estado de una orden cancelada",
        )
    return orden_compra_crud.update_estado(db, orden_id, data)


@router.delete("/{orden_id}", response_model=OrdenCompraOut)
def cancelar_orden(orden_id: int, db: Session = Depends(get_db)):
    obj = orden_compra_crud.get_by_id(db, orden_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de compra no encontrada")
    if obj.estado == EstadoOrden.ENTREGADA:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se puede cancelar una orden ya entregada",
        )
    return orden_compra_crud.delete(db, orden_id)
