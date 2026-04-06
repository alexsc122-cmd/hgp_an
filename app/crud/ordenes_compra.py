from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.models.orden_compra import EstadoOrden, OrdenCompra, OrdenCompraItem
from app.schemas.orden_compra import OrdenCompraCreate, OrdenCompraEstadoUpdate, OrdenCompraUpdate


class OrdenCompraCRUD:
    def _base_query(self, db: Session):
        return db.query(OrdenCompra).options(
            joinedload(OrdenCompra.items),
            joinedload(OrdenCompra.proveedor),
            joinedload(OrdenCompra.presupuesto),
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        presupuesto_id: int | None = None,
        estado: str | None = None,
    ):
        q = self._base_query(db)
        if presupuesto_id:
            q = q.filter(OrdenCompra.presupuesto_id == presupuesto_id)
        if estado:
            q = q.filter(OrdenCompra.estado == estado)
        return q.offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, orden_id: int):
        return self._base_query(db).filter(OrdenCompra.id == orden_id).first()

    def get_by_numero(self, db: Session, numero_orden: str):
        return db.query(OrdenCompra).filter(OrdenCompra.numero_orden == numero_orden).first()

    def create(self, db: Session, data: OrdenCompraCreate):
        items_data = data.items
        orden_data = data.model_dump(exclude={"items"})
        orden = OrdenCompra(**orden_data)
        db.add(orden)
        db.flush()  # obtener el id antes del commit

        for item_data in items_data:
            subtotal = Decimal(str(item_data.cantidad)) * Decimal(str(item_data.precio_unitario))
            item = OrdenCompraItem(
                orden_compra_id=orden.id,
                medicamento_id=item_data.medicamento_id,
                cantidad=item_data.cantidad,
                precio_unitario=item_data.precio_unitario,
                subtotal=subtotal,
            )
            db.add(item)

        db.commit()
        db.refresh(orden)
        return self.get_by_id(db, orden.id)

    def update(self, db: Session, orden_id: int, data: OrdenCompraUpdate):
        orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
        if not orden:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(orden, field, value)
        db.commit()
        return self.get_by_id(db, orden_id)

    def update_estado(self, db: Session, orden_id: int, data: OrdenCompraEstadoUpdate):
        orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
        if not orden:
            return None
        orden.estado = data.estado
        db.commit()
        return self.get_by_id(db, orden_id)

    def delete(self, db: Session, orden_id: int):
        orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
        if not orden:
            return None
        orden.estado = EstadoOrden.CANCELADA
        db.commit()
        return self.get_by_id(db, orden_id)


orden_compra_crud = OrdenCompraCRUD()
