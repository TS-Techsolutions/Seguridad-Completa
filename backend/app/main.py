from __future__ import annotations

import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .store import ROOT, connection, initialize

COMPANY_ID = "cmp-demo-ecuador"
CONTRACTS = ROOT / "contracts"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@lru_cache(maxsize=1)
def manifest() -> dict[str, Any]:
    return json.loads((CONTRACTS / "03_Manifiesto_pantallas_v2.json").read_text(encoding="utf-8-sig"))


@lru_cache(maxsize=1)
def menu() -> dict[str, Any]:
    return json.loads((CONTRACTS / "03_Menu_original_v2.json").read_text(encoding="utf-8-sig"))


@lru_cache(maxsize=1)
def human_talent_catalog() -> dict[str, list[dict[str, Any]]]:
    source = json.loads((CONTRACTS / "06_Talento_Humano_Seguridad.json").read_text(encoding="utf-8-sig"))
    root_id = "NODE-HR-ROOT"
    root_label = source["module"]
    nodes: list[dict[str, Any]] = [{
        "node_id": root_id, "label": root_label, "level": 0, "parent_id": None, "order": 1000,
        "breadcrumb": [root_label], "type": "group", "screen_id": None, "route": None, "package": None,
    }]
    screens: list[dict[str, Any]] = []
    screen_number = 1
    for group_number, group in enumerate(source["groups"], 1):
        group_id = f"NODE-HR-G{group_number:02d}"
        nodes.append({
            "node_id": group_id, "label": group["label"], "level": 1, "parent_id": root_id,
            "order": 1000 + group_number * 100, "breadcrumb": [root_label, group["label"]],
            "type": "group", "screen_id": None, "route": None, "package": None,
        })
        for item_number, item in enumerate(group["screens"], 1):
            if group["label"] == "Empleado" and item_number == 2 and item["title"] == "Empleados Complementarios":
                screen_number += 1  # HR-013 queda reservado: Asignación de Empleados no aplica a este proyecto.
            screen_id = f"HR-{screen_number:03d}"
            route = f"/talento-humano{item['path']}"
            breadcrumb = [root_label, group["label"], item["title"]]
            screens.append({
                "id": screen_id,
                "titulo_original": item["title"],
                "texto_original": item["title"],
                "ruta_original": " > ".join(breadcrumb),
                "ruta_react": route,
                "objetivo": item["description"],
                "diseno_visible": "Pantalla incorporada desde el módulo Talento Humano del proyecto Seguridad.",
                "filtros_campos": [
                    {"nombre": "empresa", "tipo": "selector", "obligatorio": True, "validacion": "empresa autorizada"},
                    {"nombre": "periodo", "tipo": "periodo", "obligatorio": False, "validacion": "periodo habilitado"},
                    {"nombre": "estado", "tipo": "selector", "obligatorio": False, "validacion": "estado permitido"},
                ],
                "columnas": ["Nombre", "Descripción", "Periodo", "Responsable", "Estado"],
                "acciones": [{"etiqueta": "Nuevo registro", "resultado": "crea un registro auditable", "permiso": "human_talent.write"}],
                "pasos_proceso": [
                    "Seleccionar empresa y periodo de trabajo.",
                    "Capturar o localizar la información requerida.",
                    "Validar campos, permisos y vigencias.",
                    "Guardar el registro con trazabilidad.",
                    "Consultar el resultado y su historial.",
                ],
                "validaciones": ["Empresa autorizada", "Periodo habilitado", "Permiso vigente", "Datos obligatorios"],
                "paquete": "HUMAN_TALENT",
                "modulo": root_label,
                "impacto_datos_contables": "La operación conserva trazabilidad laboral. Los efectos de nómina se publican únicamente desde los procesos de liquidación autorizados.",
                "pruebas_ids": [f"T-UI-{screen_id}", f"T-PROC-{screen_id}"],
            })
            nodes.append({
                "node_id": f"NODE-{screen_id}", "label": item["title"], "level": 2, "parent_id": group_id,
                "order": 1000 + group_number * 100 + item_number, "breadcrumb": breadcrumb,
                "type": "screen", "screen_id": screen_id, "route": route, "package": "HUMAN_TALENT",
            })
            screen_number += 1
    return {"screens": screens, "nodes": nodes}


