from __future__ import annotations

import json
import os
import secrets
import smtplib
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from functools import lru_cache
from pathlib import Path
from sqlite3 import IntegrityError
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .store import ROOT, connection, initialize
from .security import (
    SESSION_COOKIE,
    SESSION_TTL_SECONDS,
    PASSWORD_RECOVERY_MAX_ATTEMPTS,
    PASSWORD_RECOVERY_TTL_SECONDS,
    create_session_token,
    decrypt_value,
    encrypt_value,
    hash_password,
    hash_recovery_code,
    is_loopback,
    is_production,
    verify_session_token,
    verify_password,
    verify_recovery_code,
)

COMPANY_ID = "cmp-demo-ecuador"
ACTOR_ID = "usr-platform-admin"
CONTRACTS = ROOT / "contracts"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def masked_email(value: str) -> str:
    local, separator, domain = value.partition("@")
    if not separator:
        return "***"
    visible = local[:1] or "*"
    return f"{visible}{'*' * max(4, min(8, len(local) - 1))}@{domain}"


def send_password_recovery_email(recipient: str, recipient_name: str, code: str) -> bool:
    host = os.getenv("SAGA_SMTP_HOST", "").strip()
    sender = os.getenv("SAGA_SMTP_FROM", "").strip()
    if not host or not sender:
        return False
    port = int(os.getenv("SAGA_SMTP_PORT", "587"))
    username = os.getenv("SAGA_SMTP_USERNAME", "").strip()
    password = os.getenv("SAGA_SMTP_PASSWORD", "")
    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = "Código para recuperar tu contraseña"
    message.set_content(
        f"Hola {recipient_name},\n\nTu código de recuperación es {code}. "
        f"Caduca en {PASSWORD_RECOVERY_TTL_SECONDS // 60} minutos y sólo puede utilizarse una vez.\n\n"
        "Si no solicitaste este cambio, ignora este mensaje."
    )
    with smtplib.SMTP(host, port, timeout=15) as server:
        if os.getenv("SAGA_SMTP_STARTTLS", "true").lower() == "true":
            server.starttls()
        if username:
            server.login(username, password)
        server.send_message(message)
    return True


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
GROUP_ADMIN_SCREEN_IDS = {"SEC-001", "SEC-002", "SEC-003"}
GROUP_ADMIN_STATE_READ_KEYS = {
    "saga.security.company", "saga.security.colors", "saga.security.users",
    "saga.security.roles", "saga.security.permissions",
}
GROUP_ADMIN_STATE_WRITE_KEYS = {"saga.security.users", "saga.security.roles", "saga.security.permissions"}


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


def request_company_id(request: Request) -> str:
    return getattr(request.state, "company_id", COMPANY_ID)


def request_actor_id(request: Request) -> str:
    return getattr(request.state, "actor_id", ACTOR_ID)


def request_actor_role(request: Request) -> str:
    with connection() as db:
        row = db.execute("SELECT role FROM platform_user WHERE id=? AND status='ACTIVE'", (request_actor_id(request),)).fetchone()
    return row["role"] if row else ""


def authorize_actor_screen(request: Request, screen_id: str) -> None:
    if request_actor_role(request) == "GROUP_ADMIN" and screen_id not in GROUP_ADMIN_SCREEN_IDS:
        raise HTTPException(403, detail={"code": "GROUP_ADMIN_SCREEN_DENIED", "message": "El Administrador de Grupo sólo puede gestionar Usuarios, Roles y Permisos."})


def audit(db, screen_id: str, record_id: str | None, action: str, detail: dict[str, Any], company_id: str = COMPANY_ID, actor: str = "jorge.admin") -> None:
    event_id = str(uuid.uuid4())
    protected = encrypt_value(json.dumps(detail, ensure_ascii=False), "audit_event", company_id, event_id)
    db.execute("INSERT INTO audit_event VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (event_id, company_id, screen_id, record_id, actor, action, protected, utc_now()))


def sample_value(label: str, index: int) -> str:
    key = label.lower()
    if any(term in key for term in ["valor", "saldo", "total", "débito", "crédito", "monto"]): return f"{(index + 1) * 1280.75:.2f}"
    if any(term in key for term in ["fecha", "vigencia", "emisión"]): return f"2026-10-{18 + index:02d}"
    if "estado" in key: return ["ACTIVE", "PENDING", "APPROVED"][index % 3]
    if any(term in key for term in ["usuario", "responsable", "cliente", "proveedor", "propietario"]): return ["Andrea López", "Carlos Mena", "Inversiones Quito S.A."][index % 3]
    if any(term in key for term in ["código", "número", "secuencia", "comprobante"]): return f"{index + 1:03d}-2026-000{index + 7}"
    return ["Registro principal", "Operación en revisión", "Documento aprobado"][index % 3]


def ensure_seeded(screen: dict[str, Any], company_id: str = COMPANY_ID) -> None:
    with connection() as db:
        count = db.execute("SELECT COUNT(*) AS n FROM screen_record WHERE company_id=? AND screen_id=?", (company_id, screen["id"])).fetchone()["n"]
        if count:
            return
        columns = screen.get("columnas", [])[:8]
        for i in range(3):
            payload = {column: sample_value(column, i) for column in columns}
            record_id = str(uuid.uuid4())
            stamp = utc_now()
            protected = encrypt_value(json.dumps(payload, ensure_ascii=False), "screen_record", company_id, record_id)
            db.execute("INSERT INTO screen_record VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)", (record_id, company_id, screen["id"], f"{screen['id']}-{i+1:03d}", ["ACTIVE", "PENDING", "APPROVED"][i], protected, stamp, stamp, None))


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize()
    if len(manifest()["pantallas"]) != 101:
        raise RuntimeError("El manifiesto contractual no contiene 101 pantallas")
    yield


app = FastAPI(
    title="SAGA v2 Contract API",
    version="0.3.0",
    docs_url=None if is_production() else "/api/docs",
    openapi_url=None if is_production() else "/api/openapi.json",
    lifespan=lifespan,
)
allowed_hosts = [item.strip() for item in os.getenv("SAGA_ALLOWED_HOSTS", "127.0.0.1,localhost,testserver").split(",") if item.strip()]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)


