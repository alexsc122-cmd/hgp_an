from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud.medicamentos import medicamento_crud
from app.database import get_db
from app.schemas.medicamento import MedicamentoCreate, MedicamentoOut, MedicamentoUpdate

router = APIRouter(prefix="/medicamentos", tags=["Medicamentos"])


@router.get("", response_model=list[MedicamentoOut])
def listar_medicamentos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    solo_activos: bool = Query(True),
    db: Session = Depends(get_db),
):
    return medicamento_crud.get_all(db, skip=skip, limit=limit, solo_activos=solo_activos)


@router.post("", response_model=MedicamentoOut, status_code=status.HTTP_201_CREATED)
def crear_medicamento(data: MedicamentoCreate, db: Session = Depends(get_db)):
    if medicamento_crud.get_by_codigo(db, data.codigo):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un medicamento con el código '{data.codigo}'",
        )
    return medicamento_crud.create(db, data)


@router.get("/{medicamento_id}", response_model=MedicamentoOut)
def obtener_medicamento(medicamento_id: int, db: Session = Depends(get_db)):
    obj = medicamento_crud.get_by_id(db, medicamento_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicamento no encontrado")
    return obj


@router.put("/{medicamento_id}", response_model=MedicamentoOut)
def actualizar_medicamento(
    medicamento_id: int, data: MedicamentoUpdate, db: Session = Depends(get_db)
):
    obj = medicamento_crud.update(db, medicamento_id, data)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicamento no encontrado")
    return obj


@router.delete("/{medicamento_id}", response_model=MedicamentoOut)
def desactivar_medicamento(medicamento_id: int, db: Session = Depends(get_db)):
    obj = medicamento_crud.delete(db, medicamento_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicamento no encontrado")
    return obj
