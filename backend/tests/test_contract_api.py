import os
from pathlib import Path

os.environ["SAGA_V2_DATABASE_PATH"] = str(Path(__file__).parent / "test_saga_v2_contract.db")

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.main import ACTOR_ID, COMPANY_ID, ClientStateUpdate, CompanyGroupCreate, PlatformCompanyCreate, RecordCreate, all_menu_nodes, all_screens, authorize_screen, catalog, create_company_group, create_platform_company, create_record, ensure_seeded, human_talent_catalog, list_company_groups, list_platform_companies, list_records, manifest, personal_information_catalog, read_client_state, security_general_catalog, session_companies, validate_request_access, write_client_state
from app.security import ENCRYPTED_PREFIX, SecurityConfigurationError, create_session_token, decrypt_value, verify_session_token
from app.store import DB_PATH, connection, initialize


def setup_module():
    if DB_PATH.exists():
        DB_PATH.unlink()
    initialize()


def request(company_id: str = COMPANY_ID, actor_id: str = ACTOR_ID) -> Request:
    value = Request({"type": "http", "method": "POST", "path": "/test", "headers": [], "query_string": b"", "server": ("test", 80), "client": ("test", 1), "scheme": "http"})
    value.state.request_id = "pytest"
    value.state.company_id = company_id
    value.state.actor_id = actor_id
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


def test_client_state_is_persisted_by_company_and_can_be_removed():
    payload = ClientStateUpdate(entries={"saga.customers": '[{"id":"cliente-1"}]'})
    result = write_client_state(payload, request())
    assert result["data"]["updated"] == 1
    state = read_client_state(request())["data"]["entries"]
    assert state["saga.customers"]["value"] == '[{"id":"cliente-1"}]'
    assert state["saga.customers"]["version"] == 1

    write_client_state(ClientStateUpdate(entries={"saga.customers": '[{"id":"cliente-2"}]'}), request())
    state = read_client_state(request())["data"]["entries"]
    assert state["saga.customers"]["version"] == 2

    write_client_state(ClientStateUpdate(removed=["saga.customers"]), request())
    assert "saga.customers" not in read_client_state(request())["data"]["entries"]


def test_new_tenant_is_provisioned_and_state_is_isolated():
    payload = PlatformCompanyCreate(
        tenant_name="Tenant Pruebas",
        plan="PROFESIONAL",
        legal_name="Empresa Tenant Pruebas S.A.",
        trade_name="Tenant Pruebas",
        ruc="1799999999001",
        email="empresa@tenant.test",
        address="Quito",
        phone="020000000",
        operation_start_date="2026-10-01",
        billing_type="EXPENSAS",
        generation_type="CLIENTE",
        bills_water=False,
        modules=["ACCOUNTING_CORE", "PROPERTY_MANAGEMENT"],
        primary_color="#5265ee",
        sidebar_color="#151b2b",
        admin_name="Administrador Tenant",
        admin_email="admin@tenant.test",
        admin_username="admin.tenant",
    )
    created = create_platform_company(payload, request())["data"]
    company_id = created["id"]
    with connection() as db:
        assert db.execute("SELECT COUNT(*) AS n FROM tenant WHERE id=?", (created["tenantId"],)).fetchone()["n"] == 1
        assert db.execute("SELECT COUNT(*) AS n FROM company_user WHERE company_id=?", (company_id,)).fetchone()["n"] == 1
        assert db.execute("SELECT COUNT(*) AS n FROM company_module WHERE company_id=?", (company_id,)).fetchone()["n"] == 2
    tenant_state = read_client_state(request(company_id))["data"]["entries"]
    assert "saga.security.company" in tenant_state
    write_client_state(ClientStateUpdate(entries={"saga.tenant-only": '"aislado"'}), request(company_id))
    assert "saga.tenant-only" in read_client_state(request(company_id))["data"]["entries"]
    assert "saga.tenant-only" not in read_client_state(request())["data"]["entries"]


def test_sensitive_state_is_encrypted_at_rest_and_authenticated():
    secret = '{"saldoProveedor":"987654.32","cliente":"Dato sensible"}'
    write_client_state(ClientStateUpdate(entries={"saga.security-test": secret}), request())
    with connection() as db:
        raw = db.execute(
            "SELECT value FROM client_state WHERE company_id=? AND storage_key=?",
            (COMPANY_ID, "saga.security-test"),
        ).fetchone()["value"]
    assert raw.startswith(ENCRYPTED_PREFIX)
    assert "987654.32" not in raw
    assert read_client_state(request())["data"]["entries"]["saga.security-test"]["value"] == secret
    with pytest.raises(SecurityConfigurationError):
        decrypt_value(raw, "client_state", "cmp-another-company", "saga.security-test")


def test_session_signature_rejects_tampering():
    token = create_session_token(ACTOR_ID, now=1_000)
    assert verify_session_token(token, now=1_001)["actor"] == ACTOR_ID
    altered = token[:-1] + ("A" if token[-1] != "A" else "B")
    assert verify_session_token(altered, now=1_001) is None


