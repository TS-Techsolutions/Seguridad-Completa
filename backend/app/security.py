from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .store import DB_PATH, connection

LEGACY_ENCRYPTED_PREFIX = "enc:v1:"
ENCRYPTED_PREFIX = "enc:v2:"
SESSION_COOKIE = "saga_session"
SESSION_TTL_SECONDS = 15 * 60
SESSION_VERSION = 2
PASSWORD_RECOVERY_TTL_SECONDS = 10 * 60
PASSWORD_RECOVERY_MAX_ATTEMPTS = 5
PASSWORD_SCHEME = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 310_000


class SecurityConfigurationError(RuntimeError):
    pass


def environment() -> str:
    return os.getenv("SAGA_ENVIRONMENT", "validation").strip().lower()


def is_production() -> bool:
    return environment() == "production"


def _decode_key(value: str, variable: str, expected_length: int = 32) -> bytes:
    try:
        key = base64.urlsafe_b64decode(value.encode("ascii"))
    except Exception as exc:
        raise SecurityConfigurationError(f"{variable} no contiene Base64 URL-safe válido.") from exc
    if len(key) != expected_length:
        raise SecurityConfigurationError(f"{variable} debe representar exactamente {expected_length} bytes.")
    return key


def _load_or_create_local_key(filename: str) -> bytes:
    path = DB_PATH.parent / filename
    if path.exists():
        return _decode_key(path.read_text(encoding="ascii").strip(), filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    key = secrets.token_bytes(32)
    encoded = base64.urlsafe_b64encode(key).decode("ascii")
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="ascii") as handle:
            handle.write(encoded)
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass
    except FileExistsError:
        return _decode_key(path.read_text(encoding="ascii").strip(), filename)
    return key


def _secret(variable: str, filename: str) -> bytes:
    configured = os.getenv(variable, "").strip()
    if configured:
        return _decode_key(configured, variable)
    if is_production():
        raise SecurityConfigurationError(
            f"{variable} es obligatorio en producción y debe suministrarse desde un gestor de secretos."
        )
    return _load_or_create_local_key(filename)


def encryption_key() -> bytes:
    return _secret("SAGA_DATA_ENCRYPTION_KEY", ".saga-data.key")


def session_key() -> bytes:
    return _secret("SAGA_SESSION_SECRET", ".saga-session.key")


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("La contraseña no puede estar vacía.")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return "$".join((
        PASSWORD_SCHEME,
        str(PASSWORD_ITERATIONS),
        base64.urlsafe_b64encode(salt).decode("ascii").rstrip("="),
        base64.urlsafe_b64encode(digest).decode("ascii").rstrip("="),
    ))


def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, iterations_text, salt_text, digest_text = encoded.split("$", 3)
        if scheme != PASSWORD_SCHEME:
            return False
        iterations = int(iterations_text)
        salt = base64.urlsafe_b64decode(salt_text + "=" * (-len(salt_text) % 4))
        expected = base64.urlsafe_b64decode(digest_text + "=" * (-len(digest_text) % 4))
        supplied = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(expected, supplied)
    except (ValueError, TypeError):
        return False