def validate_request_access(actor_id: str, company_id: str, platform_route: bool = False) -> None:
    with connection() as db:
        actor = db.execute("SELECT * FROM platform_user WHERE id=? AND status='ACTIVE'", (actor_id,)).fetchone()
        if not actor:
            raise HTTPException(401, detail={"code": "ACTOR_NOT_AUTHENTICATED", "message": "El usuario no tiene una sesión activa."})
        if platform_route:
            return
        company = db.execute(
            "SELECT c.*,t.status AS tenant_status FROM company c JOIN tenant t ON t.id=c.tenant_id WHERE c.id=?",
            (company_id,),
        ).fetchone()
        if not company:
            raise HTTPException(404, detail={"code": "COMPANY_NOT_FOUND", "message": "La empresa seleccionada no existe."})
        membership = db.execute("SELECT role FROM company_user WHERE company_id=? AND user_id=?", (company_id, actor_id)).fetchone()
        group_membership = None
        if actor["role"] == "GROUP_ADMIN":
            group_membership = db.execute(
                """
                SELECT cga.permissions FROM company_group_admin cga
                JOIN company_group cg ON cg.id=cga.group_id AND cg.status='ACTIVE'
                JOIN company_group_company cgc ON cgc.group_id=cg.id AND cgc.company_id=?
                WHERE cga.user_id=? AND cga.status='ACTIVE'
                """,
                (company_id, actor_id),
            ).fetchone()
        authorized = actor["role"] == "PLATFORM_ADMIN" or (actor["role"] == "GROUP_ADMIN" and group_membership) or (actor["role"] not in {"PLATFORM_ADMIN", "GROUP_ADMIN"} and membership)
        if not authorized:
            raise HTTPException(403, detail={"code": "COMPANY_ACCESS_DENIED", "message": "El usuario no está autorizado para esta empresa."})
        if company["status"] != "ACTIVE":
            raise HTTPException(423, detail={"code": "COMPANY_SUSPENDED", "message": "La empresa se encuentra suspendida."})
        if company["tenant_status"] != "ACTIVE":
            raise HTTPException(423, detail={"code": "TENANT_SUSPENDED", "message": "El tenant se encuentra suspendido."})
        db.execute("UPDATE company SET last_access_at=? WHERE id=?", (utc_now(), company_id))


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    client_host = request.client.host if request.client else None
    local_request = is_loopback(client_host)
    if not local_request and os.getenv("SAGA_ALLOW_REMOTE", "false").lower() != "true":
        return JSONResponse(status_code=403, content={"error": {"code": "REMOTE_ACCESS_DISABLED", "message": "El acceso remoto a la API está deshabilitado."}, "trace": {"request_id": request.state.request_id}})

    api_request = request.url.path.startswith("/api/v1/")
    session_login_route = request.url.path == "/api/v1/session/login"
    session_logout_route = request.url.path == "/api/v1/session/logout"
    session_status_route = request.url.path == "/api/v1/session/status"
    password_recovery_route = request.url.path.startswith("/api/v1/session/password-recovery/")
    public_session_route = session_login_route or session_logout_route or session_status_route or password_recovery_route
    token = request.cookies.get(SESSION_COOKIE)
    session = verify_session_token(token) if token else None
    if token and not session and not public_session_route:
        return JSONResponse(status_code=401, content={"error": {"code": "INVALID_SESSION", "message": "La sesión no es válida o ha expirado."}, "trace": {"request_id": request.state.request_id}})
    if not session and api_request and not public_session_route:
        return JSONResponse(status_code=401, content={"error": {"code": "AUTHENTICATION_REQUIRED", "message": "Se requiere una sesión autenticada."}, "trace": {"request_id": request.state.request_id}})
    request.state.actor_id = str(session["actor"]) if session else ""
    request.state.company_id = request.headers.get("X-Company-Id", COMPANY_ID)
    if api_request and session and not public_session_route:
        try:
            unscoped_route = request.url.path.startswith("/api/v1/platform/") or request.url.path.startswith("/api/v1/session/")
            validate_request_access(
                request.state.actor_id,
                request.state.company_id,
                unscoped_route,
            )
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, dict) else {"code": "ACCESS_DENIED", "message": str(exc.detail)}
            return JSONResponse(status_code=exc.status_code, content={"error": detail, "trace": {"request_id": request.state.request_id}})
    response = await call_next(request)
    if session and api_request and not (session_login_route or session_logout_route):
        response.set_cookie(
            key=SESSION_COOKIE,
            value=create_session_token(str(session["actor"])),
            max_age=SESSION_TTL_SECONDS,
            httponly=True,
            secure=is_production(),
            samesite="strict",
            path="/api/",
        )
    response.headers["X-Request-Id"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
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
    nodes = all_menu_nodes()
    if request_actor_role(request) == "GROUP_ADMIN":
        screens = [screen for screen in screens if screen["id"] in GROUP_ADMIN_SCREEN_IDS]
        nodes = [
            node for node in nodes
            if (node["level"] == 0 and node["label"] == "Configuración General")
            or node.get("screen_id") in GROUP_ADMIN_SCREEN_IDS
        ]
    data = {"version": manifest()["version"], "screens": screens, "menu": nodes, "complementaryCount": manifest()["complementary_screen_count"] + len(human_talent_catalog()["screens"]) + len(personal_information_catalog()["screens"]) + len(security_general_catalog()["screens"])}
    return success(request, data, {"screenCount": len(screens), "menuNodeCount": len(data["menu"])})


@app.get("/api/v1/session/companies")
def session_companies(request: Request):
    actor_id = request_actor_id(request)
    with connection() as db:
        actor = db.execute("SELECT role FROM platform_user WHERE id=? AND status='ACTIVE'", (actor_id,)).fetchone()
        if not actor:
            raise HTTPException(401, detail={"code": "ACTOR_NOT_AUTHENTICATED", "message": "El usuario no tiene una sesión activa."})
        if actor["role"] == "PLATFORM_ADMIN":
            rows = db.execute(platform_company_query() + " WHERE c.status='ACTIVE' ORDER BY c.name").fetchall()
        elif actor["role"] == "GROUP_ADMIN":
            rows = db.execute(
                platform_company_query() +
                " JOIN company_group_admin scope ON scope.group_id=cgc.group_id AND scope.user_id=? AND scope.status='ACTIVE' WHERE c.status='ACTIVE' AND cg.status='ACTIVE' ORDER BY c.name",
                (actor_id,),
            ).fetchall()
        else:
            rows = db.execute(
                platform_company_query() +
                " JOIN company_user scope ON scope.company_id=c.id AND scope.user_id=? WHERE c.status='ACTIVE' ORDER BY c.name",
                (actor_id,),
            ).fetchall()
    return success(request, [platform_company_summary(row) for row in rows], {"count": len(rows)})


class SessionLoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=1, max_length=200)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)


class PasswordRecoveryRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=160)


