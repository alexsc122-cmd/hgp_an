from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EstadoOrden(str, Enum):
    BORRADOR = "BORRADOR"
    APROBADA = "APROBADA"
    EN_PROCESO = "EN_PROCESO"
    ENTREGADA = "ENTREGADA"
    CANCELADA = "CANCELADA"


class OrdenCompra(Base):
    __tablename__ = "ordenes_compra"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    numero_orden: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    presupuesto_id: Mapped[int] = mapped_column(ForeignKey("presupuestos.id"), nullable=False)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedores.id"), nullable=False)
    fecha_orden: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_entrega_esperada: Mapped[date | None] = mapped_column(Date)
    fecha_entrega_real: Mapped[date | None] = mapped_column(Date)
    estado: Mapped[str] = mapped_column(String(20), default=EstadoOrden.BORRADOR, nullable=False)
    observaciones: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    presupuesto: Mapped["Presupuesto"] = relationship(back_populates="ordenes_compra")
    proveedor: Mapped["Proveedor"] = relationship(back_populates="ordenes_compra")
    items: Mapped[list["OrdenCompraItem"]] = relationship(
        back_populates="orden_compra", cascade="all, delete-orphan"
    )


class OrdenCompraItem(Base):
    __tablename__ = "orden_compra_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    orden_compra_id: Mapped[int] = mapped_column(ForeignKey("ordenes_compra.id"), nullable=False)
    medicamento_id: Mapped[int] = mapped_column(ForeignKey("medicamentos.id"), nullable=False)
    cantidad: Mapped[float] = mapped_column(Numeric(15, 3), nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    orden_compra: Mapped["OrdenCompra"] = relationship(back_populates="items")
    medicamento: Mapped["Medicamento"] = relationship(back_populates="items_orden")
