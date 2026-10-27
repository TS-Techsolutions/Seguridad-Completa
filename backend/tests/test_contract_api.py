import os
from pathlib import Path

os.environ["SAGA_V2_DATABASE_PATH"] = str(Path(__file__).parent / "test_saga_v2_contract.db")

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.main import COMPANY_ID, RecordCreate, all_menu_nodes, all_screens, authorize_screen, create_record, ensure_seeded, human_talent_catalog, manifest, personal_information_catalog, security_general_catalog
from app.store import DB_PATH, connection, initialize


def setup_module():
    if DB_PATH.exists():
        DB_PATH.unlink()
    initialize()


def request() -> Request:
    value = Request({"type": "http", "method": "POST", "path": "/test", "headers": [], "query_string": b"", "server": ("test", 80), "client": ("test", 1), "scheme": "http"})
    value.state.request_id = "pytest"
    return value


def test_contract_contains_101_unique_screens_and_routes():
    screens = manifest()["pantallas"]
    assert len(screens) == 101
    assert len({screen["id"] for screen in screens}) == 101
    assert len({screen["ruta_react"] for screen in screens}) == 101


def test_corrected_menu_contains_nine_roots_in_excel_order():
    roots = [node["label"] for node in manifest()["menu_original"] if node["level"] == 0]
    assert roots == ["Administración Inmuebles", "Email", "Contabilidad", "Caja Chica", "CxP", "CxC", "Bancos", "Tributación", "Configuración General"]
    routes = {screen["id"]: screen["ruta_react"] for screen in manifest()["pantallas"]}
    assert routes["XLS-039"] == "/caja-chica/registro-de-caja-chica"
    assert routes["XLS-041"] == "/cxp/proveedores/grupo-de-proveedores"
    assert routes["XLS-059"] == "/cxc/clientes/registro-clientes"
    assert routes["XLS-085"] == "/bancos/cuentas-bancarias"


def test_human_talent_is_copied_after_tax_module():
    screens = human_talent_catalog()["screens"]
    assert len(screens) == 35
    assert len({screen["ruta_react"] for screen in screens}) == 35
    assert all(screen["titulo_original"] != "Asignación de Empleados" for screen in screens)
    assert all(screen["id"] != "HR-013" for screen in screens)
    roots = [node["label"] for node in all_menu_nodes() if node["level"] == 0]
    assert roots[roots.index("Tributación") + 1] == "Talento Humano"
    assert roots[roots.index("Talento Humano") + 1] == "Información Personal"


def test_personal_information_is_copied_without_schedule():
    screens = personal_information_catalog()["screens"]
    assert [screen["titulo_original"] for screen in screens] == ["Mi Perfil", "Novedades", "Vacaciones", "Roles de Pago", "Mi Historial"]
    assert all(screen["titulo_original"] != "Mi Horario" for screen in screens)
    assert len({screen["ruta_react"] for screen in screens}) == 5
    roots = [node["label"] for node in all_menu_nodes() if node["level"] == 0]
    talent_index = roots.index("Talento Humano")
    assert roots[talent_index:talent_index + 3] == ["Talento Humano", "Información Personal", "Configuración General"]


def test_receivables_and_payables_are_before_accounting():
    roots = [node["label"] for node in all_menu_nodes() if node["level"] == 0]
    assert roots[:5] == ["Administración Inmuebles", "Email", "CxC", "CxP", "Contabilidad"]


def test_security_general_configuration_screens_are_copied_into_existing_module():
    screens = security_general_catalog()["screens"]
    assert [screen["titulo_original"] for screen in screens] == ["Usuarios", "Roles", "Permisos", "Compañía", "Envío de Correos", "Tipo Documento"]
    assert len({screen["ruta_react"] for screen in screens}) == 6
    configuration_nodes = [node for node in all_menu_nodes() if node["breadcrumb"][0] == "Configuración General" and node["type"] == "screen"]
    assert len(configuration_nodes) == 7
    assert configuration_nodes[0]["screen_id"] == "SEC-004"
    assert all(node["screen_id"] != "XLS-100" for node in configuration_nodes)
    assert len(all_screens()) == 145
    assert all(screen["id"] not in {"XLS-002", "XLS-100"} for screen in all_screens())
    assert all(node.get("screen_id") != "XLS-002" for node in all_menu_nodes())


def test_each_screen_can_persist_and_reload_records():
    for screen in manifest()["pantallas"]:
        ensure_seeded(screen)
        with connection() as db:
            count = db.execute("SELECT COUNT(*) AS n FROM screen_record WHERE company_id=? AND screen_id=?", (COMPANY_ID, screen["id"])).fetchone()["n"]
        assert count >= 3, screen["id"]


def test_record_creation_is_idempotent():
    screen = next(screen for screen in manifest()["pantallas"] if screen["id"] == "XLS-027")
    values = {field["nombre"]: "Valor de prueba" for field in screen["filtros_campos"] if field.get("obligatorio")}
    payload = RecordCreate(values=values)
    first = create_record("XLS-027", payload, request(), "test-xls-027")
    second = create_record("XLS-027", payload, request(), "test-xls-027")
    assert first["data"]["id"] == second["data"]["id"]


def test_property_module_blocks_writes_when_disabled():
    screen = next(screen for screen in manifest()["pantallas"] if screen["id"] == "XLS-001")
    with connection() as db:
        db.execute("UPDATE company_module SET state='DISABLED' WHERE company_id=? AND code='PROPERTY_MANAGEMENT'", (COMPANY_ID,))
    with pytest.raises(HTTPException) as error:
        authorize_screen(screen, COMPANY_ID, write=True)
    assert error.value.status_code == 403
    assert error.value.detail["code"] == "MODULE_DISABLED"
    with connection() as db:
        db.execute("UPDATE company_module SET state='ENABLED' WHERE company_id=? AND code='PROPERTY_MANAGEMENT'", (COMPANY_ID,))