class PasswordRecoveryConfirmRequest(BaseModel):
    recovery_id: str = Field(min_length=1, max_length=80)
    code: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=200)


@app.get("/api/v1/session/status")
def session_status(request: Request):
    actor_id = request_actor_id(request)
    if not actor_id:
        return success(request, {"authenticated": False, "actor": None})
    with connection() as db:
        actor = db.execute("SELECT id,username,name,email,role,status FROM platform_user WHERE id=? AND status='ACTIVE'", (actor_id,)).fetchone()
    return success(request, {"authenticated": bool(actor), "actor": dict(actor) if actor else None})


@app.post("/api/v1/session/login")
def session_login(payload: SessionLoginRequest, request: Request):
    identifier = payload.identifier.strip().lower()
    with connection() as db:
        actor = db.execute(
            "SELECT id,username,name,email,role,status,password_hash FROM platform_user WHERE status='ACTIVE' AND (lower(username)=? OR lower(email)=?)",
            (identifier, identifier),
        ).fetchone()
    if not actor or not verify_password(payload.password, actor["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "INVALID_CREDENTIALS", "message": "El usuario o la contraseña son incorrectos."})
    validate_request_access(actor["id"], request_company_id(request), actor["role"] == "PLATFORM_ADMIN")
    response = JSONResponse(content=success(request, {
        "authenticated": True,
        "actor": {key: actor[key] for key in ("id", "username", "name", "email", "role")},
    }))
    response.set_cookie(
        key=SESSION_COOKIE,
        value=create_session_token(actor["id"]),
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=is_production(),
        samesite="strict",
        path="/api/",
    )
    return response


@app.post("/api/v1/session/keepalive")
def session_keepalive(request: Request):
    return success(request, {"authenticated": True})


@app.put("/api/v1/session/password")
def change_session_password(payload: PasswordChangeRequest, request: Request):
    actor_id = request_actor_id(request)
    with connection() as db:
        actor = db.execute("SELECT password_hash FROM platform_user WHERE id=? AND status='ACTIVE'", (actor_id,)).fetchone()
        if not actor or not verify_password(payload.current_password, actor["password_hash"]):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "INVALID_CURRENT_PASSWORD", "message": "La contraseña actual es incorrecta."})
        db.execute("UPDATE platform_user SET password_hash=? WHERE id=?", (hash_password(payload.new_password), actor_id))
    return success(request, {"updated": True})


@app.post("/api/v1/session/password-recovery/request")
def request_password_recovery(payload: PasswordRecoveryRequest, request: Request):
    identifier = payload.identifier.strip().lower()
    now = datetime.now(timezone.utc)
    requested_at = now.isoformat()
    rate_limit_start = (now - timedelta(minutes=15)).isoformat()
    recovery_id = str(uuid.uuid4())
    code = f"{secrets.randbelow(1_000_000):06d}"
    with connection() as db:
        actor = db.execute(
            "SELECT id,name,email FROM platform_user WHERE status='ACTIVE' AND (lower(username)=? OR lower(email)=?)",
            (identifier, identifier),
        ).fetchone()
        if not actor:
            raise HTTPException(422, detail={"code": "RECOVERY_USER_NOT_FOUND", "message": "No encontramos un usuario activo con esa información."})
        recent_requests = db.execute(
            "SELECT COUNT(*) AS count FROM password_recovery WHERE user_id=? AND requested_at>=?",
            (actor["id"], rate_limit_start),
        ).fetchone()["count"]
        if recent_requests >= 5:
            raise HTTPException(429, detail={"code": "RECOVERY_RATE_LIMIT", "message": "Se solicitaron demasiados códigos. Espera 15 minutos antes de intentarlo nuevamente."})
        db.execute(
            "UPDATE password_recovery SET used_at=? WHERE user_id=? AND used_at IS NULL",
            (requested_at, actor["id"]),
        )
        db.execute(
            "INSERT INTO password_recovery(id,user_id,code_hash,requested_at,expires_at,attempts,used_at,request_ip) VALUES(?,?,?,?,?,0,NULL,?)",
            (
                recovery_id,
                actor["id"],
                hash_recovery_code(recovery_id, code),
                requested_at,
                (now + timedelta(seconds=PASSWORD_RECOVERY_TTL_SECONDS)).isoformat(),
                request.client.host if request.client else "",
            ),
        )
    delivered = False
    try:
        delivered = send_password_recovery_email(actor["email"], actor["name"], code)
    except (OSError, smtplib.SMTPException):
        if is_production():
            with connection() as db:
                db.execute("UPDATE password_recovery SET used_at=? WHERE id=?", (utc_now(), recovery_id))
            raise HTTPException(503, detail={"code": "RECOVERY_EMAIL_FAILED", "message": "No se pudo enviar el código de recuperación. Verifica la configuración SMTP."})
    validation_preview = not is_production() and is_loopback(request.client.host if request.client else None)
    if not delivered and not validation_preview:
        with connection() as db:
            db.execute("UPDATE password_recovery SET used_at=? WHERE id=?", (utc_now(), recovery_id))
        raise HTTPException(503, detail={"code": "RECOVERY_EMAIL_UNAVAILABLE", "message": "El envío de recuperación no está configurado."})
    return success(request, {
        "recoveryId": recovery_id,
        "maskedEmail": masked_email(actor["email"]),
        "expiresInSeconds": PASSWORD_RECOVERY_TTL_SECONDS,
        "deliveryMode": "EMAIL" if delivered else "VALIDATION",
        **({"previewCode": code} if validation_preview and not delivered else {}),
    })