@lru_cache(maxsize=1)
def personal_information_catalog() -> dict[str, list[dict[str, Any]]]:
    source = json.loads((CONTRACTS / "08_Informacion_Personal_Seguridad.json").read_text(encoding="utf-8-sig"))
    root_id = "NODE-PI-ROOT"
    root_label = source["module"]
    nodes: list[dict[str, Any]] = [{
        "node_id": root_id, "label": root_label, "level": 0, "parent_id": None, "order": 2000,
        "breadcrumb": [root_label], "type": "group", "screen_id": None, "route": None, "package": None,
    }]
    screens: list[dict[str, Any]] = []
    for number, item in enumerate(source["screens"], 1):
        screen_id = f"PI-{number:03d}"
        breadcrumb = [root_label, item["title"]]
        screens.append({
            "id": screen_id, "titulo_original": item["title"], "texto_original": item["title"],
            "ruta_original": " > ".join(breadcrumb), "ruta_react": item["path"], "objetivo": item["description"],
            "diseno_visible": "Pantalla incorporada desde Información Personal del proyecto Seguridad.",
            "filtros_campos": [
                {"nombre": "empleado", "tipo": "texto", "obligatorio": True, "validacion": "empleado autenticado"},
                {"nombre": "periodo", "tipo": "periodo", "obligatorio": False, "validacion": "periodo válido"},
                {"nombre": "estado", "tipo": "selector", "obligatorio": False, "validacion": "estado permitido"},
            ],
            "columnas": item["columns"],
            "acciones": [{"etiqueta": item["action"], "resultado": "actualiza la información personal con trazabilidad", "permiso": "personal.self_service"}],
            "pasos_proceso": ["Identificar al colaborador autenticado.", "Consultar la información personal disponible.", "Capturar la solicitud o actualización.", "Validar los datos y el periodo.", "Confirmar el resultado y conservar la trazabilidad."],
            "validaciones": ["Empleado autenticado", "Acceso a información propia", "Periodo válido", "Datos obligatorios"],
            "paquete": "PERSONAL_INFORMATION", "modulo": root_label,
            "impacto_datos_contables": "La consulta personal no genera movimientos contables. Las solicitudes que afecten nómina requieren aprobación previa.",
            "pruebas_ids": [f"T-UI-{screen_id}", f"T-PROC-{screen_id}"],
        })
        nodes.append({
            "node_id": f"NODE-{screen_id}", "label": item["title"], "level": 1, "parent_id": root_id,
            "order": 2000 + number, "breadcrumb": breadcrumb, "type": "screen", "screen_id": screen_id,
            "route": item["path"], "package": "PERSONAL_INFORMATION",
        })
    return {"screens": screens, "nodes": nodes}


@lru_cache(maxsize=1)
def security_general_catalog() -> dict[str, list[dict[str, Any]]]:
    source = json.loads((CONTRACTS / "07_Configuracion_General_Seguridad.json").read_text(encoding="utf-8-sig"))
    root_label = source["module"]
    parent_id = next(node["node_id"] for node in menu()["nodes"] if node["level"] == 0 and node["label"] == root_label)
    screens: list[dict[str, Any]] = []
    nodes: list[dict[str, Any]] = []
    for number, item in enumerate(source["screens"], 1):
        screen_id = f"SEC-{number:03d}"
        breadcrumb = [root_label, item["title"]]
        screens.append({
            "id": screen_id,
            "titulo_original": item["title"],
            "texto_original": item["title"],
            "ruta_original": " > ".join(breadcrumb),
            "ruta_react": item["path"],
            "objetivo": item["description"],
            "diseno_visible": "Pantalla incorporada desde Configuración General del proyecto Seguridad.",
            "filtros_campos": [
                {"nombre": "empresa", "tipo": "selector", "obligatorio": True, "validacion": "empresa autorizada"},
                {"nombre": "estado", "tipo": "selector", "obligatorio": False, "validacion": "estado permitido"},
                {"nombre": "busqueda", "tipo": "texto", "obligatorio": False, "validacion": "texto válido"},
            ],
            "columnas": item["columns"],
            "acciones": [{"etiqueta": item["action"], "resultado": "actualiza la configuración con auditoría", "permiso": "security.configure"}],
            "pasos_proceso": [
                "Seleccionar la empresa y el contexto de configuración.",
                "Consultar o capturar la información requerida.",
                "Validar permisos, unicidad y datos obligatorios.",
                "Guardar los cambios con trazabilidad.",
                "Confirmar el resultado y su estado.",
            ],
            "validaciones": ["Empresa autorizada", "Permiso de configuración", "Datos obligatorios", "Registro no duplicado"],
            "paquete": "SECURITY",
            "modulo": root_label,
            "impacto_datos_contables": "La configuración no genera movimientos contables. Los cambios quedan auditados y aplican según permisos y vigencia.",
            "pruebas_ids": [f"T-UI-{screen_id}", f"T-PROC-{screen_id}"],
        })
        nodes.append({
            "node_id": f"NODE-{screen_id}", "label": item["title"], "level": 1, "parent_id": parent_id,
            "order": 3000 + number, "breadcrumb": breadcrumb, "type": "screen",
            "screen_id": screen_id, "route": item["path"], "package": "SECURITY",
        })
    return {"screens": screens, "nodes": nodes}


