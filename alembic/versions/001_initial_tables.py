"""Creación inicial de tablas

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "medicamentos",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("unidad_medida", sa.String(50), nullable=False),
        sa.Column("precio_referencia", sa.Numeric(15, 2), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()"), onupdate=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo"),
    )
    op.create_index("ix_medicamentos_id", "medicamentos", ["id"])
    op.create_index("ix_medicamentos_codigo", "medicamentos", ["codigo"])

    op.create_table(
        "proveedores",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("rif", sa.String(20), nullable=False),
        sa.Column("direccion", sa.Text(), nullable=True),
        sa.Column("telefono", sa.String(20), nullable=True),
        sa.Column("email", sa.String(100), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()"), onupdate=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("rif"),
    )
    op.create_index("ix_proveedores_id", "proveedores", ["id"])
    op.create_index("ix_proveedores_rif", "proveedores", ["rif"])

    op.create_table(
        "presupuestos",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("anio", sa.Integer(), nullable=False),
        sa.Column("mes", sa.Integer(), nullable=True),
        sa.Column("descripcion", sa.String(500), nullable=True),
        sa.Column("monto_asignado", sa.Numeric(20, 2), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()"), onupdate=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("anio", "mes", name="uq_presupuesto_anio_mes"),
    )
    op.create_index("ix_presupuestos_id", "presupuestos", ["id"])

    op.create_table(
        "ordenes_compra",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("numero_orden", sa.String(50), nullable=False),
        sa.Column("presupuesto_id", sa.Integer(), nullable=False),
        sa.Column("proveedor_id", sa.Integer(), nullable=False),
        sa.Column("fecha_orden", sa.Date(), nullable=False),
        sa.Column("fecha_entrega_esperada", sa.Date(), nullable=True),
        sa.Column("fecha_entrega_real", sa.Date(), nullable=True),
        sa.Column("estado", sa.String(20), nullable=False, server_default="BORRADOR"),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()"), onupdate=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["presupuesto_id"], ["presupuestos.id"]),
        sa.ForeignKeyConstraint(["proveedor_id"], ["proveedores.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("numero_orden"),
    )
    op.create_index("ix_ordenes_compra_id", "ordenes_compra", ["id"])
    op.create_index("ix_ordenes_compra_numero_orden", "ordenes_compra", ["numero_orden"])

    op.create_table(
        "orden_compra_items",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("orden_compra_id", sa.Integer(), nullable=False),
        sa.Column("medicamento_id", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Numeric(15, 3), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(15, 2), nullable=False),
        sa.Column("subtotal", sa.Numeric(20, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()"), onupdate=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["orden_compra_id"], ["ordenes_compra.id"]),
        sa.ForeignKeyConstraint(["medicamento_id"], ["medicamentos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_orden_compra_items_id", "orden_compra_items", ["id"])


def downgrade() -> None:
    op.drop_table("orden_compra_items")
    op.drop_table("ordenes_compra")
    op.drop_table("presupuestos")
    op.drop_table("proveedores")
    op.drop_table("medicamentos")