@app.post("/api/v1/session/password-recovery/confirm")
def confirm_password_recovery(payload: PasswordRecoveryConfirmRequest, request: Request):
    now = datetime.now(timezone.utc)
    with connection() as db:
        recovery = db.execute(
            "SELECT pr.*,u.name FROM password_recovery pr JOIN platform_user u ON u.id=pr.user_id AND u.status='ACTIVE' WHERE pr.id=?",
            (payload.recovery_id,),
        ).fetchone()
        if not recovery or recovery["used_at"]:
            raise HTTPException(422, detail={"code": "RECOVERY_INVALID", "message": "El código de recuperación ya no es válido. Solicita uno nuevo."})
        if datetime.fromisoformat(recovery["expires_at"]) <= now:
            db.execute("UPDATE password_recovery SET used_at=? WHERE id=?", (now.isoformat(), payload.recovery_id))
            raise HTTPException(422, detail={"code": "RECOVERY_EXPIRED", "message": "El código de recuperación caducó. Solicita uno nuevo."})
        if recovery["attempts"] >= PASSWORD_RECOVERY_MAX_ATTEMPTS:
            db.execute("UPDATE password_recovery SET used_at=? WHERE id=?", (now.isoformat(), payload.recovery_id))
            raise HTTPException(422, detail={"code": "RECOVERY_ATTEMPTS_EXCEEDED", "message": "El código fue bloqueado por demasiados intentos. Solicita uno nuevo."})
        if not verify_recovery_code(payload.recovery_id, payload.code, recovery["code_hash"]):
            attempts = recovery["attempts"] + 1
            used_at = now.isoformat() if attempts >= PASSWORD_RECOVERY_MAX_ATTEMPTS else None
            db.execute("UPDATE password_recovery SET attempts=?,used_at=? WHERE id=?", (attempts, used_at, payload.recovery_id))
            raise HTTPException(422, detail={"code": "RECOVERY_CODE_INCORRECT", "message": "Código incorrecto, ingresa el nuevo código."})
        db.execute("UPDATE platform_user SET password_hash=? WHERE id=?", (hash_password(payload.new_password), recovery["user_id"]))
        db.execute("UPDATE password_recovery SET used_at=? WHERE id=?", (now.isoformat(), payload.recovery_id))
    return success(request, {"updated": True, "name": recovery["name"]})


@app.post("/api/v1/session/logout")
def session_logout(request: Request):
    response = JSONResponse(content=success(request, {"authenticated": False}))
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/api/",
        secure=is_production(),
        httponly=True,
        samesite="strict",
    )
    return response


@app.get("/api/v1/context")
def context(request: Request):
    company_id = request_company_id(request)
    actor_id = request_actor_id(request)
    with connection() as db:
        company = dict(db.execute("SELECT c.*,t.name AS tenant_name,t.plan AS tenant_plan FROM company c JOIN tenant t ON t.id=c.tenant_id WHERE c.id=?", (company_id,)).fetchone())
        modules = {r["code"]: r["state"] for r in db.execute("SELECT code,state FROM company_module WHERE company_id=?", (company_id,))}
        actor = dict(db.execute("SELECT id,username,name,email,role FROM platform_user WHERE id=?", (actor_id,)).fetchone())
        membership = db.execute("SELECT role FROM company_user WHERE company_id=? AND user_id=?", (company_id, actor_id)).fetchone()
        group_memberships = [dict(row) for row in db.execute(
            """SELECT cg.id,cg.name,cga.permissions FROM company_group_admin cga
               JOIN company_group cg ON cg.id=cga.group_id AND cg.status='ACTIVE'
               WHERE cga.user_id=? AND cga.status='ACTIVE' ORDER BY cg.name""",
            (actor_id,),
        )]
    actor["companyRole"] = membership["role"] if membership else "PLATFORM_ADMIN"
    actor["platformAdmin"] = actor["role"] == "PLATFORM_ADMIN"
    actor["groupAdmin"] = actor["role"] == "GROUP_ADMIN" and bool(group_memberships)
    actor["companyGroups"] = [
        {"id": item["id"], "name": item["name"], "permissions": json.loads(item["permissions"])}
        for item in group_memberships
    ]
    return success(request, {"company": company, "modules": modules, "actor": actor})


def platform_company_summary(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"], "tenantId": row["tenant_id"], "tenantName": row["tenant_name"],
        "name": row["name"], "legalName": row["legal_name"], "tradeName": row["trade_name"],
        "ruc": row["ruc"], "plan": row["plan"], "status": row["status"],
        "environment": row["environment"], "period": row["period"], "email": row["email"],
        "operationStartDate": row["operation_start_date"], "createdAt": row["created_at"],
        "lastAccessAt": row["last_access_at"], "userCount": row["user_count"],
        "adminName": row["admin_name"] or "Sin administrador",
        "groupId": row["group_id"], "groupName": row["group_name"],
    }


def platform_company_query() -> str:
    return """
      SELECT c.*,t.name AS tenant_name,t.plan,cgc.group_id AS group_id,cg.name AS group_name,
        (SELECT COUNT(*) FROM company_user cu WHERE cu.company_id=c.id) AS user_count,
        (SELECT u.name FROM company_user cu JOIN platform_user u ON u.id=cu.user_id WHERE cu.company_id=c.id AND cu.role='ADMIN' ORDER BY u.created_at LIMIT 1) AS admin_name
      FROM company c JOIN tenant t ON t.id=c.tenant_id
      LEFT JOIN company_group_company cgc ON cgc.company_id=c.id
      LEFT JOIN company_group cg ON cg.id=cgc.group_id
    """


def require_platform_admin(request: Request) -> None:
    with connection() as db:
        actor = db.execute("SELECT role FROM platform_user WHERE id=? AND status='ACTIVE'", (request_actor_id(request),)).fetchone()
    if not actor or actor["role"] != "PLATFORM_ADMIN":
        raise HTTPException(403, detail={"code": "PLATFORM_ADMIN_REQUIRED", "message": "Esta operación requiere permisos de superadministrador."})


def require_platform_scope(request: Request) -> str:
    with connection() as db:
        actor = db.execute("SELECT role FROM platform_user WHERE id=? AND status='ACTIVE'", (request_actor_id(request),)).fetchone()
    if not actor or actor["role"] not in {"PLATFORM_ADMIN", "GROUP_ADMIN"}:
        raise HTTPException(403, detail={"code": "PLATFORM_SCOPE_REQUIRED", "message": "Esta operación requiere permisos de plataforma o administración de grupo."})
    return actor["role"]


@app.get("/api/v1/platform/companies")
def list_platform_companies(request: Request):
    role = require_platform_scope(request)
    with connection() as db:
        if role == "PLATFORM_ADMIN":
            rows = db.execute(platform_company_query() + " ORDER BY c.created_at DESC, c.name").fetchall()
        else:
            rows = db.execute(
                platform_company_query() +
                " JOIN company_group_admin scope ON scope.group_id=cgc.group_id AND scope.user_id=? AND scope.status='ACTIVE' WHERE cg.status='ACTIVE' ORDER BY c.name",
                (request_actor_id(request),),
            ).fetchall()
    return success(request, [platform_company_summary(row) for row in rows], {"count": len(rows)})


GROUP_ADMIN_PERMISSIONS = {"USERS_MANAGE", "PERMISSIONS_MANAGE", "ACCESS_MANAGE"}