HIDDEN_SCREEN_IDS = {"XLS-002", "XLS-100"}
SCREEN_LABEL_OVERRIDES = {"XLS-001": "Definición de Estructura"}


def all_screens() -> list[dict[str, Any]]:
    base_screens = []
    for source in manifest()["pantallas"]:
        if source["id"] in HIDDEN_SCREEN_IDS:
            continue
        screen = source.copy()
        if screen["id"] in SCREEN_LABEL_OVERRIDES:
            label = SCREEN_LABEL_OVERRIDES[screen["id"]]
            screen["titulo_original"] = label
            screen["texto_original"] = label
            screen["ruta_original"] = " > ".join([*screen["ruta_original"].split(" > ")[:-1], label])
        base_screens.append(screen)
    return [*base_screens, *human_talent_catalog()["screens"], *personal_information_catalog()["screens"], *security_general_catalog()["screens"]]


def all_menu_nodes() -> list[dict[str, Any]]:
    base_nodes = []
    for source in menu()["nodes"]:
        if source.get("screen_id") in HIDDEN_SCREEN_IDS:
            continue
        node = source.copy()
        if node.get("screen_id") in SCREEN_LABEL_OVERRIDES:
            label = SCREEN_LABEL_OVERRIDES[node["screen_id"]]
            node["label"] = label
            node["breadcrumb"] = [*node["breadcrumb"][:-1], label]
        base_nodes.append(node)
    root_labels = [node["label"] for node in base_nodes if node["level"] == 0]
    preferred_order = ["Administración Inmuebles", "Email", "CxC", "CxP", "Contabilidad"]
    ordered_labels = [*preferred_order, *(label for label in root_labels if label not in preferred_order)]
    ordered_nodes = [
        node
        for label in ordered_labels
        for node in base_nodes
        if node["breadcrumb"][0] == label
    ]
    insert_at = next((index for index, node in enumerate(ordered_nodes) if node["level"] == 0 and node["label"] == "Configuración General"), len(ordered_nodes))
    with_people = [*ordered_nodes[:insert_at], *human_talent_catalog()["nodes"], *personal_information_catalog()["nodes"], *ordered_nodes[insert_at:]]
    existing_configuration = [node for node in with_people if node["breadcrumb"][0] == "Configuración General" and node["type"] == "screen"]
    security_nodes = security_general_catalog()["nodes"]
    company_node = next(node for node in security_nodes if node["screen_id"] == "SEC-004")
    remaining_security = [node for node in security_nodes if node["screen_id"] != "SEC-004"]
    without_configuration_screens = [node for node in with_people if not (node["breadcrumb"][0] == "Configuración General" and node["type"] == "screen")]
    configuration_root_index = next(index for index, node in enumerate(without_configuration_screens) if node["level"] == 0 and node["label"] == "Configuración General")
    menu_screens = [company_node, *existing_configuration, *remaining_security]
    return [*without_configuration_screens[:configuration_root_index + 1], *menu_screens, *without_configuration_screens[configuration_root_index + 1:]]


def get_screen(screen_id: str) -> dict[str, Any]:
    screen = next((item for item in all_screens() if item["id"] == screen_id), None)
    if not screen:
        raise HTTPException(404, detail={"code": "SCREEN_NOT_FOUND", "message": "La pantalla no existe en el manifiesto v2."})
    return screen


def module_state(company_id: str, code: str) -> str:
    with connection() as db:
        row = db.execute("SELECT state FROM company_module WHERE company_id=? AND code=?", (company_id, code)).fetchone()
    return row["state"] if row else "DISABLED"


def authorize_screen(screen: dict[str, Any], company_id: str, write: bool = False) -> None:
    package = screen.get("paquete", "ACCOUNTING_CORE")
    if package != "PROPERTY_MANAGEMENT":
        return
    state = module_state(company_id, "PROPERTY_MANAGEMENT")
    if state == "DISABLED" or (write and state != "ENABLED"):
        message = "El módulo inmobiliario está deshabilitado." if state == "DISABLED" else "El módulo inmobiliario está en modo de solo lectura."
        raise HTTPException(403, detail={"code": "MODULE_DISABLED", "message": message})


