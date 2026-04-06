from sqlalchemy.orm import Session

from app.models.proveedor import Proveedor
from app.schemas.proveedor import ProveedorCreate, ProveedorUpdate


class ProveedorCRUD:
    def get_all(self, db: Session, skip: int = 0, limit: int = 100, solo_activos: bool = True):
        q = db.query(Proveedor)
        if solo_activos:
            q = q.filter(Proveedor.activo == True)
        return q.offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, proveedor_id: int):
        return db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()

    def get_by_rif(self, db: Session, rif: str):
        return db.query(Proveedor).filter(Proveedor.rif == rif).first()

    def create(self, db: Session, data: ProveedorCreate):
        obj = Proveedor(**data.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, proveedor_id: int, data: ProveedorUpdate):
        obj = self.get_by_id(db, proveedor_id)
        if not obj:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, proveedor_id: int):
        obj = self.get_by_id(db, proveedor_id)
        if not obj:
            return None
        obj.activo = False
        db.commit()
        return obj


proveedor_crud = ProveedorCRUD()