def company_group_summary(db, row: Any) -> dict[str, Any]:
    companies = [
        {"id": item["id"], "name": item["name"], "ruc": item["ruc"], "status": item["status"]}
        for item in db.execute(
            """SELECT c.id,c.name,c.ruc,c.status FROM company_group_company cgc
               JOIN company c ON c.id=cgc.company_id WHERE cgc.group_id=? ORDER BY c.name""",
            (row["id"],),
        )
    ]
    admins = [
        {
            "id": item["id"], "name": item["name"], "email": item["email"],
            "username": item["username"], "status": item["membership_status"],
            "permissions": json.loads(item["permissions"]),
        }
        for item in db.execute(
            """SELECT u.id,u.name,u.email,u.username,cga.status AS membership_status,cga.permissions
               FROM company_group_admin cga JOIN platform_user u ON u.id=cga.user_id
               WHERE cga.group_id=? ORDER BY u.name""",
            (row["id"],),
        )
    ]
    return {
        "id": row["id"], "name": row["name"], "description": row["description"],
        "status": row["status"], "createdAt": row["created_at"],
        "companies": companies, "admins": admins,
    }


class CompanyGroupCreate(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    description: str = Field(default="", max_length=240)
    company_ids: list[str] = Field(min_length=2, max_length=100)
    admin_name: str = Field(min_length=3, max_length=100)
    admin_email: str = Field(min_length=5, max_length=120)
    admin_username: str = Field(pattern=r"^[a-z0-9._-]{3,40}$")
    permissions: list[Literal["USERS_MANAGE", "PERMISSIONS_MANAGE", "ACCESS_MANAGE"]] = Field(
        default_factory=lambda: ["USERS_MANAGE", "PERMISSIONS_MANAGE", "ACCESS_MANAGE"]
    )


@app.get("/api/v1/platform/company-groups")
def list_company_groups(request: Request):
    role = require_platform_scope(request)
    with connection() as db:
        if role == "PLATFORM_ADMIN":
            rows = db.execute("SELECT * FROM company_group ORDER BY name").fetchall()
        else:
            rows = db.execute(
                """SELECT cg.* FROM company_group cg JOIN company_group_admin cga ON cga.group_id=cg.id
                   WHERE cga.user_id=? AND cga.status='ACTIVE' ORDER BY cg.name""",
                (request_actor_id(request),),
            ).fetchall()
        data = [company_group_summary(db, row) for row in rows]
    return success(request, data, {"count": len(data)})


@app.post("/api/v1/platform/company-groups", status_code=status.HTTP_201_CREATED)
def create_company_group(payload: CompanyGroupCreate, request: Request):
    require_platform_admin(request)
    company_ids = list(dict.fromkeys(payload.company_ids))
    if len(company_ids) < 2:
        raise HTTPException(422, detail={"code": "GROUP_REQUIRES_TWO_COMPANIES", "message": "El grupo debe contener al menos dos compañías diferentes."})
    permissions = sorted(set(payload.permissions))
    if set(permissions) != GROUP_ADMIN_PERMISSIONS:
        raise HTTPException(422, detail={"code": "GROUP_ADMIN_PERMISSIONS_REQUIRED", "message": "El administrador del grupo debe gestionar usuarios, permisos y accesos."})
    group_id = f"grp-{uuid.uuid4()}"
    user_id = f"usr-{uuid.uuid4()}"
    stamp = utc_now()
    placeholders = ",".join("?" for _ in company_ids)
    try:
        with connection() as db:
            companies = db.execute(
                f"SELECT id,name,status FROM company WHERE id IN ({placeholders})",
                company_ids,
            ).fetchall()
            if len(companies) != len(company_ids):
                raise HTTPException(404, detail={"code": "COMPANY_NOT_FOUND", "message": "Una o más compañías seleccionadas no existen."})
            if any(item["status"] != "ACTIVE" for item in companies):
                raise HTTPException(422, detail={"code": "GROUP_COMPANY_INACTIVE", "message": "Sólo se pueden agrupar compañías activas."})
            grouped = db.execute(
                f"""SELECT c.name,cg.name AS group_name FROM company_group_company cgc
                    JOIN company c ON c.id=cgc.company_id JOIN company_group cg ON cg.id=cgc.group_id
                    WHERE cgc.company_id IN ({placeholders})""",
                company_ids,
            ).fetchall()
            if grouped:
                detail = ", ".join(f"{item['name']} ({item['group_name']})" for item in grouped)
                raise HTTPException(409, detail={"code": "COMPANY_ALREADY_GROUPED", "message": f"Estas compañías ya pertenecen a un grupo: {detail}."})

            username = payload.admin_username.strip().lower()
            email = payload.admin_email.strip().lower()
            existing_user = db.execute("SELECT * FROM platform_user WHERE username=? OR email=?", (username, email)).fetchone()
            if existing_user:
                if existing_user["username"] != username or existing_user["email"] != email:
                    raise HTTPException(409, detail={"code": "ADMIN_IDENTITY_CONFLICT", "message": "El usuario o email ya pertenece a otra identidad."})
                if existing_user["role"] == "PLATFORM_ADMIN":
                    raise HTTPException(409, detail={"code": "PLATFORM_ADMIN_NOT_GROUP_ADMIN", "message": "El superadministrador no debe asignarse como administrador limitado de un grupo."})
                user_id = existing_user["id"]
                db.execute("UPDATE platform_user SET role='GROUP_ADMIN',status='ACTIVE',name=? WHERE id=?", (payload.admin_name.strip(), user_id))
            else:
                db.execute(
                    "INSERT INTO platform_user(id,username,name,email,role,status,created_at) VALUES(?,?,?,?,?,?,?)",
                    (user_id, username, payload.admin_name.strip(), email, "GROUP_ADMIN", "ACTIVE", stamp),
                )

            db.execute(
                "INSERT INTO company_group(id,name,description,status,created_at,created_by) VALUES(?,?,?,?,?,?)",
                (group_id, payload.name.strip(), payload.description.strip(), "ACTIVE", stamp, request_actor_id(request)),
            )
            db.executemany(
                "INSERT INTO company_group_company(group_id,company_id) VALUES(?,?)",
                [(group_id, company_id) for company_id in company_ids],
            )
            db.execute(
                "INSERT INTO company_group_admin(group_id,user_id,permissions,status,created_at) VALUES(?,?,?,?,?)",
                (group_id, user_id, json.dumps(permissions), "ACTIVE", stamp),
            )
            for company_id in company_ids:
                db.execute(
                    """INSERT INTO company_user(company_id,user_id,role) VALUES(?,?,'GROUP_ADMIN')
                       ON CONFLICT(company_id,user_id) DO UPDATE SET role='GROUP_ADMIN'""",
                    (company_id, user_id),
                )
                audit(
                    db, "PLATFORM-GROUPS", group_id, "company_group.created",
                    {"groupName": payload.name.strip(), "administrator": username, "permissions": permissions},
                    company_id, request_actor_id(request),
                )
            row = db.execute("SELECT * FROM company_group WHERE id=?", (group_id,)).fetchone()
            result = company_group_summary(db, row)
    except IntegrityError as exc:
        raise HTTPException(409, detail={"code": "COMPANY_GROUP_DUPLICATE", "message": "Ya existe un grupo con ese nombre o una compañía seleccionada ya fue agrupada."}) from exc
    return success(request, result)


class PlatformCompanyCreate(BaseModel):
    tenant_name: str = Field(min_length=3, max_length=120)
    plan: Literal["BASE", "PROFESIONAL", "COMPLETO"] = "COMPLETO"
    legal_name: str = Field(min_length=3, max_length=150)
    trade_name: str = Field(min_length=2, max_length=100)
    ruc: str = Field(pattern=r"^\d{10,13}$")
    email: str = Field(default="", max_length=120)
    address: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=30)
    operation_start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    billing_type: Literal["EXPENSAS", "FACTURACION"] = "EXPENSAS"
    generation_type: Literal["CLIENTE", "INMUEBLE"] = "CLIENTE"
    bills_water: bool = False
    modules: list[str] = Field(default_factory=lambda: ["ACCOUNTING_CORE", "PROPERTY_MANAGEMENT"])
    primary_color: str = Field(default="#5265ee", pattern=r"^#[0-9A-Fa-f]{6}$")
    sidebar_color: str = Field(default="#151b2b", pattern=r"^#[0-9A-Fa-f]{6}$")
    admin_name: str = Field(min_length=3, max_length=100)
    admin_email: str = Field(min_length=5, max_length=120)
    admin_username: str = Field(pattern=r"^[a-z0-9._-]{3,40}$")