def hash_recovery_code(recovery_id: str, code: str) -> str:
    return hmac.new(
        session_key(),
        f"saga-v2|password-recovery|{recovery_id}|{code}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_recovery_code(recovery_id: str, code: str, encoded: str) -> bool:
    return hmac.compare_digest(hash_recovery_code(recovery_id, code), encoded)


def _aad(kind: str, company_id: str, record_key: str) -> bytes:
    return f"saga-v2|{kind}|{company_id}|{record_key}".encode("utf-8")


def _company_encryption_key(company_id: str) -> bytes:
    # La derivación separa criptográficamente empresas sin guardar una llave adicional en la base.
    return hmac.new(
        encryption_key(),
        f"saga-v2|company-key|{company_id}".encode("utf-8"),
        hashlib.sha256,
    ).digest()


def encrypt_value(value: str, kind: str, company_id: str, record_key: str) -> str:
    if value.startswith(ENCRYPTED_PREFIX):
        return value
    if value.startswith(LEGACY_ENCRYPTED_PREFIX):
        value = decrypt_value(value, kind, company_id, record_key)
    nonce = secrets.token_bytes(12)
    cipher = AESGCM(_company_encryption_key(company_id)).encrypt(
        nonce,
        value.encode("utf-8"),
        _aad(kind, company_id, record_key),
    )
    return ENCRYPTED_PREFIX + base64.urlsafe_b64encode(nonce + cipher).decode("ascii")


def decrypt_value(value: str, kind: str, company_id: str, record_key: str) -> str:
    if not value.startswith((ENCRYPTED_PREFIX, LEGACY_ENCRYPTED_PREFIX)):
        return value
    try:
        prefix = ENCRYPTED_PREFIX if value.startswith(ENCRYPTED_PREFIX) else LEGACY_ENCRYPTED_PREFIX
        packed = base64.urlsafe_b64decode(value[len(prefix):].encode("ascii"))
        key = _company_encryption_key(company_id) if prefix == ENCRYPTED_PREFIX else encryption_key()
        return AESGCM(key).decrypt(
            packed[:12],
            packed[12:],
            _aad(kind, company_id, record_key),
        ).decode("utf-8")
    except (InvalidTag, ValueError, UnicodeDecodeError) as exc:
        raise SecurityConfigurationError(
            "No se pudo autenticar un dato cifrado. Se bloqueó su lectura para evitar exponer información alterada."
        ) from exc


def migrate_sensitive_columns() -> None:
    """Encrypt legacy plaintext values in-place without changing their logical content."""
    with connection() as db:
        for row in db.execute("SELECT id,company_id,payload FROM screen_record").fetchall():
            if not row["payload"].startswith(ENCRYPTED_PREFIX):
                plaintext = decrypt_value(row["payload"], "screen_record", row["company_id"], row["id"])
                db.execute(
                    "UPDATE screen_record SET payload=? WHERE id=? AND company_id=?",
                    (encrypt_value(plaintext, "screen_record", row["company_id"], row["id"]), row["id"], row["company_id"]),
                )
        for row in db.execute("SELECT id,company_id,detail FROM audit_event").fetchall():
            if not row["detail"].startswith(ENCRYPTED_PREFIX):
                plaintext = decrypt_value(row["detail"], "audit_event", row["company_id"], row["id"])
                db.execute(
                    "UPDATE audit_event SET detail=? WHERE id=? AND company_id=?",
                    (encrypt_value(plaintext, "audit_event", row["company_id"], row["id"]), row["id"], row["company_id"]),
                )
        for row in db.execute("SELECT company_id,storage_key,value FROM client_state").fetchall():
            if not row["value"].startswith(ENCRYPTED_PREFIX):
                plaintext = decrypt_value(row["value"], "client_state", row["company_id"], row["storage_key"])
                db.execute(
                    "UPDATE client_state SET value=? WHERE company_id=? AND storage_key=?",
                    (
                        encrypt_value(plaintext, "client_state", row["company_id"], row["storage_key"]),
                        row["company_id"],
                        row["storage_key"],
                    ),
                )


def create_session_token(actor_id: str, now: int | None = None) -> str:
    issued_at = int(time.time() if now is None else now)
    payload = {
        "actor": actor_id,
        "iat": issued_at,
        "exp": issued_at + SESSION_TTL_SECONDS,
        "ver": SESSION_VERSION,
        "nonce": secrets.token_urlsafe(18),
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    ).decode("ascii").rstrip("=")
    signature = hmac.new(session_key(), encoded.encode("ascii"), hashlib.sha256).digest()
    return f"{encoded}.{base64.urlsafe_b64encode(signature).decode('ascii').rstrip('=')}"


def verify_session_token(token: str, now: int | None = None) -> dict[str, Any] | None:
    try:
        encoded, supplied_signature = token.split(".", 1)
        expected = hmac.new(session_key(), encoded.encode("ascii"), hashlib.sha256).digest()
        signature = base64.urlsafe_b64decode(supplied_signature + "=" * (-len(supplied_signature) % 4))
        if not hmac.compare_digest(expected, signature):
            return None
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        current = int(time.time() if now is None else now)
        if not isinstance(payload, dict) or payload.get("ver") != SESSION_VERSION or current >= int(payload.get("exp", 0)):
            return None
        actor = payload.get("actor")
        return payload if isinstance(actor, str) and actor else None
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def is_loopback(host: str | None) -> bool:
    normalized = (host or "").split("%", 1)[0].lower()
    return normalized in {"127.0.0.1", "::1", "localhost", "test", "testclient"}