def success(request: Request, data: Any, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"data": data, "meta": meta or {}, "trace": {"request_id": request.state.request_id}}


def audit(db, screen_id: str, record_id: str | None, action: str, detail: dict[str, Any]) -> None:
    db.execute("INSERT INTO audit_event VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (str(uuid.uuid4()), COMPANY_ID, screen_id, record_id, "jorge.admin", action, json.dumps(detail, ensure_ascii=False), utc_now()))


def sample_value(label: str, index: int) -> str:
    key = label.lower()
    if any(term in key for term in ["valor", "saldo", "total", "débito", "crédito", "monto"]): return f"{(index + 1) * 1280.75:.2f}"
    if any(term in key for term in ["fecha", "vigencia", "emisión"]): return f"2026-10-{18 + index:02d}"
    if "estado" in key: return ["ACTIVE", "PENDING", "APPROVED"][index % 3]
    if any(term in key for term in ["usuario", "responsable", "cliente", "proveedor", "propietario"]): return ["Andrea López", "Carlos Mena", "Inversiones Quito S.A."][index % 3]
    if any(term in key for term in ["código", "número", "secuencia", "comprobante"]): return f"{index + 1:03d}-2026-000{index + 7}"
    return ["Registro principal", "Operación en revisión", "Documento aprobado"][index % 3]


def ensure_seeded(screen: dict[str, Any]) -> None:
    with connection() as db:
        count = db.execute("SELECT COUNT(*) AS n FROM screen_record WHERE company_id=? AND screen_id=?", (COMPANY_ID, screen["id"])).fetchone()["n"]
        if count:
            return
        columns = screen.get("columnas", [])[:8]
        for i in range(3):
            payload = {column: sample_value(column, i) for column in columns}
            record_id = str(uuid.uuid4())
            stamp = utc_now()
            db.execute("INSERT INTO screen_record VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)", (record_id, COMPANY_ID, screen["id"], f"{screen['id']}-{i+1:03d}", ["ACTIVE", "PENDING", "APPROVED"][i], json.dumps(payload, ensure_ascii=False), stamp, stamp, None))


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize()
    if len(manifest()["pantallas"]) != 101:
        raise RuntimeError("El manifiesto contractual no contiene 101 pantallas")
    yield


app = FastAPI(title="SAGA v2 Contract API", version="0.2.0", docs_url="/api/docs", openapi_url="/api/openapi.json", lifespan=lifespan)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Request-Id"] = request.state.request_id
    return response


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "HTTP_ERROR", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content={"error": detail, "trace": {"request_id": request.state.request_id}})


@app.get("/api/health")
def health():
    return {"status": "ok", "environment": "validation", "screens": len(all_screens())}


@app.get("/api/v1/catalog")
def catalog(request: Request):
    screens = all_screens()
    data = {"version": manifest()["version"], "screens": screens, "menu": all_menu_nodes(), "complementaryCount": manifest()["complementary_screen_count"] + len(human_talent_catalog()["screens"]) + len(personal_information_catalog()["screens"]) + len(security_general_catalog()["screens"])}
    return success(request, data, {"screenCount": len(screens), "menuNodeCount": len(data["menu"])})


@app.get("/api/v1/context")
def context(request: Request):
    with connection() as db:
        company = dict(db.execute("SELECT * FROM company WHERE id=?", (COMPANY_ID,)).fetchone())
        modules = {r["code"]: r["state"] for r in db.execute("SELECT code,state FROM company_module WHERE company_id=?", (COMPANY_ID,))}
    return success(request, {"company": company, "modules": modules, "actor": {"name": "Jorge Mendoza", "role": "Administrador de validación"}})


@app.get("/api/v1/overview")
def overview(request: Request):
    with connection() as db:
        records = db.execute("SELECT COUNT(*) AS n FROM screen_record").fetchone()["n"]
        events = db.execute("SELECT COUNT(*) AS n FROM audit_event").fetchone()["n"]
        recent = [dict(r) for r in db.execute("SELECT screen_id, action, occurred_at FROM audit_event ORDER BY occurred_at DESC LIMIT 6")]
    nodes = all_menu_nodes()
    roots = [n for n in nodes if n["level"] == 0]
    return success(request, {"screenCount": len(all_screens()), "rootCount": len(roots), "recordCount": records, "auditCount": events, "roots": [{"label": r["label"], "screens": len([n for n in nodes if n["type"] == "screen" and n["breadcrumb"][0] == r["label"]])} for r in roots], "recent": recent})


