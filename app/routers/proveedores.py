from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud.proveedores import proveedor_crud
from app.database import get_db
from app.schemas.proveedor import ProveedorCreate, ProveedorOut, ProveedorUpdate

router = APIRouter(prefix="/proveedores", tags=["Proveedores"])


@router.get("", response_model=list[ProveedorOut])
def listar_proveedores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    solo_activos: bool = Query(True),
    db: Session = Depends(get_db),
):
    return proveedor_crud.get_all(db, skip=skip, limit=limit, solo_activos=solo_activos)


@router.post("", response_model=ProveedorOut, status_code=status.HTTP_201_CREATED)
def crear_proveedor(data: ProveedorCreate, db: Session = Depends(get_db)):
    if proveedor_crud.get_by_rif(db, data.rif):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un proveedor con el RIF '{data.rif}'",
        )
    return proveedor_crud.create(db, data)


@router.get("/{proveedor_id}", response_model=ProveedorOut)
def obtener_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    obj = proveedor_crud.get_by_id(db, proveedor_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado")
    return obj


@router.put("/{proveedor_id}", response_model=ProveedorOut)
def actualizar_proveedor(proveedor_id: int, data: ProveedorUpdate, db: Session = Depends(get_db)):
    obj = proveedor_crud.update(db, proveedor_id, data)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado")
    return obj


@router.delete("/{proveedor_id}", response_model=ProveedorOut)
def desactivar_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    obj = proveedor_crud.delete(db, proveedor_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado")
    return obj
