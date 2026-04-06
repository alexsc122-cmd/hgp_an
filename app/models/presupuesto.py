from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Presupuesto(Base):
    __tablename__ = "presupuestos"
    __table_args__ = (UniqueConstraint("anio", "mes", name="uq_presupuesto_anio_mes"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    anio: Mapped[int] = mapped_column(Integer, nullable=False)
    # mes=None significa presupuesto anual; 1-12 para presupuesto mensual
    mes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    descripcion: Mapped[str | None] = mapped_column(String(500))
    monto_asignado: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    ordenes_compra: Mapped[list["OrdenCompra"]] = relationship(back_populates="presupuesto")
