from sqlalchemy.orm import Session

from app.models.medicamento import Medicamento
from app.schemas.medicamento import MedicamentoCreate, MedicamentoUpdate


class MedicamentoCRUD:
    def get_all(self, db: Session, skip: int = 0, limit: int = 100, solo_activos: bool = True):
        q = db.query(Medicamento)
        if solo_activos:
            q = q.filter(Medicamento.activo == True)
        return q.offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, medicamento_id: int):
        return db.query(Medicamento).filter(Medicamento.id == medicamento_id).first()

    def get_by_codigo(self, db: Session, codigo: str):
        return db.query(Medicamento).filter(Medicamento.codigo == codigo).first()

    def create(self, db: Session, data: MedicamentoCreate):
        obj = Medicamento(**data.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, medicamento_id: int, data: MedicamentoUpdate):
        obj = self.get_by_id(db, medicamento_id)
        if not obj:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, medicamento_id: int):
        obj = self.get_by_id(db, medicamento_id)
        if not obj:
            return None
        obj.activo = False
        db.commit()
        return obj


medicamento_crud = MedicamentoCRUD()
