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
            CREATE TABLE IF NOT EXISTS company (
              id TEXT PRIMARY KEY, name TEXT NOT NULL, ruc TEXT NOT NULL UNIQUE,
              environment TEXT NOT NULL, period TEXT NOT NULL
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
            """
        )
        company_id = "cmp-demo-ecuador"
        db.execute("INSERT OR IGNORE INTO company VALUES (?, ?, ?, ?, ?)", (company_id, "Grupo SAGA Demo Cía. Ltda.", "1790012345001", "VALIDATION", "2026-10"))
        for code, state, reason in [
            ("ACCOUNTING_CORE", "ENABLED", "Paquete base de validación"),
            ("PROPERTY_MANAGEMENT", "ENABLED", "Extensión habilitada para validación")
        ]:
            db.execute("INSERT OR IGNORE INTO company_module VALUES (?, ?, ?, ?, ?)", (company_id, code, state, "2026-10-25T00:00:00Z", reason))
