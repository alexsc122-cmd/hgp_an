from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import medicamentos, proveedores, presupuestos, ordenes_compra

app = FastAPI(
    title="API Ejecución Presupuestaria - Medicamentos",
    description=(
        "API para el control de la ejecución presupuestaria de la asignación a medicamentos. "
        "Permite gestionar el presupuesto asignado, las órdenes de compra, "
        "el catálogo de medicamentos y los proveedores."
    ),
    version="1.0.0",
    contact={"name": "HGP - Área de Administración"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(medicamentos.router)
app.include_router(proveedores.router)
app.include_router(presupuestos.router)
app.include_router(ordenes_compra.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "mensaje": "API Ejecución Presupuestaria en línea"}
