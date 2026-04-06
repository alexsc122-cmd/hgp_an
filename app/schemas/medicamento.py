from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class MedicamentoBase(BaseModel):
    codigo: str = Field(..., max_length=50, examples=["MED-001"])
    nombre: str = Field(..., max_length=200, examples=["Paracetamol 500mg"])
    descripcion: str | None = None
    unidad_medida: str = Field(..., max_length=50, examples=["caja x 100 tab"])
    precio_referencia: Decimal | None = Field(None, ge=0, decimal_places=2)


class MedicamentoCreate(MedicamentoBase):
    pass


class MedicamentoUpdate(BaseModel):
    nombre: str | None = Field(None, max_length=200)
    descripcion: str | None = None
    unidad_medida: str | None = Field(None, max_length=50)
    precio_referencia: Decimal | None = Field(None, ge=0, decimal_places=2)
    activo: bool | None = None


class MedicamentoOut(MedicamentoBase):
    id: int
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
