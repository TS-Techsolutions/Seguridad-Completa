"""Synchronize the contractual menu from contracts/fuente/Detalle de Pantallas.xlsx."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter


ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / "contracts"
SOURCE = CONTRACTS / "fuente" / "Detalle de Pantallas.xlsx"
MANIFEST_PATH = CONTRACTS / "03_Manifiesto_pantallas_v2.json"
MENU_PATH = CONTRACTS / "03_Menu_original_v2.json"
MODULES_DIR = CONTRACTS / "pantallas_por_modulo"
PATH_REPLACEMENTS = {
    "Contabilidad > Caja Chica": "Caja Chica",
    "Contabilidad > CxP": "CxP",
    "Contabilidad > CxC": "CxC",
    "Contabilidad > Bancos": "Bancos",
    "/contabilidad/caja-chica": "/caja-chica",
    "/contabilidad/cxp": "/cxp",
    "/contabilidad/cxc": "/cxc",
    "/contabilidad/bancos": "/bancos",
}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def remap_value(value):
    if isinstance(value, dict):
        return {key: remap_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [remap_value(item) for item in value]
    if isinstance(value, str):
        for old, new in PATH_REPLACEMENTS.items():
            value = value.replace(old, new)
    return value


def workbook_rows() -> list[dict]:
    sheet = load_workbook(SOURCE, read_only=True, data_only=True).active
    result: list[dict] = []
    for row_number, row in enumerate(sheet.iter_rows(), 1):
        populated = [(index, cell.value) for index, cell in enumerate(row) if cell.value is not None]
        if not populated:
            continue
        column_index, label = populated[0]
        result.append({"row": row_number, "level": column_index - 1, "column": column_index + 1, "label": str(label).strip()})
    return result


def build_contract(rows: list[dict], screens: list[dict]) -> tuple[list[dict], dict[str, dict]]:
    leaf_indexes = {index for index, row in enumerate(rows) if index == len(rows) - 1 or rows[index + 1]["level"] <= row["level"]}
    if len(leaf_indexes) != len(screens):
        raise RuntimeError(f"El Excel contiene {len(leaf_indexes)} pantallas y el manifiesto {len(screens)}")

    nodes: list[dict] = []
    screen_nodes: dict[str, dict] = {}
    parents: dict[int, dict] = {}
    screen_cursor = 0
    for index, row in enumerate(rows):
        level = row["level"]
        parent = parents.get(level - 1)
        breadcrumb = ([*parent["breadcrumb"]] if parent else []) + [row["label"]]
        node_id = f"NODE-{get_column_letter(row['column'])}{row['row']}"
        is_screen = index in leaf_indexes
        screen = screens[screen_cursor] if is_screen else None
        route = "/" + "/".join(slug(segment) for segment in breadcrumb) if screen else None
        node = {
            "node_id": node_id,
            "celda": f"{get_column_letter(row['column'])}{row['row']}",
            "label": row["label"],
            "level": level,
            "parent_id": parent["node_id"] if parent else None,
            "order": row["row"],
            "breadcrumb": breadcrumb,
            "type": "screen" if screen else "group",
            "screen_id": screen["id"] if screen else None,
            "route": route,
            "package": screen["paquete"] if screen else None,
        }
        nodes.append(node)
        parents[level] = node
        for stale_level in [key for key in parents if key > level]:
            del parents[stale_level]
        if screen:
            if slug(screen["titulo_original"]) != slug(row["label"]):
                raise RuntimeError(f"No coincide {screen['id']}: {screen['titulo_original']} != {row['label']}")
            screen_nodes[screen["id"]] = node
            screen_cursor += 1
    return nodes, screen_nodes


def main() -> None:
    manifest = read_json(MANIFEST_PATH)
    rows = workbook_rows()
    nodes, screen_nodes = build_contract(rows, manifest["pantallas"])
    roots = [node for node in nodes if node["level"] == 0]

    for screen in manifest["pantallas"]:
        node = screen_nodes[screen["id"]]
        screen["fila"] = node["order"]
        screen["celda"] = node["celda"]
        screen["nivel"] = node["level"] + 2
        screen["texto_original"] = node["label"]
        screen["ruta_original"] = " > ".join(node["breadcrumb"])
        screen["ruta_menu_original"] = " > ".join(node["breadcrumb"])
        screen["ruta_react"] = node["route"]
        screen["modulo"] = node["breadcrumb"][0]

    manifest = remap_value(manifest)

    manifest["source"] = "Detalle de Pantallas.xlsx / Hoja1"
    manifest["menu_node_count"] = len(nodes)
    manifest["precedencia"] = "Conservar la distribución exacta del Excel corregido: nueve módulos raíz, sus submódulos y el orden de las 101 pantallas."
    manifest["menu_original"] = nodes
    write_json(MANIFEST_PATH, manifest)

    menu = {
        "version": manifest["version"],
        "fuente": "Detalle de Pantallas.xlsx / Hoja1",
        "regla": "Preservar etiquetas, orden, padres y accesos del Excel corregido. Cada pantalla conserva un ID y una ruta únicos.",
        "nodes": nodes,
    }
    write_json(MENU_PATH, menu)

    existing_screens: dict[str, dict] = {}
    for path in MODULES_DIR.glob("*.json"):
        for screen in read_json(path).get("pantallas", []):
            existing_screens[screen["id"]] = screen

    output_names = {
        root["label"]: f"{index:02d}_{root['label'].replace(' ', '_')}.json"
        for index, root in enumerate(roots, 1)
    }
    for root in roots:
        module_screens = []
        for screen in manifest["pantallas"]:
            node = screen_nodes[screen["id"]]
            if node["breadcrumb"][0] != root["label"]:
                continue
            detail = remap_value(existing_screens[screen["id"]])
            detail["fila"] = node["order"]
            detail["celda"] = node["celda"]
            detail["nivel"] = node["level"] + 2
            detail["texto_original"] = node["label"]
            detail["ruta_original"] = " > ".join(node["breadcrumb"])
            detail["ruta_menu_original"] = " > ".join(node["breadcrumb"])
            detail["ruta_react"] = node["route"]
            detail["modulo"] = root["label"]
            module_screens.append(detail)
        write_json(MODULES_DIR / output_names[root["label"]], {
            "version": manifest["version"],
            "modulo": root["label"],
            "estado": "ESPECIFICACIÓN; no auditado ni ejecutado",
            "pantallas": module_screens,
        })

    print(f"Sincronizados {len(roots)} módulos, {len(nodes)} nodos y {len(screen_nodes)} pantallas.")


if __name__ == "__main__":
    main()
