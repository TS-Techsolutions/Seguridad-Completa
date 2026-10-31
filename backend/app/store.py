from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.getenv("SAGA_V2_DATABASE_PATH", ROOT / "backend" / "data" / "saga-v2.db"))


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=5000")
    db.execute("PRAGMA secure_delete=ON")
    db.execute("PRAGMA trusted_schema=OFF")
    db.execute("PRAGMA synchronous=FULL")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def initialize() -> None:
    with connection() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS tenant (
              id TEXT PRIMARY KEY, name TEXT NOT NULL, plan TEXT NOT NULL,
              status TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS platform_user (
              id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE, role TEXT NOT NULL, status TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS company (
              id TEXT PRIMARY KEY, name TEXT NOT NULL, ruc TEXT NOT NULL UNIQUE,
              environment TEXT NOT NULL, period TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tenant_user (
              tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL,
              PRIMARY KEY(tenant_id, user_id),
              FOREIGN KEY(tenant_id) REFERENCES tenant(id),
              FOREIGN KEY(user_id) REFERENCES platform_user(id)
            );
            CREATE TABLE IF NOT EXISTS company_user (
              company_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL,
              PRIMARY KEY(company_id, user_id),
              FOREIGN KEY(company_id) REFERENCES company(id),
              FOREIGN KEY(user_id) REFERENCES platform_user(id)
            );
            CREATE TABLE IF NOT EXISTS company_group (
              id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL,
              status TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
              FOREIGN KEY(created_by) REFERENCES platform_user(id)
            );
            CREATE TABLE IF NOT EXISTS company_group_company (
              group_id TEXT NOT NULL, company_id TEXT NOT NULL UNIQUE,
              PRIMARY KEY(group_id, company_id),
              FOREIGN KEY(group_id) REFERENCES company_group(id) ON DELETE CASCADE,
              FOREIGN KEY(company_id) REFERENCES company(id) ON DELETE RESTRICT
            );
            CREATE TABLE IF NOT EXISTS company_group_admin (
              group_id TEXT NOT NULL, user_id TEXT NOT NULL,
              permissions TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL,
              PRIMARY KEY(group_id, user_id),
              FOREIGN KEY(group_id) REFERENCES company_group(id) ON DELETE CASCADE,
              FOREIGN KEY(user_id) REFERENCES platform_user(id) ON DELETE RESTRICT
            );
            CREATE TABLE IF NOT EXISTS company_module (
              company_id TEXT NOT NULL, code TEXT NOT NULL, state TEXT NOT NULL,
              effective_at TEXT NOT NULL, reason TEXT NOT NULL,
              PRIMARY KEY(company_id, code), FOREIGN KEY(company_id) REFERENCES company(id)
            );
            CREATE TABLE IF NOT EXISTS screen_record (
              id TEXT PRIMARY KEY, company_id TEXT NOT NULL, screen_id TEXT NOT NULL,
              reference TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL,
              version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL, idempotency_key TEXT,
              FOREIGN KEY(company_id) REFERENCES company(id),
              UNIQUE(company_id, screen_id, reference),
              UNIQUE(company_id, idempotency_key)
            );
            CREATE TABLE IF NOT EXISTS audit_event (
              id TEXT PRIMARY KEY, company_id TEXT NOT NULL, screen_id TEXT NOT NULL,
              record_id TEXT, actor TEXT NOT NULL, action TEXT NOT NULL,
              detail TEXT NOT NULL, occurred_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS client_state (
              company_id TEXT NOT NULL, storage_key TEXT NOT NULL,
              value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
              updated_at TEXT NOT NULL, actor TEXT NOT NULL,
              PRIMARY KEY(company_id, storage_key),
              FOREIGN KEY(company_id) REFERENCES company(id)
            );
            CREATE INDEX IF NOT EXISTS idx_screen_record_company_screen
              ON screen_record(company_id, screen_id, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_event_company_time
              ON audit_event(company_id, occurred_at DESC);
            CREATE INDEX IF NOT EXISTS idx_company_user_user_company
              ON company_user(user_id, company_id);
            CREATE INDEX IF NOT EXISTS idx_company_group_admin_user
              ON company_group_admin(user_id, group_id);
            CREATE INDEX IF NOT EXISTS idx_company_group_company_group
              ON company_group_company(group_id, company_id);
            """
        )
        existing_company_columns = {row["name"] for row in db.execute("PRAGMA table_info(company)")}
        company_columns = {
            "tenant_id": "TEXT",
            "legal_name": "TEXT NOT NULL DEFAULT ''",
            "trade_name": "TEXT NOT NULL DEFAULT ''",
            "email": "TEXT NOT NULL DEFAULT ''",
            "address": "TEXT NOT NULL DEFAULT ''",
            "phone": "TEXT NOT NULL DEFAULT ''",
            "timezone": "TEXT NOT NULL DEFAULT 'America/Guayaquil'",
            "currency": "TEXT NOT NULL DEFAULT 'USD'",
            "operation_start_date": "TEXT NOT NULL DEFAULT '2026-10-01'",
            "status": "TEXT NOT NULL DEFAULT 'ACTIVE'",
            "created_at": "TEXT NOT NULL DEFAULT '2026-10-25T00:00:00Z'",
            "last_access_at": "TEXT",
        }
        for name, definition in company_columns.items():
            if name not in existing_company_columns:
                db.execute(f"ALTER TABLE company ADD COLUMN {name} {definition}")

        tenant_id = "tenant-demo-saga"
        company_id = "cmp-demo-ecuador"
        admin_id = "usr-platform-admin"
        stamp = "2026-10-25T00:00:00Z"
        db.execute(
            "INSERT OR IGNORE INTO tenant(id,name,plan,status,created_at) VALUES(?,?,?,?,?)",
            (tenant_id, "Tenant demostración SAGA", "COMPLETO", "ACTIVE", stamp),
        )
        db.execute(
            "INSERT OR IGNORE INTO platform_user(id,username,name,email,role,status,created_at) VALUES(?,?,?,?,?,?,?)",
            (admin_id, "jorge.admin", "Jorge Mendoza", "jorge@empresa.com", "PLATFORM_ADMIN", "ACTIVE", stamp),
        )
        db.execute(
            "INSERT OR IGNORE INTO company(id,name,ruc,environment,period,tenant_id,legal_name,trade_name,email,address,phone,timezone,currency,operation_start_date,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (company_id, "Grupo SAGA Demo Cía. Ltda.", "1790012345001", "VALIDATION", "2026-10", tenant_id, "Grupo SAGA Demo Cía. Ltda.", "SAGA Demo", "prueba@hotmail.com", "Quito, Ecuador", "02 400 0000", "America/Guayaquil", "USD", "2026-10-01", "ACTIVE", stamp),
        )
        db.execute(
            "UPDATE company SET tenant_id=COALESCE(tenant_id,?), legal_name=CASE WHEN legal_name='' THEN name ELSE legal_name END, trade_name=CASE WHEN trade_name='' THEN name ELSE trade_name END WHERE id=?",
            (tenant_id, company_id),
        )
        db.execute("INSERT OR IGNORE INTO tenant_user(tenant_id,user_id,role) VALUES(?,?,?)", (tenant_id, admin_id, "OWNER"))
        db.execute("INSERT OR IGNORE INTO company_user(company_id,user_id,role) VALUES(?,?,?)", (company_id, admin_id, "ADMIN"))
        for code, state, reason in [
            ("ACCOUNTING_CORE", "ENABLED", "Paquete base de validación"),
            ("PROPERTY_MANAGEMENT", "ENABLED", "Extensión habilitada para validación")
        ]:
            db.execute("INSERT OR IGNORE INTO company_module VALUES (?, ?, ?, ?, ?)", (company_id, code, state, stamp, reason))
    try:
        os.chmod(DB_PATH, 0o600)
    except OSError:
        pass
    # La migración se ejecuta fuera de la transacción de esquema para no anidar conexiones.
    from .security import migrate_sensitive_columns

    migrate_sensitive_columns()
