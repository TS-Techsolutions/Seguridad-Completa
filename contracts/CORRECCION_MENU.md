# Corrección de distribución del menú

`fuente/Detalle de Pantallas.xlsx` reemplaza la distribución de menú inferida en el paquete documental inicial.

La corrección afecta únicamente módulos raíz, submódulos, padres, orden, breadcrumbs y rutas React. Los IDs XLS-001 a XLS-101, títulos, objetivos, campos, acciones, validaciones y pruebas funcionales conservan su definición v2.

Los módulos raíz vigentes, en orden, son:

1. Administración Inmuebles
2. Email
3. Contabilidad
4. Caja Chica
5. CxP
6. CxC
7. Bancos
8. Tributación
9. Configuración General

Los contratos ejecutables `03_Menu_original_v2.json`, `03_Manifiesto_pantallas_v2.json` y `pantallas_por_modulo/*.json` se generan mediante `scripts/sync_menu_from_xlsx.py`.
