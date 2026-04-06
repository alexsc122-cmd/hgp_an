from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class ProveedorBase(BaseModel):
    nombre: str = Field(..., max_length=200, examples=["Distribuidora Farma C.A."])
    rif: str = Field(..., max_length=20, examples=["J-12345678-9"])
    direccion: str | None = None
    telefono: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=100)


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: str | None = Field(None, max_length=200)
    direccion: str | None = None
    telefono: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=100)
    activo: bool | None = None


class ProveedorOut(ProveedorBase):
    id: int
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
