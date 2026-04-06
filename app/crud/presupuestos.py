from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.orden_compra import EstadoOrden, OrdenCompra, OrdenCompraItem
from app.models.presupuesto import Presupuesto
from app.schemas.presupuesto import EjecucionPresupuestaria, PresupuestoCreate, PresupuestoUpdate


class PresupuestoCRUD:
    def get_all(self, db: Session, skip: int = 0, limit: int = 100, solo_activos: bool = True):
        q = db.query(Presupuesto)
        if solo_activos:
            q = q.filter(Presupuesto.activo == True)
        return q.offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, presupuesto_id: int):
        return db.query(Presupuesto).filter(Presupuesto.id == presupuesto_id).first()

    def create(self, db: Session, data: PresupuestoCreate):
        obj = Presupuesto(**data.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, presupuesto_id: int, data: PresupuestoUpdate):
        obj = self.get_by_id(db, presupuesto_id)
        if not obj:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, presupuesto_id: int):
        obj = self.get_by_id(db, presupuesto_id)
        if not obj:
            return None
        obj.activo = False
        db.commit()
        return obj

    def get_ejecucion(self, db: Session, presupuesto_id: int) -> EjecucionPresupuestaria | None:
        presupuesto = self.get_by_id(db, presupuesto_id)
        if not presupuesto:
            return None

        # Monto comprometido = suma de órdenes NO canceladas
        estados_activos = [
            EstadoOrden.BORRADOR,
            EstadoOrden.APROBADA,
            EstadoOrden.EN_PROCESO,
        ]
        comprometido = (
            db.query(func.coalesce(func.sum(OrdenCompraItem.subtotal), 0))
            .join(OrdenCompra, OrdenCompraItem.orden_compra_id == OrdenCompra.id)
            .filter(
                OrdenCompra.presupuesto_id == presupuesto_id,
                OrdenCompra.estado.in_(estados_activos),
            )
            .scalar()
        )

        # Monto ejecutado = suma de órdenes ENTREGADAS
        ejecutado = (
            db.query(func.coalesce(func.sum(OrdenCompraItem.subtotal), 0))
            .join(OrdenCompra, OrdenCompraItem.orden_compra_id == OrdenCompra.id)
            .filter(
                OrdenCompra.presupuesto_id == presupuesto_id,
                OrdenCompra.estado == EstadoOrden.ENTREGADA,
            )
            .scalar()
        )

        monto_asignado = Decimal(str(presupuesto.monto_asignado))
        monto_comprometido = Decimal(str(comprometido))
        monto_ejecutado = Decimal(str(ejecutado))
        monto_disponible = monto_asignado - monto_comprometido - monto_ejecutado

        pct_ejecutado = float(monto_ejecutado / monto_asignado * 100) if monto_asignado else 0.0
        pct_comprometido = float(monto_comprometido / monto_asignado * 100) if monto_asignado else 0.0

        return EjecucionPresupuestaria(
            presupuesto_id=presupuesto.id,
            anio=presupuesto.anio,
            mes=presupuesto.mes,
            descripcion=presupuesto.descripcion,
            monto_asignado=monto_asignado,
            monto_comprometido=monto_comprometido,
            monto_ejecutado=monto_ejecutado,
            monto_disponible=monto_disponible,
            porcentaje_ejecutado=round(pct_ejecutado, 2),
            porcentaje_comprometido=round(pct_comprometido, 2),
        )


presupuesto_crud = PresupuestoCRUD()