def test_company_member_cannot_cross_company_boundary():
    restricted_user = "usr-restricted-test"
    other_tenant = "tenant-isolation-test"
    other_company = "cmp-isolation-test"
    with connection() as db:
        db.execute(
            "INSERT INTO tenant(id,name,plan,status,created_at) VALUES(?,?,?,?,?)",
            (other_tenant, "Tenant aislado", "BASE", "ACTIVE", "2026-10-30T00:00:00Z"),
        )
        db.execute(
            "INSERT INTO company(id,name,ruc,environment,period,tenant_id,legal_name,trade_name,email,address,phone,timezone,currency,operation_start_date,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (other_company, "Empresa aislada", "1790000000009", "VALIDATION", "2026-10", other_tenant, "Empresa aislada S.A.", "Empresa aislada", "aislada@test.local", "Quito", "020000000", "America/Guayaquil", "USD", "2026-10-01", "ACTIVE", "2026-10-30T00:00:00Z"),
        )
        db.execute(
            "INSERT INTO platform_user(id,username,name,email,role,status,created_at) VALUES(?,?,?,?,?,?,?)",
            (restricted_user, "restricted.test", "Usuario Restringido", "restricted@test.local", "COMPANY_ADMIN", "ACTIVE", "2026-10-30T00:00:00Z"),
        )
        db.execute("INSERT INTO company_user(company_id,user_id,role) VALUES(?,?,?)", (COMPANY_ID, restricted_user, "ADMIN"))
    with pytest.raises(HTTPException) as denied:
        validate_request_access(restricted_user, other_company)
    assert denied.value.status_code == 403
    assert denied.value.detail["code"] == "COMPANY_ACCESS_DENIED"


def test_group_admin_is_limited_to_exactly_the_assigned_companies():
    second_payload = PlatformCompanyCreate(
        tenant_name="Tenant Grupo Dos", plan="BASE", legal_name="Compañía Grupo Dos S.A.",
        trade_name="Grupo Dos", ruc="1799999999002", email="grupo2@tenant.test", address="Quito",
        phone="020000002", operation_start_date="2026-10-01", billing_type="EXPENSAS",
        generation_type="CLIENTE", bills_water=False, modules=["ACCOUNTING_CORE"],
        primary_color="#5265ee", sidebar_color="#151b2b", admin_name="Admin Grupo Dos",
        admin_email="admin.grupo2@tenant.test", admin_username="admin.grupo2",
    )
    second = create_platform_company(second_payload, request())["data"]
    group_payload = CompanyGroupCreate(
        name="Grupo Administrativo Pruebas", description="Alcance aislado de validación",
        company_ids=[COMPANY_ID, second["id"]], admin_name="Administrador de Grupo",
        admin_email="grupo.admin@tenant.test", admin_username="grupo.admin",
        permissions=["USERS_MANAGE", "PERMISSIONS_MANAGE", "ACCESS_MANAGE"],
    )
    group = create_company_group(group_payload, request())["data"]
    assert {item["id"] for item in group["companies"]} == {COMPANY_ID, second["id"]}
    assert group["admins"][0]["permissions"] == ["ACCESS_MANAGE", "PERMISSIONS_MANAGE", "USERS_MANAGE"]
    group_admin_id = group["admins"][0]["id"]

    validate_request_access(group_admin_id, COMPANY_ID)
    validate_request_access(group_admin_id, second["id"])
    visible = list_platform_companies(request(COMPANY_ID, group_admin_id))["data"]
    assert {item["id"] for item in visible} == {COMPANY_ID, second["id"]}
    bootstrap_visible = session_companies(request("cmp-not-authorized", group_admin_id))["data"]
    assert {item["id"] for item in bootstrap_visible} == {COMPANY_ID, second["id"]}
    visible_groups = list_company_groups(request(COMPANY_ID, group_admin_id))["data"]
    assert [item["id"] for item in visible_groups] == [group["id"]]
    restricted_request = request(COMPANY_ID, group_admin_id)
    restricted_catalog = catalog(restricted_request)["data"]
    assert {screen["id"] for screen in restricted_catalog["screens"]} == {"SEC-001", "SEC-002", "SEC-003"}
    write_client_state(ClientStateUpdate(entries={"saga.financial-secret": '{"saldo":"999999.99"}'}), request())
    restricted_state = read_client_state(restricted_request)["data"]
    assert restricted_state["scope"] == "GROUP_SECURITY_ADMIN"
    assert "saga.financial-secret" not in restricted_state["entries"]
    with pytest.raises(HTTPException) as state_denied:
        write_client_state(ClientStateUpdate(entries={"saga.financial-secret": '"alterado"'}), restricted_request)
    assert state_denied.value.detail["code"] == "GROUP_ADMIN_STATE_DENIED"
    with pytest.raises(HTTPException) as screen_denied:
        list_records("XLS-059", restricted_request)
    assert screen_denied.value.detail["code"] == "GROUP_ADMIN_SCREEN_DENIED"

    outside_company = "cmp-outside-group"
    outside_tenant = "tenant-outside-group"
    with connection() as db:
        db.execute("INSERT INTO tenant(id,name,plan,status,created_at) VALUES(?,?,?,?,?)", (outside_tenant, "Tenant externo", "BASE", "ACTIVE", "2026-10-30T00:00:00Z"))
        db.execute(
            "INSERT INTO company(id,name,ruc,environment,period,tenant_id,legal_name,trade_name,email,address,phone,timezone,currency,operation_start_date,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (outside_company, "Compañía externa", "1790000000010", "VALIDATION", "2026-10", outside_tenant, "Compañía externa S.A.", "Externa", "externa@test.local", "Quito", "020000010", "America/Guayaquil", "USD", "2026-10-01", "ACTIVE", "2026-10-30T00:00:00Z"),
        )
    with pytest.raises(HTTPException) as denied:
        validate_request_access(group_admin_id, outside_company)
    assert denied.value.status_code == 403
    assert denied.value.detail["code"] == "COMPANY_ACCESS_DENIED"