@app.get("/api/v1/screens/{screen_id}/records")
def list_records(screen_id: str, request: Request):
    screen = get_screen(screen_id)
    authorize_screen(screen, COMPANY_ID)
    ensure_seeded(screen)
    with connection() as db:
        rows = db.execute("SELECT * FROM screen_record WHERE company_id=? AND screen_id=? ORDER BY updated_at DESC", (COMPANY_ID, screen_id)).fetchall()
    data = [{**dict(r), "payload": json.loads(r["payload"])} for r in rows]
    return success(request, data, {"count": len(data), "screenId": screen_id})


class RecordCreate(BaseModel):
    values: dict[str, str] = Field(min_length=1)


@app.post("/api/v1/screens/{screen_id}/records", status_code=status.HTTP_201_CREATED)
def create_record(screen_id: str, payload: RecordCreate, request: Request, idempotency_key: str | None = Header(default=None)):
    screen = get_screen(screen_id)
    authorize_screen(screen, COMPANY_ID, write=True)
    required = [field["nombre"] for field in screen.get("filtros_campos", []) if field.get("obligatorio")][:4]
    missing = [name for name in required if not payload.values.get(name, "").strip()]
    if missing:
        raise HTTPException(422, detail={"code": "MISSING_REQUIRED_FIELDS", "message": f"Completa los campos: {', '.join(missing)}."})
    key = idempotency_key or str(uuid.uuid4())
    with connection() as db:
        existing = db.execute("SELECT * FROM screen_record WHERE company_id=? AND idempotency_key=?", (COMPANY_ID, key)).fetchone()
        if existing:
            row = existing
        else:
            record_id = str(uuid.uuid4())
            reference = f"{screen_id}-{db.execute('SELECT COUNT(*) AS n FROM screen_record WHERE screen_id=?', (screen_id,)).fetchone()['n'] + 1:03d}"
            stamp = utc_now()
            db.execute("INSERT INTO screen_record VALUES (?, ?, ?, ?, 'DRAFT', ?, 1, ?, ?, ?)", (record_id, COMPANY_ID, screen_id, reference, json.dumps(payload.values, ensure_ascii=False), stamp, stamp, key))
            audit(db, screen_id, record_id, "record.created", {"reference": reference})
            row = db.execute("SELECT * FROM screen_record WHERE id=?", (record_id,)).fetchone()
    return success(request, {**dict(row), "payload": json.loads(row["payload"])})


class ActionRequest(BaseModel):
    reason: str = Field(default="Acción de validación", min_length=3, max_length=240)


@app.post("/api/v1/screens/{screen_id}/records/{record_id}/actions/{action}")
def apply_action(screen_id: str, record_id: str, action: str, payload: ActionRequest, request: Request):
    screen = get_screen(screen_id)
    authorize_screen(screen, COMPANY_ID, write=True)
    transitions = {"aprobar": "APPROVED", "publicar": "POSTED", "inactivar": "INACTIVE", "anular": "REVERSED", "confirmar": "CONFIRMED", "reimprimir": "ACTIVE"}
    next_state = next((state for key, state in transitions.items() if key in action.lower()), "IN_REVIEW")
    with connection() as db:
        row = db.execute("SELECT * FROM screen_record WHERE id=? AND screen_id=?", (record_id, screen_id)).fetchone()
        if not row:
            raise HTTPException(404, detail={"code": "RECORD_NOT_FOUND", "message": "No se encontró el registro."})
        db.execute("UPDATE screen_record SET status=?, version=version+1, updated_at=? WHERE id=?", (next_state, utc_now(), record_id))
        audit(db, screen_id, record_id, f"record.{action}", {"from": row["status"], "to": next_state, "reason": payload.reason})
        updated = db.execute("SELECT * FROM screen_record WHERE id=?", (record_id,)).fetchone()
    return success(request, {**dict(updated), "payload": json.loads(updated["payload"])})


class ModuleUpdate(BaseModel):
    state: Literal["ENABLED", "READ_ONLY", "DISABLED"]
    reason: str = Field(default="Cambio desde entorno de validación", min_length=3)


@app.put("/api/v1/modules/PROPERTY_MANAGEMENT")
def update_module(payload: ModuleUpdate, request: Request):
    with connection() as db:
        db.execute("UPDATE company_module SET state=?,effective_at=?,reason=? WHERE company_id=? AND code='PROPERTY_MANAGEMENT'", (payload.state, utc_now(), payload.reason, COMPANY_ID))
        audit(db, "XLS-100", None, "module.state_changed", {"state": payload.state, "reason": payload.reason})
    return success(request, {"code": "PROPERTY_MANAGEMENT", "state": payload.state})
