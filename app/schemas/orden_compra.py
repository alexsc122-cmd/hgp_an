from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.orden_compra import EstadoOrden


class OrdenCompraItemBase(BaseModel):
    medicamento_id: int
    cantidad: Decimal = Field(..., gt=0, decimal_places=3)
    precio_unitario: Decimal = Field(..., gt=0, decimal_places=2)


class OrdenCompraItemCreate(OrdenCompraItemBase):
    pass


class OrdenCompraItemOut(OrdenCompraItemBase):
    id: int
    subtotal: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrdenCompraBase(BaseModel):
    numero_orden: str = Field(..., max_length=50, examples=["OC-2025-001"])
    presupuesto_id: int
    proveedor_id: int
    fecha_orden: date
    fecha_entrega_esperada: date | None = None
    observaciones: str | None = None


class OrdenCompraCreate(OrdenCompraBase):
    items: list[OrdenCompraItemCreate] = Field(..., min_length=1)


class OrdenCompraUpdate(BaseModel):
    fecha_entrega_esperada: date | None = None
    fecha_entrega_real: date | None = None
    observaciones: str | None = None


class OrdenCompraEstadoUpdate(BaseModel):
    estado: EstadoOrden


class OrdenCompraOut(OrdenCompraBase):
    id: int
    estado: EstadoOrden
    fecha_entrega_real: date | None
    total: Decimal
    items: list[OrdenCompraItemOut]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if hasattr(obj, "items"):
            total = sum(item.subtotal for item in obj.items)
            obj.__dict__["total"] = total
        return super().model_validate(obj, **kwargs)