@app.post("/api/v1/platform/companies", status_code=status.HTTP_201_CREATED)
def create_platform_company(payload: PlatformCompanyCreate, request: Request):
    require_platform_admin(request)
    tenant_id = f"tenant-{uuid.uuid4()}"
    company_id = f"cmp-{uuid.uuid4()}"
    user_id = f"usr-{uuid.uuid4()}"
    stamp = utc_now()
    period = payload.operation_start_date[:7]
    company_settings = {
        "ruc": payload.ruc, "name": payload.trade_name, "businessName": payload.legal_name,
        "address": payload.address, "phone": payload.phone, "email": payload.email,
        "operationStartDate": payload.operation_start_date, "billingType": payload.billing_type,
        "vatType": "GRAVA_IVA", "generationType": payload.generation_type,
        "billsWater": payload.bills_water, "smtpServer": "", "smtpPort": "587",
        "senderEmail": "", "smtpPassword": "", "from": "",
    }
    colors = {
        "canvas": "#f4f5f8", "surface": "#ffffff", "subtle": "#f8fafc", "hover": "#f1f5f9",
        "text": "#202536", "secondary": "#707789", "border": "#dfe2e9", "divider": "#e2e8f0",
        "primary": payload.primary_color, "primary-hover": payload.primary_color, "sidebar": payload.sidebar_color,
        "sidebar-active": "#1d2437", "success": "#166534", "success-bg": "#f0fdf4",
        "warning": "#92400e", "warning-bg": "#fffbeb", "danger": "#b91c1c", "danger-bg": "#fef2f2",
        "info-bg": "#eff6ff", "simulation": "#6b21a8", "simulation-bg": "#faf5ff",
    }
    try:
        with connection() as db:
            db.execute("INSERT INTO tenant(id,name,plan,status,created_at) VALUES(?,?,?,?,?)", (tenant_id, payload.tenant_name.strip(), payload.plan, "ACTIVE", stamp))
            username = payload.admin_username.strip().lower()
            email = payload.admin_email.strip().lower()
            existing_user = db.execute("SELECT * FROM platform_user WHERE username=? OR email=?", (username, email)).fetchone()
            if existing_user:
                if existing_user["username"] != username or existing_user["email"] != email:
                    raise HTTPException(409, detail={"code": "ADMIN_IDENTITY_CONFLICT", "message": "El usuario o email ya pertenece a otra identidad. Usa ambos datos del mismo usuario."})
                user_id = existing_user["id"]
            else:
                db.execute(
                    "INSERT INTO platform_user(id,username,name,email,role,status,created_at) VALUES(?,?,?,?,?,?,?)",
                    (user_id, username, payload.admin_name.strip(), email, "COMPANY_ADMIN", "ACTIVE", stamp),
                )
            db.execute(
                "INSERT INTO company(id,name,ruc,environment,period,tenant_id,legal_name,trade_name,email,address,phone,timezone,currency,operation_start_date,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (company_id, payload.trade_name.strip(), payload.ruc, "PRODUCTION", period, tenant_id, payload.legal_name.strip(), payload.trade_name.strip(), payload.email.strip().lower(), payload.address.strip(), payload.phone.strip(), "America/Guayaquil", "USD", payload.operation_start_date, "ACTIVE", stamp),
            )
            db.execute("INSERT INTO tenant_user(tenant_id,user_id,role) VALUES(?,?,?)", (tenant_id, user_id, "OWNER"))
            db.execute("INSERT INTO company_user(company_id,user_id,role) VALUES(?,?,?)", (company_id, user_id, "ADMIN"))
            for code in sorted(set(["ACCOUNTING_CORE", *payload.modules])):
                db.execute("INSERT INTO company_module(company_id,code,state,effective_at,reason) VALUES(?,?,?,?,?)", (company_id, code, "ENABLED", stamp, "Configuración inicial del tenant"))
            for key, value in {
                "saga.security.company": company_settings,
                "saga.security.colors": colors,
            }.items():
                serialized = json.dumps(value, ensure_ascii=False)
                protected = encrypt_value(serialized, "client_state", company_id, key)
                db.execute("INSERT INTO client_state(company_id,storage_key,value,version,updated_at,actor) VALUES(?,?,?,1,?,?)", (company_id, key, protected, stamp, request_actor_id(request)))
            audit(db, "PLATFORM-COMPANIES", company_id, "company.provisioned", {"tenantId": tenant_id, "plan": payload.plan, "modules": payload.modules}, company_id, request_actor_id(request))
            row = db.execute(platform_company_query() + " WHERE c.id=?", (company_id,)).fetchone()
    except IntegrityError as exc:
        raise HTTPException(409, detail={"code": "COMPANY_DUPLICATE", "message": "Ya existe una empresa con el RUC, usuario o email indicado."}) from exc
    return success(request, platform_company_summary(row))


