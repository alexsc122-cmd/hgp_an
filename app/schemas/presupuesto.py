from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator


class PresupuestoBase(BaseModel):
    anio: int = Field(..., ge=2000, le=2100, examples=[2025])
    mes: int | None = Field(None, ge=1, le=12, examples=[1])
    descripcion: str | None = Field(None, max_length=500)
    monto_asignado: Decimal = Field(..., gt=0, decimal_places=2, examples=[["500000.00"]])


class PresupuestoCreate(PresupuestoBase):
    pass


class PresupuestoUpdate(BaseModel):
    descripcion: str | None = Field(None, max_length=500)
    monto_asignado: Decimal | None = Field(None, gt=0, decimal_places=2)
    activo: bool | None = None


class PresupuestoOut(PresupuestoBase):
    id: int
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EjecucionPresupuestaria(BaseModel):
    presupuesto_id: int
    anio: int
    mes: int | None
    descripcion: str | None
    monto_asignado: Decimal
    monto_comprometido: Decimal
    monto_ejecutado: Decimal
    monto_disponible: Decimal
    porcentaje_ejecutado: float
    porcentaje_comprometido: float

    model_config = {"from_attributes": True}
