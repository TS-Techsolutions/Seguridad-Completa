# SAGA v2 — entorno de validación

Reconstrucción ejecutable y contract-first basada en los documentos v2 de la carpeta `contracts/`. El manifiesto y el menú original son la fuente de verdad de las 101 pantallas, sus rutas, campos, columnas, acciones, validaciones y pruebas trazadas.

## Qué incluye

- React + TypeScript + Vite con una interfaz de escritorio contable.
- Los nueve módulos del Excel corregido y su jerarquía completa: Administración Inmuebles, Email, Contabilidad, Caja Chica, CxP, CxC, Bancos, Tributación y Configuración General.
- 101 rutas navegables, con formularios, listados y fichas generados desde el contrato de cada pantalla.
- Variantes explícitas para XLS-079 (Emitidas/Recibidas) y XLS-098 (ATS/RDEP).
- API FastAPI con SQLite, auditoría, idempotencia y control del módulo inmobiliario.
- Pruebas automáticas de cobertura contractual y persistencia para las 101 pantallas.

## Ejecutar localmente

Terminal 1 — API:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Terminal 2 — aplicación web:

```powershell
pnpm dev
```

Abrir `http://127.0.0.1:4180`.

## Verificar

```powershell
pnpm build
cd backend
.\.venv\Scripts\python.exe -m pytest tests -q
```

## Sincronizar una corrección del menú

Reemplaza `contracts/fuente/Detalle de Pantallas.xlsx` por la versión aprobada y ejecuta:

```powershell
backend\.venv\Scripts\python.exe scripts\sync_menu_from_xlsx.py
```

El sincronizador exige 101 pantallas y coincidencia exacta de títulos antes de modificar los contratos JSON.

## Alcance del entorno

Este proyecto es una base integral para validar navegación, experiencia visual, contratos de pantalla y persistencia local. Las integraciones externas reales —SRI, correo, bancos, firma, pagos y producción— están deliberadamente bloqueadas: deben implementarse y certificarse por flujo antes de operar con datos reales.

## Estructura

- `contracts/`: documentos v2 y contratos sincronizados con `fuente/Detalle de Pantallas.xlsx`; este Excel corregido tiene precedencia únicamente para menú, padres, orden y rutas.
- `src/`: shell, navegación, pantallas y componentes del frontend.
- `backend/app/`: API, reglas transversales y almacenamiento SQLite.
- `backend/tests/`: cobertura automática del contrato completo.
- `docs/VALIDACION.md`: recorrido sugerido y criterios para aceptar cada corte.