class PlatformCompanyStatusUpdate(BaseModel):
    status: Literal["ACTIVE", "SUSPENDED"]


@app.patch("/api/v1/platform/companies/{company_id}/status")
def update_platform_company_status(company_id: str, payload: PlatformCompanyStatusUpdate, request: Request):
    require_platform_admin(request)
    if company_id == COMPANY_ID and payload.status == "SUSPENDED":
        raise HTTPException(422, detail={"code": "DEMO_COMPANY_REQUIRED", "message": "La empresa principal de validación no puede suspenderse."})
    with connection() as db:
        current = db.execute("SELECT id,status FROM company WHERE id=?", (company_id,)).fetchone()
        if not current:
            raise HTTPException(404, detail={"code": "COMPANY_NOT_FOUND", "message": "La empresa no existe."})
        db.execute("UPDATE company SET status=? WHERE id=?", (payload.status, company_id))
        audit(db, "PLATFORM-COMPANIES", company_id, "company.status_changed", {"from": current["status"], "to": payload.status}, company_id, request_actor_id(request))
        row = db.execute(platform_company_query() + " WHERE c.id=?", (company_id,)).fetchone()
    return success(request, platform_company_summary(row))


@app.get("/api/v1/overview")
def overview(request: Request):
    company_id = request_company_id(request)
    if request_actor_role(request) == "GROUP_ADMIN":
        nodes = [node for node in all_menu_nodes() if (node["level"] == 0 and node["label"] == "Configuración General") or node.get("screen_id") in GROUP_ADMIN_SCREEN_IDS]
        return success(request, {"screenCount": 3, "rootCount": 1, "recordCount": 0, "auditCount": 0, "roots": [{"label": "Configuración General", "screens": 3}], "recent": []})
    with connection() as db:
        records = db.execute("SELECT COUNT(*) AS n FROM screen_record WHERE company_id=?", (company_id,)).fetchone()["n"]
        events = db.execute("SELECT COUNT(*) AS n FROM audit_event WHERE company_id=?", (company_id,)).fetchone()["n"]
        recent = [dict(r) for r in db.execute("SELECT screen_id, action, occurred_at FROM audit_event WHERE company_id=? ORDER BY occurred_at DESC LIMIT 6", (company_id,))]
    nodes = all_menu_nodes()
    roots = [n for n in nodes if n["level"] == 0]
    return success(request, {"screenCount": len(all_screens()), "rootCount": len(roots), "recordCount": records, "auditCount": events, "roots": [{"label": r["label"], "screens": len([n for n in nodes if n["type"] == "screen" and n["breadcrumb"][0] == r["label"]])} for r in roots], "recent": recent})


@app.get("/api/v1/screens/{screen_id}/records")
def list_records(screen_id: str, request: Request):
    company_id = request_company_id(request)
    authorize_actor_screen(request, screen_id)
    screen = get_screen(screen_id)
    authorize_screen(screen, company_id)
    ensure_seeded(screen, company_id)
    with connection() as db:
        rows = db.execute("SELECT * FROM screen_record WHERE company_id=? AND screen_id=? ORDER BY updated_at DESC", (company_id, screen_id)).fetchall()
    data = [
        {
            **dict(r),
            "payload": json.loads(decrypt_value(r["payload"], "screen_record", company_id, r["id"])),
        }
        for r in rows
    ]
    return success(request, data, {"count": len(data), "screenId": screen_id})


class RecordCreate(BaseModel):
    values: dict[str, str] = Field(min_length=1)


@app.post("/api/v1/screens/{screen_id}/records", status_code=status.HTTP_201_CREATED)
def create_record(screen_id: str, payload: RecordCreate, request: Request, idempotency_key: str | None = Header(default=None)):
    company_id = request_company_id(request)
    authorize_actor_screen(request, screen_id)
    screen = get_screen(screen_id)
    authorize_screen(screen, company_id, write=True)
    required = [field["nombre"] for field in screen.get("filtros_campos", []) if field.get("obligatorio")][:4]
    missing = [name for name in required if not payload.values.get(name, "").strip()]
    if missing:
        raise HTTPException(422, detail={"code": "MISSING_REQUIRED_FIELDS", "message": f"Completa los campos: {', '.join(missing)}."})
    key = idempotency_key or str(uuid.uuid4())
    with connection() as db:
        existing = db.execute("SELECT * FROM screen_record WHERE company_id=? AND idempotency_key=?", (company_id, key)).fetchone()
        if existing:
            row = existing
        else:
            record_id = str(uuid.uuid4())
            reference = f"{screen_id}-{db.execute('SELECT COUNT(*) AS n FROM screen_record WHERE company_id=? AND screen_id=?', (company_id, screen_id)).fetchone()['n'] + 1:03d}"
            stamp = utc_now()
            protected = encrypt_value(json.dumps(payload.values, ensure_ascii=False), "screen_record", company_id, record_id)
            db.execute("INSERT INTO screen_record VALUES (?, ?, ?, ?, 'DRAFT', ?, 1, ?, ?, ?)", (record_id, company_id, screen_id, reference, protected, stamp, stamp, key))
            audit(db, screen_id, record_id, "record.created", {"reference": reference}, company_id, request_actor_id(request))
            row = db.execute("SELECT * FROM screen_record WHERE id=? AND company_id=?", (record_id, company_id)).fetchone()
    return success(request, {**dict(row), "payload": json.loads(decrypt_value(row["payload"], "screen_record", company_id, row["id"]))})


class ActionRequest(BaseModel):
    reason: str = Field(default="Acción de validación", min_length=3, max_length=240)


@app.post("/api/v1/screens/{screen_id}/records/{record_id}/actions/{action}")
def apply_action(screen_id: str, record_id: str, action: str, payload: ActionRequest, request: Request):
    company_id = request_company_id(request)
    authorize_actor_screen(request, screen_id)
    screen = get_screen(screen_id)
    authorize_screen(screen, company_id, write=True)
    transitions = {"aprobar": "APPROVED", "publicar": "POSTED", "inactivar": "INACTIVE", "anular": "REVERSED", "confirmar": "CONFIRMED", "reimprimir": "ACTIVE"}
    next_state = next((state for key, state in transitions.items() if key in action.lower()), "IN_REVIEW")
    with connection() as db:
        row = db.execute("SELECT * FROM screen_record WHERE id=? AND screen_id=? AND company_id=?", (record_id, screen_id, company_id)).fetchone()
        if not row:
            raise HTTPException(404, detail={"code": "RECORD_NOT_FOUND", "message": "No se encontró el registro."})
        db.execute("UPDATE screen_record SET status=?, version=version+1, updated_at=? WHERE id=? AND company_id=?", (next_state, utc_now(), record_id, company_id))
        audit(db, screen_id, record_id, f"record.{action}", {"from": row["status"], "to": next_state, "reason": payload.reason}, company_id, request_actor_id(request))
        updated = db.execute("SELECT * FROM screen_record WHERE id=? AND company_id=?", (record_id, company_id)).fetchone()
    return success(request, {**dict(updated), "payload": json.loads(decrypt_value(updated["payload"], "screen_record", company_id, updated["id"]))})


class ModuleUpdate(BaseModel):
    state: Literal["ENABLED", "READ_ONLY", "DISABLED"]
    reason: str = Field(default="Cambio desde entorno de validación", min_length=3)


@app.put("/api/v1/modules/PROPERTY_MANAGEMENT")
def update_module(payload: ModuleUpdate, request: Request):
    company_id = request_company_id(request)
    if request_actor_role(request) == "GROUP_ADMIN":
        raise HTTPException(403, detail={"code": "GROUP_ADMIN_MODULE_DENIED", "message": "El Administrador de Grupo no puede modificar módulos de la compañía."})
    with connection() as db:
        db.execute("UPDATE company_module SET state=?,effective_at=?,reason=? WHERE company_id=? AND code='PROPERTY_MANAGEMENT'", (payload.state, utc_now(), payload.reason, company_id))
        audit(db, "XLS-100", None, "module.state_changed", {"state": payload.state, "reason": payload.reason}, company_id, request_actor_id(request))
    return success(request, {"code": "PROPERTY_MANAGEMENT", "state": payload.state})


class ClientStateUpdate(BaseModel):
    entries: dict[str, str] = Field(default_factory=dict)
    removed: list[str] = Field(default_factory=list)


def validate_client_state_key(key: str) -> None:
    if not key.startswith("saga.") or len(key) > 180:
        raise HTTPException(422, detail={"code": "INVALID_STATE_KEY", "message": "La clave de persistencia no es válida."})


@app.get("/api/v1/state")
def read_client_state(request: Request):
    company_id = request_company_id(request)
    group_admin = request_actor_role(request) == "GROUP_ADMIN"
    with connection() as db:
        if group_admin:
            placeholders = ",".join("?" for _ in GROUP_ADMIN_STATE_READ_KEYS)
            rows = db.execute(
                f"SELECT storage_key,value,version,updated_at FROM client_state WHERE company_id=? AND storage_key IN ({placeholders}) ORDER BY storage_key",
                (company_id, *sorted(GROUP_ADMIN_STATE_READ_KEYS)),
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT storage_key,value,version,updated_at FROM client_state WHERE company_id=? ORDER BY storage_key",
                (company_id,),
            ).fetchall()
    entries = {
        row["storage_key"]: {
            "value": decrypt_value(row["value"], "client_state", company_id, row["storage_key"]),
            "version": row["version"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    }
    return success(request, {
        "entries": entries,
        "scope": "GROUP_SECURITY_ADMIN" if group_admin else "COMPANY",
        "allowedKeys": sorted(GROUP_ADMIN_STATE_READ_KEYS) if group_admin else [],
    }, {"count": len(entries), "companyId": company_id})


@app.post("/api/v1/state")
def write_client_state(payload: ClientStateUpdate, request: Request):
    company_id = request_company_id(request)
    if request_actor_role(request) == "GROUP_ADMIN":
        requested_keys = set(payload.entries) | set(payload.removed)
        denied_keys = sorted(requested_keys - GROUP_ADMIN_STATE_WRITE_KEYS)
        if denied_keys:
            raise HTTPException(403, detail={"code": "GROUP_ADMIN_STATE_DENIED", "message": "El Administrador de Grupo no puede modificar información operativa o financiera."})
    if len(payload.entries) + len(payload.removed) > 300:
        raise HTTPException(422, detail={"code": "STATE_BATCH_TOO_LARGE", "message": "La actualización contiene demasiados registros."})
    for key, value in payload.entries.items():
        validate_client_state_key(key)
        if len(value.encode("utf-8")) > 6_000_000:
            raise HTTPException(422, detail={"code": "STATE_VALUE_TOO_LARGE", "message": f"El registro {key} supera el tamaño permitido."})
    for key in payload.removed:
        validate_client_state_key(key)

    stamp = utc_now()
    with connection() as db:
        for key, value in payload.entries.items():
            protected = encrypt_value(value, "client_state", company_id, key)
            db.execute(
                """
                INSERT INTO client_state(company_id,storage_key,value,version,updated_at,actor)
                VALUES(?,?,?,1,?,?)
                ON CONFLICT(company_id,storage_key) DO UPDATE SET
                  value=excluded.value,
                  version=client_state.version+1,
                  updated_at=excluded.updated_at,
                  actor=excluded.actor
                """,
                (company_id, key, protected, stamp, request_actor_id(request)),
            )
            if key == "saga.security.company":
                try:
                    settings = json.loads(value)
                    db.execute(
                        """UPDATE company SET name=?,legal_name=?,trade_name=?,ruc=?,email=?,address=?,phone=?,operation_start_date=?,period=? WHERE id=?""",
                        (
                            str(settings.get("name") or settings.get("businessName") or "").strip(),
                            str(settings.get("businessName") or settings.get("name") or "").strip(),
                            str(settings.get("name") or settings.get("businessName") or "").strip(),
                            str(settings.get("ruc") or "").strip(),
                            str(settings.get("email") or "").strip(),
                            str(settings.get("address") or "").strip(),
                            str(settings.get("phone") or "").strip(),
                            str(settings.get("operationStartDate") or "2026-10-01"),
                            str(settings.get("operationStartDate") or "2026-10-01")[:7],
                            company_id,
                        ),
                    )
                except (TypeError, ValueError):
                    raise HTTPException(422, detail={"code": "INVALID_COMPANY_SETTINGS", "message": "La configuración de la compañía no contiene JSON válido."})
        if payload.removed:
            db.executemany(
                "DELETE FROM client_state WHERE company_id=? AND storage_key=?",
                [(company_id, key) for key in payload.removed],
            )
        if payload.entries or payload.removed:
            audit(
                db,
                "SYSTEM-PERSISTENCE",
                None,
                "client_state.synchronized",
                {"updated": sorted(payload.entries), "removed": sorted(set(payload.removed))},
                company_id,
                request_actor_id(request),
            )
    return success(request, {"updated": len(payload.entries), "removed": len(set(payload.removed)), "synchronizedAt": stamp})
