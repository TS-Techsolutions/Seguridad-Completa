# Catálogo de las 101 pantallas y sus procesos — versión 2

**Proyecto:** SAGA. **Fecha:** 25 de octubre de 2026. **Autor:** Manus AI. **Estado:** especificación para aprobación; no demuestra que la aplicación anterior esté construida.

Cada ficha define una pantalla propia en el menú y una URL propia. Compartir componentes React o servicios FastAPI no permite fusionar opciones. Los títulos y ubicaciones son los del Excel; las correcciones semánticas se presentan como ayudas, pestañas o selectores. La distribución completa aparece en `05_Distribucion_original_v2.md` y en el manifiesto.

La evidencia de aceptación por pantalla incluye recorrido desde menú, URL/título, operación positiva, rechazo negativo, permisos, persistencia tras recarga y efecto en auxiliares/asientos/reportes cuando aplique. Todas las pruebas siguientes son propuestas: no se han ejecutado en la aplicación que construyó otra IA.

## Administración Inmuebles

### XLS-001 — Tipo de Inmueble

**Ubicación original:** Administración Inmuebles > General > Tipo de Inmueble. **Celda:** D6. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/general/tipo-de-inmueble`.

**Objetivo y vista:** Administrar, por empresa y condominio, los tipos de unidad que podrán asignarse a un inmueble. Pantalla dedicada con encabezado que conserva el título original, selector de empresa y condominio, tabla paginada, búsqueda por código/nombre, filtro de estado y panel lateral de alta o edición.

**Campos y filtros:** Empresa (selector; requerido; empresa autorizada y activa); Condominio (selector; requerido; pertenece a la empresa y está disponible para el módulo); Código (texto; requerido; único por empresa/condominio, normalizado, no vacío); Nombre (texto; requerido; longitud permitida y descripción no duplicada vigente); Estado (selector; requerido; ACTIVE o INACTIVE; inactivar exige motivo).

**Columnas visibles:** Código; Nombre; Condominio; Estado; Unidades asociadas; Vigencia desde; Última modificación; Usuario.

**Acciones y permisos:** Crear tipo → crea registro versionado sin asiento contable [permiso: property.type.create]; Modificar borrador → guarda cambios no publicados y deja auditoría [permiso: property.type.update]; Inactivar → impide nuevas asignaciones y conserva historia [permiso: property.type.deactivate]; Consultar historial → muestra vigencias, usos y eventos [permiso: property.type.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y condominio; verificar módulo y permiso.
2. Capturar código, nombre y estado en formulario validado.
3. Validar unicidad, referencias existentes y versión concurrente.
4. Solicitar aprobación cuando la política de empresa lo exija.
5. Guardar la versión y registrar auditoría; no publicar asiento.
6. Consultar usos y vigencias desde la misma pantalla.

**Estados:** tipo: módulo; valores: ENABLED; READ_ONLY; DISABLED; tipo: registro; valores: DRAFT; ACTIVE; INACTIVE; tipo: aprobación; valores: NOT_REQUIRED; PENDING; APPROVED; REJECTED. **Validaciones:** RLS por tenant, empresa y condominio.; Rechazar código duplicado incluso ante concurrencia.; Impedir eliminación física si existe uso; usar inactivación.; Con módulo DISABLED, lecturas históricas permitidas y escritura responde 403 MODULE_DISABLED.; La aprobación queda invalidada si cambia el contenido..

**Persistencia e impacto contable:** No genera ni modifica asientos. El código puede ser referenciado por dimensiones y reportes inmobiliarios; una inactivación no altera documentos publicados ni cargos históricos.

**API propia propuesta:** GET /api/v1/property/types; POST /api/v1/property/types; PATCH /api/v1/property/types/{id}; POST /api/v1/property/types/{id}/deactivate; GET /api/v1/property/types/{id}/history. **Pantallas relacionadas:** XLS-002; XLS-003; XLS-005. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Una empresa con módulo ENABLED y un condominio autorizado; cuando: el usuario crea el código UNI-001 y nombre Departamento, y aprueba la versión; entonces: el tipo queda ACTIVE, aparece en el listado y no existe movimiento contable

**Prueba negativa:** dado: Existe UNI-001 usado por una unidad; cuando: el usuario intenta duplicarlo o eliminarlo; entonces: la API rechaza la operación, conserva el original y explica la referencia

**Evidencias/pruebas exigidas:** `T-UI-XLS-001`, `T-PROC-XLS-001`, `T-NEG-XLS-001`.

### XLS-002 — Niveles de Piso

**Ubicación original:** Administración Inmuebles > General > Niveles de Piso. **Celda:** D7. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/general/niveles-de-piso`.

**Objetivo y vista:** Mantener los pisos de cada condominio con código y orden explícito para que las unidades puedan ubicarse y filtrarse de forma consistente. Conservar el título y ruta originales.

**Campos y filtros:** Empresa (selector; requerido; alcance autorizado); Condominio (selector; requerido; condominio vigente de la empresa); Código de piso (texto; requerido; único por condominio y sin espacios extremos); Etiqueta (texto; requerido; no vacía); Orden (entero; requerido; positivo y único dentro del condominio); Estado (selector; requerido; ACTIVE o INACTIVE).

**Columnas visibles:** Orden; Código; Etiqueta; Condominio; Unidades; Estado; Vigencia; Último cambio.

**Acciones y permisos:** Crear piso → crea piso sin afectar contabilidad [permiso: property.floor.create]; Reordenar → previsualiza y guarda una secuencia atómica [permiso: property.floor.order]; Inactivar → impide nuevas asignaciones si no hay unidades activas [permiso: property.floor.deactivate]; Ver unidades → navega a consulta filtrada de Detalle Inmuebles [permiso: property.unit.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y condominio.
2. Capturar código, etiqueta, orden y estado.
3. Validar duplicados, referencias y conflicto de versión.
4. Previsualizar el orden resultante si se reubica un piso.
5. Aprobar si la política lo exige y persistir cambios auditados.
6. Consultar unidades asociadas sin modificar esta ficha.

**Estados:** tipo: módulo; valores: ENABLED; READ_ONLY; DISABLED; tipo: piso; valores: DRAFT; ACTIVE; INACTIVE; tipo: orden; valores: CURRENT; PENDING_APPROVAL. **Validaciones:** El orden se guarda con bloqueo por condominio.; No permitir inactivar un piso con unidades activas sin flujo de reasignación aprobado.; Impedir escritura con módulo DISABLED y permitir lectura histórica.; Rechazar empresa o condominio fuera del alcance del usuario.; Registrar actor, motivo y valores anterior/nuevo..

**Persistencia e impacto contable:** Ninguno directo. Cambiar el orden o la etiqueta no modifica alícuotas, obligaciones, cargos ni asientos; los reportes futuros muestran la configuración vigente y los históricos conservan su referencia.

**API propia propuesta:** GET /api/v1/property/floors; POST /api/v1/property/floors; PATCH /api/v1/property/floors/{id}; POST /api/v1/property/floors/reorder; POST /api/v1/property/floors/{id}/deactivate. **Pantallas relacionadas:** XLS-003; XLS-005; XLS-006. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Un condominio con pisos 01 y 02; cuando: se crea el piso 03 con orden 3 y se confirma; entonces: el listado queda ordenado 01, 02, 03 y ninguna cuenta o asiento cambia

**Prueba negativa:** dado: Ya existe el código 02 en el condominio; cuando: se intenta crear otro piso con código 02; entonces: la operación falla por unicidad y no deja fila parcial

**Evidencias/pruebas exigidas:** `T-UI-XLS-002`, `T-PROC-XLS-002`, `T-NEG-XLS-002`.

### XLS-003 — Sección

**Ubicación original:** Administración Inmuebles > General > Sección. **Celda:** D8. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/general/seccion`.

**Objetivo y vista:** Administrar torres, bloques o secciones de un condominio y mantener la relación válida con pisos y unidades. Pantalla independiente con el título original, selector de empresa/condominio, árbol o tabla de secciones, filtros de estado y piso, formulario de alta/modificación y panel de dependencias.

**Campos y filtros:** Empresa (selector; requerido; empresa autorizada); Condominio (selector; requerido; condominio autorizado); Código de sección (texto; requerido; único por condominio); Nombre (texto; requerido; no vacío); Piso asociado (selector; opcional/condicional; si se informa, pertenece al mismo condominio); Estado (selector; requerido; ACTIVE o INACTIVE).

**Columnas visibles:** Código; Nombre; Piso; Ruta; Unidades; Estado; Vigencia; Último cambio.

**Acciones y permisos:** Crear sección → crea sección con referencias validadas [permiso: property.section.create]; Modificar → crea versión o actualiza borrador según estado [permiso: property.section.update]; Inactivar → bloquea nuevas asignaciones sin borrar historia [permiso: property.section.deactivate]; Consultar dependencias → muestra pisos y unidades relacionados [permiso: property.section.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y condominio.
2. Capturar código, nombre, piso opcional y estado.
3. Validar pertenencia, unicidad y referencias de unidades.
4. Revisar vista previa de la jerarquía resultante.
5. Aprobar y guardar la versión con auditoría.
6. Consultar dependencias y vigencias posteriores.

**Estados:** tipo: módulo; valores: ENABLED; READ_ONLY; DISABLED; tipo: sección; valores: DRAFT; ACTIVE; INACTIVE; tipo: relación; valores: VALID; PENDING_REVIEW; CONFLICT. **Validaciones:** Código único por condominio y tenant.; Piso asociado obligatorio solo si la configuración del condominio lo requiere.; No inactivar con unidades vigentes sin reasignación aprobada.; Con módulo DISABLED, solo lectura histórica.; No aceptar referencias por texto libre ni cruzar empresas..

**Persistencia e impacto contable:** No publica asientos ni recalcula cargos existentes. Una nueva asignación podrá usarse en futuros ciclos; documentos históricos mantienen la sección capturada en su snapshot.

**API propia propuesta:** GET /api/v1/property/sections; POST /api/v1/property/sections; PATCH /api/v1/property/sections/{id}; POST /api/v1/property/sections/{id}/deactivate; GET /api/v1/property/sections/{id}/dependencies. **Pantallas relacionadas:** XLS-001; XLS-002; XLS-005. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Existe el piso 02 del condominio C1; cuando: se registra la sección TORRE-A vinculada al piso 02; entonces: la sección queda ACTIVE y puede seleccionarse en Detalle Inmuebles

**Prueba negativa:** dado: TORRE-A ya existe en C1; cuando: se intenta crearla otra vez o asignarla a otro condominio; entonces: se rechaza por unicidad o pertenencia y no cambia la jerarquía

**Evidencias/pruebas exigidas:** `T-UI-XLS-003`, `T-PROC-XLS-003`, `T-NEG-XLS-003`.

### XLS-004 — Rubros

**Ubicación original:** Administración Inmuebles > General > Rubros. **Celda:** D9. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/general/rubros`.

**Objetivo y vista:** Configurar rubros ordinarios y extraordinarios que puedan alimentar presupuesto, ciclos de expensas y reportes, con cuenta contable, fondo, regla de distribución y tratamiento tributario aprobados por empresa. Pantalla dedicada con tabla de rubros, filtros por tipo/fondo/estado, selector de cuenta contable y centro, formulario con vigencia y panel de regla.

**Campos y filtros:** Empresa (selector; requerido; empresa autorizada); Condominio (selector; opcional/condicional; si se informa, pertenece a empresa); Código de rubro (texto; requerido; único por alcance y vigencia); Nombre (texto; requerido; no vacío); Tipo (selector; requerido; ORDINARIO o EXTRAORDINARIO); Fondo (selector; requerido; OPERATIVO, RESERVA o EXTRAORDINARIO según política); Cuenta contable (selector; requerido; cuenta imputable vigente); Regla de distribución (objeto; requerido; regla completa, precisión Decimal y versión); Tratamiento tributario (selector versionado; requerido; requiere decisión aprobada; no usar tasa fija).

**Columnas visibles:** Código; Nombre; Tipo; Fondo; Cuenta; Regla; Vigente desde; Estado; Usos.

**Acciones y permisos:** Crear borrador → prepara rubro sin afectar cargos [permiso: property.item.create]; Enviar a aprobación → congela versión y crea solicitud [permiso: property.item.submit]; Activar versión → habilita uso en presupuesto/ciclo futuro [permiso: property.item.approve]; Inactivar → detiene usos nuevos y conserva históricos [permiso: property.item.deactivate]; Ver usos → navega a ciclos y reportes relacionados [permiso: property.item.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y alcance opcional de condominio.
2. Capturar clasificación, fondo, cuenta, regla y tratamiento versionado.
3. Validar cuenta, suma de reglas, vigencia y decisión tributaria.
4. Previsualizar distribución sobre padrón de prueba.
5. Solicitar y obtener aprobación segregada.
6. Activar versión para futuros presupuestos y consultar usos.

**Estados:** tipo: rubro; valores: DRAFT; PENDING_APPROVAL; ACTIVE; INACTIVE; tipo: contable; valores: UNMAPPED; MAPPED; BLOCKED; tipo: tributario; valores: PENDING_DECISION; APPROVED; NOT_APPLICABLE. **Validaciones:** No hardcodear IVA, retenciones, mora o tasas; resolver catálogos por vigencia.; Cuenta y centro pertenecen a la empresa.; La suma de reglas debe cuadrar con el total objetivo en la previsualización.; Impedir activar sin tratamiento tributario aprobado cuando aplique.; No modificar una versión usada; crear revisión nueva..

**Persistencia e impacto contable:** La configuración no contabiliza. Una versión activa resuelve cuentas y dimensiones cuando un ciclo aprobado finaliza; cambiarla no altera cargos, obligaciones ni asientos ya publicados.

**API propia propuesta:** GET /api/v1/property/items; POST /api/v1/property/items; PATCH /api/v1/property/items/{id}; POST /api/v1/property/items/{id}/submit; POST /api/v1/property/items/{id}/activate; POST /api/v1/property/items/{id}/deactivate. **Pantallas relacionadas:** XLS-001; XLS-005; XLS-006. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Existe un rubro ordinario con cuenta y regla aprobadas; cuando: se activa para el condominio C1; entonces: aparece disponible en presupuesto y no genera asiento hasta finalizar un ciclo

**Prueba negativa:** dado: El rubro tiene cuenta inexistente o tratamiento pendiente; cuando: se intenta activar; entonces: queda bloqueado con errores explícitos y no puede ser usado por un ciclo

**Evidencias/pruebas exigidas:** `T-UI-XLS-004`, `T-PROC-XLS-004`, `T-NEG-XLS-004`.

### XLS-005 — Detalle Inmuebles

**Ubicación original:** Administración Inmuebles > Inmuebles > Detalle Inmuebles. **Celda:** D11. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/inmuebles/detalle-inmuebles`.

**Objetivo y vista:** Registrar y consultar cada unidad con código, tipo, ubicación, área, alícuota, estado, condominio y responsables con vigencia. Listado paginado con búsqueda por código, sección, piso, estado y responsable; formulario por pestañas para identidad, ubicación, superficies/alícuota y vínculos de personas; línea de tiempo de vigencias y documentos.

**Campos y filtros:** Empresa (selector; requerido; empresa autorizada); Condominio (selector; requerido; condominio de la empresa); Código de unidad (texto; requerido; único por condominio y no reutilizable); Tipo/piso/sección (selectores; requerido; referencias vigentes del mismo condominio); Área (decimal; requerido; mayor que cero y precisión definida); Alícuota (decimal/versionada; requerido; intervalo vigente y suma verificable); Responsables y participaciones (colección; requerido; roles, fechas [inicio,fin), sin solapes inválidos); Estado (selector; requerido; ACTIVE, INACTIVE o HISTORICAL).

**Columnas visibles:** Código; Tipo; Piso; Sección; Área; Alícuota vigente; Responsable de pago; Estado; Desde.

**Acciones y permisos:** Crear unidad → registra unidad y vínculos iniciales [permiso: property.unit.create]; Modificar borrador → prepara nueva vigencia sin tocar historia [permiso: property.unit.update]; Registrar transferencia → crea evento y snapshot, sin mover deudas automáticamente [permiso: property.ownership.transfer]; Inactivar → cierra vigencia futura sin borrar documentos [permiso: property.unit.deactivate]; Ver cargos y documentos → navega a origen canónico [permiso: property.unit.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y condominio.
2. Capturar identidad, ubicación, área, alícuota y responsables.
3. Validar referencias, intervalos, participaciones y concurrencia.
4. Revisar diferencias y evidencia de aprobación.
5. Aprobar y guardar vigencia; emitir eventos de dominio si corresponde.
6. Consultar historia, cargos y documentos sin editar publicaciones.

**Estados:** tipo: módulo; valores: ENABLED; READ_ONLY; DISABLED; tipo: unidad; valores: DRAFT; ACTIVE; INACTIVE; HISTORICAL; tipo: vínculo; valores: PENDING; APPROVED; EXPIRED; DISPUTED. **Validaciones:** No solapar vínculo unidad/persona/rol/intervalo.; Verificar suma de participaciones según regla aprobada sin prohibir copropiedad.; Usar Decimal y fechas comerciales, no float ni timestamp para vigencia.; Con módulo DISABLED rechazar escritura con MODULE_DISABLED.; No editar ni borrar cargos o asientos desde esta ficha..

**Persistencia e impacto contable:** El alta o cambio no crea asiento. La unidad puede dimensionar futuros cargos; los cargos finalizados conservan propietario, responsable, regla y alícuota como snapshot. Una transferencia exige proceso explícito para cualquier ajuste de deuda.

**API propia propuesta:** GET /api/v1/property/units; POST /api/v1/property/units; PATCH /api/v1/property/units/{id}; POST /api/v1/property/units/{id}/ownership-events; POST /api/v1/property/units/{id}/deactivate; GET /api/v1/property/units/{id}/history. **Pantallas relacionadas:** XLS-001; XLS-002; XLS-003; XLS-004; XLS-006; XLS-007; XLS-008. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Un condominio con tipo, piso, sección y dos propietarios válidos; cuando: se crea la unidad U-101 con participaciones 60/40 y responsable de pago; entonces: queda ACTIVE, la suma cuadra y su alta no publica deuda

**Prueba negativa:** dado: La nueva participación se solapa o supera la suma permitida; cuando: se intenta aprobarla; entonces: la API devuelve detalle de conflicto y conserva la vigencia anterior

**Evidencias/pruebas exigidas:** `T-UI-XLS-005`, `T-PROC-XLS-005`, `T-NEG-XLS-005`.

### XLS-006 — Resumen General

**Ubicación original:** Administración Inmuebles > Inmuebles > Resumen General. **Celda:** D12. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/inmuebles/resumen-general`.

**Objetivo y vista:** Presentar una vista de consulta y conciliación de unidades, alícuotas, ocupación y saldos a una fecha de corte. Encabezado con empresa, condominio y fecha de corte; filtros visibles, tarjetas de totales conciliables, tabla por unidad y panel de diferencias.

**Campos y filtros:** Empresa (selector; requerido; empresa autorizada); Condominio (selector; requerido; condominio permitido); Fecha de corte (fecha; requerido; fecha comercial no futura según política); Sección/piso (multiselección; opcional/condicional; pertenencia al condominio); Estado de unidad (multiselección; opcional/condicional; enum permitido); Mostrar saldos a favor (booleano; requerido; por defecto separado de deuda).

**Columnas visibles:** Unidad; Tipo; Piso/sección; Estado; Alícuota al corte; Responsable; Cargos; Aplicaciones; Saldo; Anticipo; Diferencia; Origen.

**Acciones y permisos:** Consultar → calcula vista al corte desde fuentes canónicas [permiso: property.summary.read]; Ver origen → navega a obligación, aplicación, documento o asiento [permiso: receivables.read]; Exportar → genera archivo con filtros y snapshot idénticos [permiso: property.summary.export]; Abrir diferencia → crea incidencia auditable sin editar saldos [permiso: property.reconciliation.investigate].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, condominio y fecha de corte.
2. Aplicar filtros de ubicación, estado y presentación.
3. Consultar cartera, snapshots y alícuotas vigentes.
4. Validar totales, diferencias y permisos de navegación.
5. Presentar resultados y permitir apertura del origen.
6. Exportar el mismo snapshot o registrar incidencia.

**Estados:** tipo: consulta; valores: LOADING; READY; EMPTY; ERROR; tipo: conciliación; valores: BALANCED; DIFFERENCE; SOURCE_UNAVAILABLE; tipo: módulo; valores: ENABLED; READ_ONLY; DISABLED. **Validaciones:** Exigir fecha de corte y empresa autorizada.; No calcular saldo definitivo en React.; Totales de pantalla y exportación deben usar el mismo snapshot.; No ocultar unidades con saldos o datos incompletos; marcarlas como excepción.; Con módulo DISABLED permitir lectura histórica explícita si existe acceso..

**Persistencia e impacto contable:** Solo lectura. No crea, modifica ni reversa asientos; muestra saldos derivados de receivable_item, aplicaciones y reversos efectivos al corte, separando anticipos y diferencias.

**API propia propuesta:** GET /api/v1/property/summaries; GET /api/v1/property/summaries/{id}/origins; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-004; XLS-005; XLS-008. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Hay dos unidades, cargos y una aplicación publicada antes del corte; cuando: se consulta el condominio con fecha de corte; entonces: los saldos por unidad concilian con cartera y cada fila navega al origen

**Prueba negativa:** dado: La fuente de cartera está incompleta o el usuario no tiene alcance; cuando: se solicita el resumen; entonces: se muestra error/diferencia explícita y no se presenta un total inventado

**Evidencias/pruebas exigidas:** `T-UI-XLS-006`, `T-PROC-XLS-006`, `T-NEG-XLS-006`.

### XLS-007 — Carga Masiva de Inmuebles

**Ubicación original:** Administración Inmuebles > Inmuebles > Carga Masiva de Inmuebles. **Celda:** D13. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/inmuebles/carga-masiva-de-inmuebles`.

**Objetivo y vista:** Importar unidades y sus referencias desde una plantilla versionada, con prevalidación, errores por fila, homologación controlada y ejecución idempotente. Bandeja dedicada con descargar plantilla, instrucciones, selector de empresa/condominio, carga de archivo, pasos de progreso y tabla de filas.

**Campos y filtros:** Empresa (selector; requerido; alcance autorizado); Condominio (selector; requerido; condominio activo); Versión de plantilla (selector; requerido; versión compatible); Archivo XLSX/CSV (archivo; requerido; extensión, tamaño, hash y columnas exactas); Modo (selector; requerido; PREVIEW o UPSERT_IDEMPOTENT con clave original); Confirmación (booleano; requerido; debe aceptar errores y efecto antes de ejecutar).

**Columnas visibles:** Fila original; Clave original; Código unidad; Tipo; Piso; Sección; Resultado; Errores; Advertencias; ID creado; Reintento.

**Acciones y permisos:** Descargar plantilla → obtiene versión y catálogo de columnas [permiso: property.import.template.read]; Prevalidar → crea lote y errores sin escribir unidades [permiso: property.import.validate]; Corregir/reintentar filas → reprocesa solo filas elegibles [permiso: property.import.retry]; Confirmar importación → crea/actualiza unidades idempotentemente con mapa [permiso: property.import.confirm]; Consultar lote → muestra evidencia y eventos [permiso: property.import.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, condominio, plantilla y archivo.
2. Prevalidar estructura, referencias, duplicados y reglas de negocio.
3. Revisar errores por fila y corregir u homologar.
4. Confirmar únicamente filas válidas con permiso segregado.
5. Ejecutar job idempotente y guardar mapa de IDs/originales.
6. Consultar resultado, descargar errores y reintentar sin duplicar.

**Estados:** tipo: lote; valores: RECEIVED; VALIDATING; READY; CONFIRMED; PARTIAL; FAILED; tipo: fila; valores: RECEIVED; VALID; WARNING; REJECTED; CONFIRMED; RETRYABLE; tipo: módulo; valores: ENABLED; READ_ONLY; DISABLED. **Validaciones:** Rechazar columnas desconocidas o fórmulas maliciosas.; Usar hash y clave natural para idempotencia; reintentar no duplica.; Validar referencias contra empresa/condominio y catálogos vigentes.; No confirmar lote con errores bloqueantes.; Con módulo DISABLED rechazar escritura con MODULE_DISABLED y conservar consulta del lote..

**Persistencia e impacto contable:** La prevalidación no afecta contabilidad. La confirmación tampoco publica asientos; crea dimensiones inmobiliarias para operaciones futuras y conserva datos históricos de origen. Los cargos se procesan por ciclos separados.

**API propia propuesta:** GET /api/v1/property/imports/templates; POST /api/v1/property/imports; GET /api/v1/imports/{id}; POST /api/v1/imports/{id}/confirm; POST /api/v1/imports/{id}/retry. **Pantallas relacionadas:** XLS-001; XLS-002; XLS-003; XLS-005. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Una plantilla con 10 filas válidas y 2 con advertencia corregible; cuando: se prevalida, corrige y confirma el lote; entonces: se crean 10 unidades una sola vez, se registra el mapa y las advertencias quedan auditadas

**Prueba negativa:** dado: Se reenvía el mismo archivo con la misma clave original; cuando: se confirma por segunda vez; entonces: la operación devuelve resultado idempotente sin duplicar unidades ni asientos

**Evidencias/pruebas exigidas:** `T-UI-XLS-007`, `T-PROC-XLS-007`, `T-NEG-XLS-007`.

### XLS-008 — Reporte Histórico de Propietarios

**Ubicación original:** Administración Inmuebles > Inmuebles > Reporte Histórico de Propietarios. **Celda:** D14. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/inmuebles/reporte-historico-de-propietarios`.

**Objetivo y vista:** Consultar propietarios, copropietarios, participaciones y responsables por unidad a través de un intervalo histórico, con evidencia de vigencias y eventos de transferencia. Reporte con fecha desde/hasta, empresa, condominio y filtros de unidad/persona/rol.

**Campos y filtros:** Empresa (selector; requerido; empresa autorizada); Condominio (selector; requerido; condominio permitido); Desde (fecha; requerido; no posterior a Hasta); Hasta (fecha; requerido; intervalo comercial válido); Unidad (selector/multiselección; opcional/condicional; pertenece al condominio); Persona y rol (búsqueda/selectores; opcional/condicional; tercero autorizado y rol permitido).

**Columnas visibles:** Unidad; Persona; Identificación enmascarada; Rol; Participación; Desde; Hasta; Fuente; Estado; Cargo snapshot.

**Acciones y permisos:** Consultar intervalo → devuelve historia al corte solicitado [permiso: property.ownership.history.read]; Ver evento → abre evidencia y aprobación del cambio [permiso: property.ownership.event.read]; Navegar a cargo → muestra responsable congelado del documento [permiso: receivables.read]; Exportar → genera reporte protegido con snapshot [permiso: property.ownership.history.export].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, condominio e intervalo.
2. Aplicar unidad, persona y rol opcionales.
3. Validar permisos de datos y reconstruir vigencias.
4. Conciliar participaciones y marcar solapes o vacíos.
5. Mostrar historia, fuentes y snapshots sin editar.
6. Exportar o navegar al origen con auditoría.

**Estados:** tipo: consulta; valores: LOADING; READY; EMPTY; ERROR; tipo: vínculo; valores: PENDING; APPROVED; EXPIRED; DISPUTED; tipo: privacidad; valores: FULL; MASKED; DENIED. **Validaciones:** Intervalo [inicio, fin) y fechas coherentes.; Enmascarar identificación según permiso.; No inferir solidaridad ni responsabilidad legal.; Mostrar diferencias de suma sin corregir automáticamente.; No reasignar deuda por una modificación de propietario..

**Persistencia e impacto contable:** Solo lectura. No cambia deuda ni propietario de cargos publicados; muestra el vínculo histórico almacenado y enlaza al snapshot responsable. Un eventual ajuste se realiza fuera del reporte mediante reverso o documento autorizado.

**API propia propuesta:** GET /api/v1/property/ownership-history; GET /api/v1/property/ownership-events/{id}; GET /api/v1/property/charges/{id}/snapshot; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-005; XLS-006. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Una unidad tuvo propietario A hasta junio y B desde julio; cuando: se consulta enero-diciembre; entonces: se muestran ambas vigencias y un cargo de mayo conserva a A como snapshot

**Prueba negativa:** dado: Un usuario sin permiso intenta exportar identificaciones completas; cuando: solicita el reporte; entonces: la exportación se deniega o enmascara y no expone datos fuera de alcance

**Evidencias/pruebas exigidas:** `T-UI-XLS-008`, `T-PROC-XLS-008`, `T-NEG-XLS-008`.

### XLS-009 — Configuración Destinatarios

**Ubicación original:** Administración Inmuebles > Notificaciones > Configuración Destinatarios. **Celda:** D16. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/notificaciones/configuracion-destinatarios`.

**Objetivo y vista:** Definir destinatarios por unidad, rol y evento para comunicaciones inmobiliarias, respetando preferencias, base legal configurada y segregación de empresas. Tabla de reglas con filtros por condominio, unidad, rol, evento, canal y estado; formulario dedicado con prioridad y vigencia; previsualización de audiencia con conteos y exclusiones explicadas.

**Campos y filtros:** Empresa (selector; requerido; empresa autorizada); Condominio/unidad (selector; opcional/condicional; referencia válida del módulo); Evento (selector; requerido; evento versionado permitido); Rol destinatario (multiselección; requerido; propietario, responsable, residente u otro rol autorizado); Canal (selector; requerido; EMAIL u otro canal habilitado); Preferencia/base legal (objeto; requerido; registro vigente y consistente); Vigencia (intervalo; requerido; sin solape de reglas equivalentes).

**Columnas visibles:** Evento; Ámbito; Roles; Canal; Destinatarios resueltos; Preferencia; Vigencia; Estado; Última prueba.

**Acciones y permisos:** Crear regla → guarda configuración sin enviar [permiso: property.notification_rule.create]; Modificar regla → crea nueva vigencia auditada [permiso: property.notification_rule.update]; Previsualizar audiencia → muestra conteo y exclusiones sin envío [permiso: property.notification.audience_preview]; Activar/inactivar → controla uso futuro de la regla [permiso: property.notification_rule.activate]; Ver historial → muestra cambios y actor [permiso: property.notification_rule.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y ámbito inmobiliario.
2. Capturar evento, roles, canal, preferencias y vigencia.
3. Resolver destinatarios y validar base legal/preferencias.
4. Previsualizar audiencia y exclusiones.
5. Aprobar y activar la versión de regla.
6. Consultar uso posterior desde la bandeja de envíos.

**Estados:** tipo: regla; valores: DRAFT; PENDING_APPROVAL; ACTIVE; INACTIVE; tipo: destinatario; valores: RESOLVED; MISSING_CONTACT; OPTED_OUT; DENIED; tipo: módulo; valores: ENABLED; READ_ONLY; DISABLED. **Validaciones:** Aislar tenant, empresa y condominio.; No activar sin evento, canal y preferencia/base legal definida.; No enviar durante previsualización.; Cambiar contenido invalida aprobación previa.; Módulo DISABLED bloquea alta/cambio y conserva lectura histórica..

**Persistencia e impacto contable:** No contabiliza ni modifica obligaciones. Puede consumir eventos de cargos/documentos publicados para resolver audiencia; no debe revelar saldos o datos a personas sin autorización.

**API propia propuesta:** GET /api/v1/property/notification-rules; POST /api/v1/property/notification-rules; PATCH /api/v1/property/notification-rules/{id}; POST /api/v1/property/notification-rules/{id}/audience-preview; POST /api/v1/property/notification-rules/{id}/activate. **Pantallas relacionadas:** XLS-005; XLS-010; XLS-011. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Una regla activa para evento de cargo y rol responsable; cuando: se previsualiza la audiencia con contactos válidos; entonces: se muestra el conteo correcto sin crear intentos de entrega

**Prueba negativa:** dado: El destinatario no tiene contacto vigente o está excluido; cuando: se intenta activar la regla; entonces: la pantalla marca la exclusión y no permite enviarle por esta regla

**Evidencias/pruebas exigidas:** `T-UI-XLS-009`, `T-PROC-XLS-009`, `T-NEG-XLS-009`.

### XLS-010 — Envío Email

**Ubicación original:** Administración Inmuebles > Notificaciones > Envío Email. **Celda:** D17. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/notificaciones/envio-email`.

**Objetivo y vista:** Preparar y ejecutar envíos de email por cola, con plantilla versionada, destinatario resuelto, registro de entrega/error y reintento seguro. Bandeja dedicada con pestañas borradores, listos, procesando, entregados, fallidos y pendientes de conciliación.

**Campos y filtros:** Empresa/condominio (selectores; requerido; alcance permitido); Evento (selector; requerido; evento con regla activa); Plantilla y versión (selector; requerido; versión aprobada y variables completas); Audiencia (referencia congelada; requerido; resuelta por regla y no vacía sin justificación); Asunto/cuerpo (texto/HTML controlado; requerido; sanitizado, variables permitidas); Fecha de envío (fecha-hora; requerido; fecha válida y zona local mostrada).

**Columnas visibles:** Lote; Evento; Plantilla; Destinatarios; Estado; Intentos; Entregados; Errores; Último intento; Actor.

**Acciones y permisos:** Crear envío → congela contenido y audiencia en borrador [permiso: property.email.create]; Previsualizar → muestra contenido por destinatario sin enviar [permiso: property.email.preview]; Aprobar y encolar → crea job/outbox idempotente [permiso: property.email.approve]; Consultar resultado → muestra entrega/error por destinatario [permiso: property.email.read]; Reintentar elegibles → reprocesa solo fallos/indeterminados conciliables [permiso: property.email.retry].

**Proceso que debe ejecutar:**

1. Seleccionar evento, ámbito, plantilla y regla de audiencia.
2. Capturar o revisar contenido y congelar destinatarios.
3. Validar variables, preferencias, permisos y duplicados.
4. Previsualizar y obtener aprobación segregada.
5. Encolar job tras commit y procesar con worker.
6. Consultar entrega, conciliar timeout y reintentar solo lo permitido.

**Estados:** tipo: lote; valores: DRAFT; PENDING_APPROVAL; QUEUED; PROCESSING; COMPLETED; PARTIAL; FAILED; tipo: entrega; valores: PENDING; SENT; DELIVERED; BOUNCED; FAILED; UNKNOWN; RECONCILED; tipo: módulo; valores: ENABLED; READ_ONLY; DISABLED. **Validaciones:** Usar outbox y clave idempotente por lote/destinatario/versión.; No incluir destinatarios entre empresas o clientes.; Reintentar timeout solo después de consultar estado/referencia del proveedor.; Sanitizar HTML y limitar variables.; Con módulo DISABLED bloquear nuevos envíos y permitir auditoría histórica..

**Persistencia e impacto contable:** No modifica libros ni saldos. Puede transportar enlaces a cargos o documentos ya creados, pero el correo ocurre después del commit; un error de proveedor no revierte ni elimina efectos contables válidos.

**API propia propuesta:** GET /api/v1/property/email-sends; POST /api/v1/property/email-sends; POST /api/v1/property/email-sends/{id}/preview; POST /api/v1/property/email-sends/{id}/approve; POST /api/v1/property/email-sends/{id}/retry; GET /api/v1/jobs/{id}. **Pantallas relacionadas:** XLS-009; XLS-011. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Un lote aprobado con tres destinatarios y plantilla versión 2; cuando: el worker procesa la cola; entonces: se registran estados individuales y un segundo intento no duplica los entregados

**Prueba negativa:** dado: El proveedor responde timeout después de aceptar un mensaje; cuando: el operador pulsa reintentar inmediatamente; entonces: el sistema exige conciliación de referencia y evita reenviar a ciegas

**Evidencias/pruebas exigidas:** `T-UI-XLS-010`, `T-PROC-XLS-010`, `T-NEG-XLS-010`.

### XLS-011 — Boletín

**Ubicación original:** Administración Inmuebles > Notificaciones > Boletín. **Celda:** D18. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/administracion-inmuebles/notificaciones/boletin`.

**Objetivo y vista:** Crear un boletín inmobiliario, previsualizar su contenido, seleccionar una audiencia aprobada y registrar su envío. Editor dedicado con título original, campos de asunto/cuerpo/adjuntos, versión de borrador, vista previa responsive y panel de audiencia por condominio, sección, unidad o rol.

**Campos y filtros:** Empresa (selector; requerido; empresa autorizada); Condominio (selector; requerido; condominio del módulo); Título del boletín (texto; requerido; no vacío y longitud permitida); Contenido (editor controlado; requerido; HTML sanitizado, variables permitidas, sin datos sensibles); Adjuntos (colección de archivos; opcional/condicional; tipo/tamaño/hash permitidos); Audiencia (filtros; requerido; roles y preferencias resueltos); Programación (fecha-hora; requerido; fecha válida; envío posterior a aprobación).

**Columnas visibles:** Boletín; Condominio; Versión; Audiencia; Estado; Aprobador; Programado; Enviados; Errores; Creado por.

**Acciones y permisos:** Guardar borrador → preserva versión editable y hash provisional [permiso: property.bulletin.create]; Previsualizar → renderiza contenido y audiencia sin enviar [permiso: property.bulletin.preview]; Solicitar aprobación → congela contenido y crea solicitud [permiso: property.bulletin.submit]; Aprobar y programar → crea envío aprobado en cola [permiso: property.bulletin.approve]; Consultar entrega → abre resultados por destinatario [permiso: property.bulletin.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, condominio y audiencia inicial.
2. Capturar título, contenido, adjuntos y programación.
3. Validar HTML, variables, privacidad, destinatarios y archivos.
4. Previsualizar boletín y resolver exclusiones.
5. Solicitar/aprobar contenido y congelar snapshot.
6. Encolar, consultar entregas y registrar errores/reintentos.

**Estados:** tipo: boletín; valores: DRAFT; PENDING_APPROVAL; APPROVED; SCHEDULED; SENDING; SENT; PARTIAL; CANCELLED; tipo: audiencia; valores: PREVIEW; FROZEN; EXPIRED; REJECTED; tipo: módulo; valores: ENABLED; READ_ONLY; DISABLED. **Validaciones:** Separación de creador y aprobador cuando la política lo exige.; No enviar sin audiencia congelada y regla activa.; Excluir contactos sin preferencia/base legal válida.; Sanitizar contenido y adjuntos; bloquear fórmulas o archivos peligrosos.; Con módulo DISABLED bloquear creación/edición y conservar consulta histórica..

**Persistencia e impacto contable:** No contabiliza y no cambia cartera. El boletín puede referenciar un ciclo o documento para información, pero su publicación y entrega son efectos operativos posteriores e independientes del asiento.

**API propia propuesta:** GET /api/v1/property/bulletins; POST /api/v1/property/bulletins; PATCH /api/v1/property/bulletins/{id}; POST /api/v1/property/bulletins/{id}/preview; POST /api/v1/property/bulletins/{id}/submit; POST /api/v1/property/bulletins/{id}/approve; GET /api/v1/property/bulletins/{id}/delivery. **Pantallas relacionadas:** XLS-009; XLS-010; XLS-005. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Un boletín aprobado para residentes y propietarios con contactos válidos; cuando: se programa y procesa la cola; entonces: se registra una entrega por destinatario, el contenido queda versionado y no se publica información ajena

**Prueba negativa:** dado: El contenido contiene una variable no permitida o audiencia sin base configurada; cuando: se solicita aprobación; entonces: la solicitud se rechaza con errores corregibles y no se crea envío

**Evidencias/pruebas exigidas:** `T-UI-XLS-011`, `T-PROC-XLS-011`, `T-NEG-XLS-011`.

### Procesos integrales del grupo

**Configuración estructural y alta controlada de unidades**. Secuencia: XLS-001; XLS-002; XLS-003; XLS-004; XLS-005. El administrador selecciona empresa y condominio, configura tipos, pisos y secciones, define rubros con cuenta/regla versionadas y luego registra unidades con alícuotas y responsables vigentes. Cada catálogo pasa por validación y aprobación según política. La unidad solo puede referenciar registros del mismo condominio; las pantallas permanecen dedicadas y la navegación conserva las rutas originales. Resultado: La configuración y el alta no publican asientos. Rubros y dimensiones quedan disponibles para un presupuesto/ciclo futuro; cualquier cargo conservará snapshots de unidad, responsable, regla y alícuota. Prueba: Dado un condominio vacío, cuando se crean catálogos válidos y una unidad U-101, entonces U-101 aparece en Detalle Inmuebles con referencias válidas, los rubros quedan utilizables y el mayor contable permanece sin movimientos nuevos. Si se intenta usar una cuenta o sección de otra empresa, el proceso se detiene sin filas parciales.

**Carga masiva idempotente y conciliación de unidades**. Secuencia: XLS-007; XLS-001; XLS-002; XLS-003; XLS-005; XLS-006. El usuario descarga la plantilla, selecciona alcance y carga el archivo. El lote valida columnas, claves originales, referencias, participaciones y duplicados; muestra errores por fila. Tras corregir, confirma filas válidas y el worker crea o actualiza de forma idempotente, conservando mapa de IDs. Luego el Resumen General permite consultar al corte y abrir cada origen. Resultado: La importación no contabiliza ni genera deuda. El resumen deriva saldos de cartera y movimientos publicados; no mantiene un saldo inmobiliario manual. Prueba: Dado un archivo con filas válidas, advertencias y errores, cuando se corrigen los errores y se confirma dos veces el mismo lote, entonces solo se crean las unidades válidas una vez, se conserva el detalle de errores y el resumen concilia con las fuentes canónicas. Con módulo DISABLED, la carga se rechaza con MODULE_DISABLED.

**Presupuesto y ciclo de expensas con funciones mínimas de extensión**. Secuencia: XLS-004; XLS-005; XLS-006. Desde la configuración de Rubros, una función adicional bajo la ruta original prepara presupuesto, fondo, ejercicio y resolución; determina el padrón y snapshots vigentes de Detalle Inmuebles; presenta una vista previa de distribución y residuos; solicita aprobación; finaliza cargos y enlaces a cartera; finalmente Resumen General concilia cargos, aplicaciones y saldos. El documento fiscal, si aplica, es una decisión separada de política aprobada. Resultado: Solo la finalización aprobada crea obligaciones canónicas, dimensiones de inmueble, asientos y eventos outbox en una transacción; no existe libro mayor paralelo. No se fija mora, tasa ni tratamiento tributario sin configuración aprobada. Prueba: Dado un presupuesto aprobado y reglas que cuadran, cuando se previsualiza y finaliza un ciclo, entonces la suma distribuida coincide exactamente con el total aprobado, cada unidad obtiene un cargo único y el resumen concilia con receivables. Si la suma, regla o cuenta no cuadra, no se finaliza ni se publica parcialmente.

**Historia de titularidad y consulta de cargos sin reasignación automática**. Secuencia: XLS-005; XLS-008; XLS-006. El usuario registra una nueva vigencia o evento de transferencia en Detalle Inmuebles con evidencia y aprobación; el Reporte Histórico reconstruye el intervalo solicitado y muestra propietario, copropietarios, roles y participaciones; Resumen General enlaza los cargos y snapshots al origen. Una eventual corrección de deuda se remite a un flujo explícito del núcleo, no al reporte. Resultado: Los cargos previos conservan su responsable y alícuota snapshot. El cambio no edita asientos ni mueve deuda automáticamente; cualquier reverso/ajuste debe ser autorizado y trazable en el núcleo. Prueba: Dado un cargo de mayo con propietario A y una transferencia efectiva en julio a B, cuando se consulta enero-diciembre y el resumen al corte, entonces se muestran ambas vigencias y el cargo de mayo sigue enlazado a A. Una tentativa de reasignación automática es rechazada.

**Audiencia, boletín y envío de notificaciones inmobiliarias**. Secuencia: XLS-009; XLS-011; XLS-010. Configuración Destinatarios define evento, rol, canal, preferencias y vigencia; Boletín crea contenido, previsualiza audiencia, obtiene aprobación y congela snapshot; Envío Email procesa la cola por destinatario, registra entrega/error y permite reintentos conciliados. El núcleo mantiene notificaciones generales y la extensión solo agrega el alcance inmobiliario opcional. Resultado: No hay efecto contable. Los mensajes pueden referenciar cargos o documentos ya existentes, pero correo y boletín ocurren después del commit y no revierten libros si fallan. Prueba: Dado un evento con tres destinatarios válidos y uno excluido por preferencia, cuando se aprueba un boletín y se procesa la cola, entonces se envía solo a los tres, se registra la exclusión y el reintento de un timeout consulta estado antes de reenviar. Ningún usuario ve destinatarios de otra empresa.

## Email

### XLS-012 — Modificar Email Exp. Ordinarias

**Ubicación original:** Email > Modificar Email Exp. Ordinarias. **Celda:** C20. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/email/modificar-email-exp-ordinarias`.

**Objetivo y vista:** Administrar versiones de la plantilla de correo para expensas ordinarias, con variables explícitamente permitidas, vista previa y correo de prueba. Encabezado con empresa, estado de PROPERTY_MANAGEMENT y advertencia de solo lectura o MODULE_DISABLED cuando corresponda.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada y con contexto vigente; no cruzar tenant.); estado_version (multi-selector; opcional/condicional; Solo estados DRAFT, PENDING_APPROVAL, PUBLISHED o ARCHIVED.); vigente_desde (fecha; opcional/condicional; Fecha comercial válida; no cambiar versiones históricas.); asunto (texto; requerido; Longitud configurada, sin variables no permitidas ni encabezados inyectados.); cuerpo (editor_html_texto; requerido; HTML saneado, texto alternativo disponible y solo variables del catálogo de expensa ordinaria.); destinatario_prueba (email; requerido; Correo válido; confirmado por usuario con permiso de prueba y nunca destinatario masivo.); motivo_cambio (textarea; requerido; Obligatorio al crear versión, publicar o archivar; queda auditado.).

**Columnas visibles:** Versión; Estado; Vigencia desde; Autor; Último cambio; Variables usadas; Prueba más reciente; Hash de contenido.

**Acciones y permisos:** Consultar versiones → Lista paginada y detalle de versiones de la empresa, sin modificar datos. [permiso: notifications.email.template.read]; Crear borrador → Crea una versión DRAFT sin afectar la versión publicada. [permiso: notifications.email.template.write]; Guardar versión → Valida y guarda contenido con hash y auditoría; invalida aprobación previa si cambia. [permiso: notifications.email.template.write]; Vista previa → Renderiza con datos sintéticos y reporta variables faltantes o sobrantes. [permiso: notifications.email.template.preview]; Enviar correo de prueba → Encola un mensaje de prueba identificable; no activa envíos productivos ni contabiliza. [permiso: notifications.email.test_send]; Solicitar aprobación → Crea approval_request sobre el hash de la versión. [permiso: notifications.email.approval.request]; Publicar versión → Marca una única versión vigente y archiva la anterior sin borrar historial. [permiso: notifications.email.template.publish].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y revisar el estado efectivo de PROPERTY_MANAGEMENT; si está DISABLED, permitir lectura histórica y rechazar alta/cambio con MODULE_DISABLED.
2. Capturar asunto, cuerpo, variables, vigencia y motivo; el editor ofrece únicamente el catálogo de expensa ordinaria y conserva la versión previa intacta.
3. Validar sintaxis, saneamiento, variables, destinatario de prueba, permisos, conflicto de vigencia y hash de contenido.
4. Guardar DRAFT y solicitar aprobación; cualquier cambio posterior obliga a validar y aprobar nuevamente.
5. Enviar prueba a un destinatario autorizado, registrar delivery_attempt y mostrar resultado sin publicar ni repetir el envío por doble clic.
6. Aprobar y publicar la versión; dejarla disponible para ciclos ordinarios posteriores y consultar auditoría, entregas o fallos en la bandeja común.

**Estados:** DRAFT; VALIDATING; PENDING_APPROVAL; APPROVED; PUBLISHED; ARCHIVED; TEST_QUEUED; TEST_DELIVERED; TEST_FAILED; MODULE_DISABLED. **Validaciones:** Verificar empresa, tenant, permiso y módulo en backend; una bandera del navegador no autoriza la operación.; Rechazar variables desconocidas, variables obligatorias sin valor de ejemplo, HTML inseguro, archivos no permitidos y asunto vacío.; Impedir dos versiones PUBLISHED vigentes para la misma empresa y tipo; resolver concurrencia con versión esperada/idempotencia.; La aprobación debe referir hash y versión exactos; cambiar contenido invalida la aprobación anterior.; El destinatario de prueba debe estar autorizado y la evidencia debe ocultar datos personales innecesarios.; El worker usa outbox y conciliación de resultado incierto; no reenviar automáticamente tras timeout del proveedor..

**Persistencia e impacto contable:** Ninguno directo. La plantilla publicada se consume después del commit de un ciclo ordinario; un fallo de correo no revierte cargos, obligaciones ni asientos válidos. No crea deuda ni modifica saldos. Si el módulo inmobiliario se desactiva, se conserva lectura histórica, pero se bloquean nuevas versiones y cambios verticales.

**API propia propuesta:** GET /api/v1/notifications/email/templates/expense-ordinary?company_id={company_id}; POST /api/v1/notifications/email/templates/expense-ordinary/versions; POST /api/v1/notifications/email/templates/expense-ordinary/versions/{version_id}/preview; POST /api/v1/notifications/email/templates/expense-ordinary/versions/{version_id}/test; POST /api/v1/notifications/email/templates/expense-ordinary/versions/{version_id}/approval; POST /api/v1/notifications/email/templates/expense-ordinary/versions/{version_id}/publish. **Pantallas relacionadas:** ADD-EMAIL-001. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado que la empresa tiene PROPERTY_MANAGEMENT habilitado y permiso de edición, cuando el usuario crea una versión con variables permitidas, la valida, envía una prueba, obtiene resultado y publica con aprobación, entonces queda una única versión PUBLISHED auditable y el ciclo ordinario posterior puede consumirla sin crear ningún efecto contable adicional.

**Prueba negativa:** Dado que PROPERTY_MANAGEMENT está DISABLED o el cuerpo contiene una variable no permitida, cuando el usuario intenta guardar o publicar, entonces la API devuelve MODULE_DISABLED o VALIDATION_ERROR, no crea una versión utilizable, no envía correo productivo y no altera cargos ni asientos.

**Evidencias/pruebas exigidas:** `T-UI-XLS-012`, `T-PROC-XLS-012`, `T-NEG-XLS-012`.

### XLS-013 — Modificar Email Exp. Extraordinarias

**Ubicación original:** Email > Modificar Email Exp. Extraordinarias. **Celda:** C21. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/email/modificar-email-exp-extraordinarias`.

**Objetivo y vista:** Versionar de forma independiente la plantilla de correo para expensas extraordinarias, permitiendo explicar ciclo, resolución o concepto aprobado sin mezclarla con la plantilla ordinaria. La pantalla conserva el rótulo original y muestra selector de empresa, estado del módulo opcional y lista de versiones extraordinarias.

**Campos y filtros:** empresa (selector; requerido; Empresa del tenant y autorizada para consultar el tipo extraordinario.); version_id (selector; opcional/condicional; Debe pertenecer a la empresa y a la plantilla EXPENSE_EXTRAORDINARY.); estado_version (multi-selector; opcional/condicional; Valores enumerados; no aceptar estados libres.); asunto (texto; requerido; No vacío, saneado y con variables del catálogo extraordinario solamente.); cuerpo (editor_html_texto; requerido; HTML saneado, alternativa de texto y marcadores permitidos; no ejecutar scripts.); destinatario_prueba (email; requerido; Formato válido y destinatario autorizado para pruebas.); motivo_cambio (textarea; requerido; Explica el cambio y se graba en auditoría.).

**Columnas visibles:** Versión; Estado; Código/tipo de ciclo; Vigencia; Autor; Variables; Prueba; Último resultado.

**Acciones y permisos:** Consultar versiones → Muestra historial paginado, contenido protegido y metadatos del ciclo de vida. [permiso: notifications.email.template.read]; Crear borrador → Abre una versión DRAFT separada de la plantilla ordinaria. [permiso: notifications.email.template.write]; Guardar versión → Persiste snapshot, hash, variables detectadas y auditoría. [permiso: notifications.email.template.write]; Vista previa → Renderiza con ciclo extraordinario de ejemplo y lista validaciones. [permiso: notifications.email.template.preview]; Enviar correo de prueba → Encola solo la prueba, con identificador y resultado de entrega. [permiso: notifications.email.test_send]; Solicitar aprobación → Envía la versión con su hash a aprobación segregada. [permiso: notifications.email.approval.request]; Publicar versión → Vuelve utilizable la versión aprobada para notificaciones extraordinarias futuras. [permiso: notifications.email.template.publish].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y versión; comprobar que PROPERTY_MANAGEMENT esté ENABLED para crear o cambiar y que el usuario tenga permiso.
2. Capturar asunto, cuerpo, variables permitidas, vigencia y motivo, sin copiar automáticamente la plantilla ordinaria.
3. Validar sintaxis, saneamiento, snapshot de ciclo, permisos y ausencia de solapamiento de versiones vigentes.
4. Guardar el borrador y solicitar aprobación sobre el hash; conservar el historial y bloquear edición de versiones publicadas.
5. Generar vista previa y enviar correo de prueba al destinatario autorizado; registrar el intento de entrega de forma asíncrona.
6. Publicar tras aprobación y dejar disponible el contenido para el proceso de notificación posterior al commit; consultar entregas en la bandeja común.

**Estados:** DRAFT; VALIDATING; PENDING_APPROVAL; APPROVED; PUBLISHED; ARCHIVED; TEST_QUEUED; TEST_DELIVERED; TEST_FAILED; MODULE_DISABLED. **Validaciones:** Aplicar autorización efectiva por empresa, permiso y estado de PROPERTY_MANAGEMENT en servidor.; La lista de variables debe estar versionada; rechazar marcadores de otras plantillas o datos no disponibles en el snapshot.; Saneamiento HTML, límite de tamaño, texto alternativo, protección contra inyección de cabeceras y adjuntos no previstos.; No editar ni borrar una versión publicada; archivar mediante acción auditada y publicar reemplazo aprobado.; El correo de prueba nunca llama al proveedor dentro de la transacción ni genera un evento contable.; Usar clave idempotente y conciliación del proveedor para que un timeout no cause reenvío ciego..

**Persistencia e impacto contable:** Ninguno directo: no prepara, finaliza ni publica cargos de expensa, obligaciones o asientos. El ciclo extraordinario conserva su propio efecto contable y el correo se encola después del commit. Un fallo de proveedor se registra para revisión y no deshace una contabilización válida. Sin módulo inmobiliario solo se permite lectura histórica.

**API propia propuesta:** GET /api/v1/notifications/email/templates/expense-extraordinary?company_id={company_id}; POST /api/v1/notifications/email/templates/expense-extraordinary/versions; POST /api/v1/notifications/email/templates/expense-extraordinary/versions/{version_id}/preview; POST /api/v1/notifications/email/templates/expense-extraordinary/versions/{version_id}/test; POST /api/v1/notifications/email/templates/expense-extraordinary/versions/{version_id}/approval; POST /api/v1/notifications/email/templates/expense-extraordinary/versions/{version_id}/publish. **Pantallas relacionadas:** ADD-EMAIL-001. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un módulo inmobiliario habilitado y una resolución extraordinaria representada en datos de ejemplo, cuando el usuario autorizado crea, valida, prueba y publica una versión aprobada, entonces la plantilla queda disponible para el siguiente ciclo extraordinario y su historial registra hash, usuario, aprobación y resultado de prueba.

**Prueba negativa:** Dado que el módulo está deshabilitado o la plantilla intenta usar una variable ordinaria no presente en el snapshot extraordinario, cuando se intenta guardar o publicar, entonces se rechaza con MODULE_DISABLED o VALIDATION_ERROR, no se crea envío productivo ni se modifica el ciclo, saldo o asiento.

**Evidencias/pruebas exigidas:** `T-UI-XLS-013`, `T-PROC-XLS-013`, `T-NEG-XLS-013`.

### XLS-014 — Modificar Email Recaudaciones

**Ubicación original:** Email > Modificar Email Recaudaciones. **Celda:** C22. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/email/modificar-email-recaudaciones`.

**Objetivo y vista:** Administrar la plantilla general de correo que se encola después de registrar y aplicar una recaudación, adjuntando únicamente el recibo correspondiente al destinatario autorizado. La pantalla muestra empresa, versiones y estado de la plantilla de recaudación.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada del núcleo; no requiere módulo inmobiliario.); estado_version (multi-selector; opcional/condicional; Solo estados del ciclo de plantilla definidos por API.); asunto (texto; requerido; No vacío, sin inyección de cabeceras y con variables de recaudación permitidas.); cuerpo (editor_html_texto; requerido; HTML saneado, texto alternativo y variables de recibo existentes.); destinatario_origen (selector; requerido; Debe ser tercero autorizado de la recaudación; nunca una lista global.); adjuntar_recibo (booleano_controlado; requerido; Debe ser verdadero para el flujo aceptado; el recibo debe corresponder a la recaudación.); motivo_cambio (textarea; requerido; Obligatorio para guardar/publicar y auditado.).

**Columnas visibles:** Versión; Estado; Vigencia; Variables; Adjunto configurado; Autor; Prueba; Último cambio.

**Acciones y permisos:** Consultar versiones → Lista versiones y sus reglas de destinatario/recibo sin exponer otros clientes. [permiso: notifications.email.template.read]; Crear borrador → Crea DRAFT de la plantilla de recaudación del núcleo. [permiso: notifications.email.template.write]; Guardar versión → Valida variables, adjunto permitido y guarda hash/auditoría. [permiso: notifications.email.template.write]; Vista previa → Muestra recibo sintético y destinatario enmascarado. [permiso: notifications.email.template.preview]; Enviar correo de prueba → Encola prueba con recibo sintético; no registra cobro ni asiento. [permiso: notifications.email.test_send]; Solicitar aprobación → Crea aprobación segregada sobre versión y configuración de adjunto. [permiso: notifications.email.approval.request]; Publicar versión → Habilita la versión para recaudaciones posteriores sin duplicar recibos. [permiso: notifications.email.template.publish].

**Proceso que debe ejecutar:**

1. Seleccionar empresa del núcleo y revisar la versión actual; no solicitar condominio, inmueble, alícuota ni paquete inmobiliario.
2. Capturar asunto, cuerpo, variables, destinatario autorizado y regla obligatoria de adjuntar solo el recibo propio.
3. Validar tercero, preferencias aplicables, existencia del documento, correspondencia recibo-recaudación, saneamiento y permisos.
4. Guardar DRAFT y solicitar aprobación; el cambio no toca la recaudación ni el documento contable ya registrado.
5. Previsualizar y enviar prueba con datos sintéticos; dejar el mensaje en outbox y registrar el resultado asincrónico.
6. Publicar la versión aprobada; cuando una recaudación se confirme, el evento posterior al commit la utilizará con idempotencia y trazabilidad.

**Estados:** DRAFT; VALIDATING; PENDING_APPROVAL; APPROVED; PUBLISHED; ARCHIVED; TEST_QUEUED; TEST_DELIVERED; TEST_FAILED. **Validaciones:** La empresa, recaudación, recibo, tercero y permisos deben pertenecer al mismo tenant/empresa.; El adjunto permitido es únicamente el recibo autorizado del destinatario; rechazar rutas de archivo arbitrarias o documentos de otro tercero.; Rechazar variables inexistentes, HTML peligroso, destinatario no autorizado y cambios de versión publicados.; El envío productivo se dispara por evento de recaudación confirmado, no por guardar o publicar la plantilla.; Registrar hash del payload, referencia del proveedor, rebotes y resultado sin almacenar credenciales ni exponer email completo en listados.; Aplicar idempotencia por evento y conciliación de timeout; restaurar outbox requiere revisión antes de reanudar..

**Persistencia e impacto contable:** La edición de plantilla no contabiliza. En el proceso origen, la recaudación y sus aplicaciones crean el efecto contable conforme al núcleo; el email solo consume el evento posterior al commit y adjunta una representación del recibo. Reintentos o timeouts del proveedor no crean otro cobro, recibo, asiento ni aplicación.

**API propia propuesta:** GET /api/v1/notifications/email/templates/collections?company_id={company_id}; POST /api/v1/notifications/email/templates/collections/versions; POST /api/v1/notifications/email/templates/collections/versions/{version_id}/preview; POST /api/v1/notifications/email/templates/collections/versions/{version_id}/test; POST /api/v1/notifications/email/templates/collections/versions/{version_id}/approval; POST /api/v1/notifications/email/templates/collections/versions/{version_id}/publish. **Pantallas relacionadas:** ADD-EMAIL-001. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un cliente del núcleo sin inmuebles, cuando se publica una versión aprobada y luego se confirma una recaudación con recibo y destinatario autorizado, entonces se encola un único email con el recibo correcto, se registra su entrega y la recaudación conserva exactamente sus aplicaciones y efecto contable.

**Prueba negativa:** Dado un recibo de otro tercero, un adjunto arbitrario o una empresa sin permiso, cuando se intenta probar o usar la plantilla, entonces la validación rechaza el mensaje, no expone el documento, no encola un envío productivo y no altera el cobro ni el asiento.

**Evidencias/pruebas exigidas:** `T-UI-XLS-014`, `T-PROC-XLS-014`, `T-NEG-XLS-014`.

### XLS-015 — Modificar Email Gestión Cobranza

**Ubicación original:** Email > Modificar Email Gestión Cobranza. **Celda:** C23. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/email/modificar-email-gestion-cobranza`.

**Objetivo y vista:** Versionar la plantilla general para gestión de cobranza, mostrando saldo congelado a fecha y vencimientos del auxiliar canónico, y dejando registro de cada contacto. La pantalla conserva el nombre original y ofrece empresa, versiones, variables permitidas y preview con saldo a fecha, vencimientos y bandas configuradas por el núcleo.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada del núcleo y con cartera visible para el usuario.); estado_version (multi-selector; opcional/condicional; Estados enumerados, con paginación y empresa activa.); asunto (texto; requerido; Sin inyección de cabeceras y con variables aprobadas de cobranza.); cuerpo (editor_html_texto; requerido; HTML saneado y texto alternativo; no incluir datos de otros terceros.); fecha_corte_saldo (fecha; requerido; Fecha válida; saldo y vencimientos se leen del snapshot del proceso, no de cálculo del navegador.); destinatario_origen (selector; requerido; Cliente autorizado, preferencia/canal verificable y empresa coincidente.); motivo_cambio (textarea; requerido; Auditado en creación, publicación o archivo de versión.).

**Columnas visibles:** Versión; Estado; Vigencia; Saldo a fecha habilitado; Vencimiento habilitado; Variables; Última prueba; Autor.

**Acciones y permisos:** Consultar versiones → Muestra versiones y trazabilidad sin modificar cartera. [permiso: notifications.email.template.read]; Crear borrador → Crea DRAFT con catálogo de variables de cobranza. [permiso: notifications.email.template.write]; Guardar versión → Guarda hash, snapshot de configuración y auditoría. [permiso: notifications.email.template.write]; Vista previa → Renderiza saldo/vencimientos sintéticos y valida privacidad del mensaje. [permiso: notifications.email.template.preview]; Enviar correo de prueba → Encola prueba sin contacto real de campaña ni cambio de cartera. [permiso: notifications.email.test_send]; Solicitar aprobación → Somete el contenido y variables a aprobación segregada. [permiso: notifications.email.approval.request]; Publicar versión → Habilita el contenido para una campaña o contacto posterior autorizado. [permiso: notifications.email.template.publish].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y versión; comprobar cartera, preferencias y permiso, sin exigir condominio, inmueble ni alícuota.
2. Capturar asunto, cuerpo, variables de saldo a fecha, vencimiento, destinatario y motivo; no capturar una tasa de mora fija.
3. Validar snapshot de cartera, fecha de corte, segregación de saldos a favor, destinatario, saneamiento y ausencia de datos cruzados.
4. Guardar DRAFT y solicitar aprobación; el hash aprobado representa exactamente el mensaje y sus variables permitidas.
5. Previsualizar y enviar prueba; registrar contacto de prueba, intento, resultado y cualquier rebote en la bandeja común.
6. Publicar la versión; la campaña/contacto posterior congela el saldo al envío, enlaza el evento y registra cada contacto y promesa sin contabilizar por el correo.

**Estados:** DRAFT; VALIDATING; PENDING_APPROVAL; APPROVED; PUBLISHED; ARCHIVED; TEST_QUEUED; TEST_DELIVERED; TEST_FAILED. **Validaciones:** El snapshot debe provenir de la cartera autorizada, tener fecha de corte explícita y conservar saldo original, vencimiento y versión.; No fijar porcentajes ni tasas en la plantilla; cualquier cálculo configurado debe venir de la política aprobada y vigencia correspondiente.; Aplicar preferencias/canal y destinatario por empresa; impedir divulgación de saldos entre clientes.; Rechazar variables no permitidas, saldo calculado en cliente, HTML inseguro y cambios sobre versión publicada.; Registrar cada contacto, resultado, rebote y promesa con actor, timestamp y correlación; no duplicar por reintento.; El proveedor externo se llama desde worker/outbox; ante timeout se concilia antes de reintentar..

**Persistencia e impacto contable:** No hay efecto contable por modificar, probar o publicar una plantilla. La gestión de cobranza consulta el saldo canónico al corte y lo congela en el mensaje/campaña; no recalcula saldos en React, no modifica cartera y no aplica automáticamente recargos o tasas. Una promesa de pago es registro de gestión, no cobro ni asiento hasta que exista una operación financiera independiente.

**API propia propuesta:** GET /api/v1/notifications/email/templates/collections-management?company_id={company_id}; POST /api/v1/notifications/email/templates/collections-management/versions; POST /api/v1/notifications/email/templates/collections-management/versions/{version_id}/preview; POST /api/v1/notifications/email/templates/collections-management/versions/{version_id}/test; POST /api/v1/notifications/email/templates/collections-management/versions/{version_id}/approval; POST /api/v1/notifications/email/templates/collections-management/versions/{version_id}/publish. **Pantallas relacionadas:** ADD-EMAIL-001. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un cliente del núcleo con una obligación vencida y un saldo a fecha autorizado, cuando se publica una plantilla aprobada y se ejecuta un contacto, entonces el mensaje contiene el snapshot correcto de saldo y vencimiento, el contacto queda registrado y la cartera y contabilidad permanecen sin cambios.

**Prueba negativa:** Dado un saldo calculado en navegador, una variable de tasa no aprobada, un destinatario de otra empresa o un módulo sin permiso, cuando se intenta probar o ejecutar el contacto, entonces la API rechaza la operación, no divulga información, no registra contacto productivo y no modifica cartera ni contabilidad.

**Evidencias/pruebas exigidas:** `T-UI-XLS-015`, `T-PROC-XLS-015`, `T-NEG-XLS-015`.

### Procesos integrales del grupo

**Versionado, prueba y publicación de Email de expensas ordinarias**. Secuencia: XLS-012; ADD-EMAIL-001. Usuario con permiso selecciona empresa y módulo habilitado; crea DRAFT, captura variables permitidas, valida y obtiene preview; solicita aprobación sobre hash; envía prueba por outbox; aprueba y publica; el ciclo ordinario posterior emite el evento y la bandeja concilia entrega. Con módulo deshabilitado, lectura histórica permanece y alta/cambio termina en MODULE_DISABLED. Resultado: Cero efecto por la plantilla o el correo. Cargos, obligaciones y asientos del ciclo son independientes y se conservan aunque falle el proveedor. Prueba: Ejecutar T-XLS-012: publicar una versión aprobada, finalizar un ciclo de prueba, verificar un único evento de correo posterior al commit, consultar entrega y comprobar que no apareció asiento adicional ni duplicado de deuda.

**Versionado, prueba y publicación de Email de expensas extraordinarias**. Secuencia: XLS-013; ADD-EMAIL-001. Con PROPERTY_MANAGEMENT habilitado, crear versión separada de ordinarias, validar snapshot y variables extraordinarias, solicitar aprobación, enviar prueba, publicar y consumir en el ciclo extraordinario posterior al commit. La bandeja registra estado, error y reintento controlado; una baja del módulo bloquea nuevas escrituras verticales. Resultado: La plantilla no publica cargos ni asientos. El ciclo conserva su contabilización canónica y el email no la revierte. Prueba: Ejecutar T-XLS-013 con un ciclo extraordinario legítimo: comprobar versión/hashes, prueba exitosa, un mensaje productivo correlacionado, entrega consultable y ausencia de segundo cargo o asiento.

**Recaudación general con recibo y correo autorizado**. Secuencia: XLS-014; ADD-EMAIL-001. En núcleo sin inmuebles, publicar plantilla aprobada; registrar y aplicar recaudación; generar recibo; confirmar operación; emitir evento posterior al commit; resolver destinatario autorizado; adjuntar solo su recibo; encolar, entregar o dejar fallo conciliable; registrar trazabilidad en bandeja. Resultado: La recaudación y sus aplicaciones producen el efecto contable una sola vez. Email y reintentos no crean cobro, recibo, asiento ni aplicación adicional. Prueba: Ejecutar T-XLS-014 sin condominio: verificar recibo del tercero correcto, único mensaje idempotente, entrega y saldos contables sin variación por el reintento del proveedor.

**Gestión de cobranza con snapshot y registro de contactos**. Secuencia: XLS-015; ADD-EMAIL-001. Publicar plantilla del núcleo; seleccionar cartera y fecha de corte; congelar saldo/vencimientos desde backend; aprobar contacto; encolar correo; registrar entrega/rebote y cada contacto; registrar promesa si existe; consultar historial. Ninguna etapa calcula tasas nuevas ni altera la obligación. Resultado: La comunicación y la promesa son gestión operativa; el saldo canónico, aplicaciones y asientos solo cambian mediante operaciones financieras independientes. Prueba: Ejecutar T-XLS-015: generar contacto con saldo a fecha, verificar contenido y privacidad, registrar resultado y promesa, repetir la solicitud y comprobar que no se duplica contacto ni se modifica cartera.

## Contabilidad > Financiero

### XLS-016 — Tipo Comp. Contables

**Ubicación original:** Contabilidad > Financiero > Configuración > Tipo Comp. Contables. **Celda:** E27. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/configuracion/tipo-comp-contables`.

**Objetivo y vista:** Configurar tipos de comprobante contable y su numeración interna, manteniendo separado el tipo de asiento del tipo de documento fiscal y permitiendo operar sin inmuebles. Pantalla dedicada bajo la ruta original, con selector de empresa y ejercicio, tabla de tipos activos/inactivos, panel lateral de alta/edición y vista de simulación de numeración.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada en contexto activo.); código y nombre (texto; requerido; Código único por empresa; nombre no vacío.); clase (enum diario/ingreso/egreso/ajuste; requerido; Solo valores configurados; no se mezcla con tipo fiscal.); política de numeración (enum por ejercicio/secuencial; requerido; Secuencia compatible con tipo y periodo.); vigencia (rango de fechas; requerido; Sin solape con otra versión activa.); activo (booleano; requerido; Inactivar no elimina históricos.); motivo (texto largo; requerido; Requerido al cambiar vigencia o inactivar.).

**Columnas visibles:** Código; Nombre; Clase contable; Política de numeración; Vigencia; Estado; Última versión.

**Acciones y permisos:** Nuevo tipo → Guarda borrador de configuración; no contabiliza. [permiso: accounting.type.create]; Editar borrador → Crea versión validable sin sobrescribir históricos. [permiso: accounting.type.update]; Inactivar → Impide nuevos asientos y conserva referencias. [permiso: accounting.type.deactivate]; Ver auditoría → Consulta versiones y decisiones. [permiso: accounting.audit.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y comprobar permiso.
2. Capturar clase, código, numeración y vigencia.
3. Validar unicidad, solapes y diferencia contable/fiscal.
4. Aprobar el cambio si la política lo exige.
5. Activar la versión y dejarla disponible para nuevos comprobantes.
6. Consultar aplicación posterior sin alterar asientos existentes.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; VERSIONED: cada cambio produce nueva versión efectiva. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; No permitir activar un tipo sin secuencia compatible o con vigencia superpuesta..

**Persistencia e impacto contable:** Solo afecta la resolución de futuros asientos y sus números; no cambia comprobantes publicados, saldos ni documentos fiscales. Los huecos de secuencia quedan justificados. No contiene campos inmobiliarios obligatorios.

**API propia propuesta:** GET /api/v1/accounting/journal-types; POST /api/v1/accounting/journal-types; POST /api/v1/accounting/journal-types/{id}/versions; POST /api/v1/accounting/journal-types/{id}/deactivate. **Pantallas relacionadas:** XLS-023; XLS-024. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un tipo diario vigente y una empresa autorizada, cuando se guarda con numeración válida y se aprueba, entonces aparece activo para el registro y la simulación devuelve el siguiente número sin crear asiento.

**Prueba negativa:** Dado un tipo con código duplicado o clase fiscal no soportada, cuando se intenta activar, entonces se rechaza con errores de campo y no se modifica la versión vigente.

**Evidencias/pruebas exigidas:** `T-UI-XLS-016`, `T-PROC-XLS-016`, `T-NEG-XLS-016`.

### XLS-017 — Establecimientos

**Ubicación original:** Contabilidad > Financiero > Configuración > Establecimientos. **Celda:** E28. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/configuracion/establecimientos`.

**Objetivo y vista:** Mantener establecimientos y puntos de emisión por empresa, ambiente y vigencia, dejando la configuración fiscal separada de la contabilización general. Listado dedicado bajo Configuración > Establecimientos con filtros empresa, código, ambiente, vigencia y estado.

**Campos y filtros:** empresa (selector; requerido; Membresía y alcance de empresa verificados.); código/nombre de establecimiento (texto; requerido; Código único por empresa; nombre requerido.); punto de emisión (texto; requerido; Formato permitido y único dentro del establecimiento.); ambiente (enum configuración/prueba/producción; requerido; Valor versionado por política, no inferido.); dirección fiscal (objeto texto; requerido; Snapshot requerido para configuración; cambios versionados.); vigencia desde/hasta (fechas; requerido; No solape con la misma combinación.); estado (enum activo/inactivo; requerido; No inactivar si hay uso incompatible sin advertencia.).

**Columnas visibles:** Establecimiento; Punto; Ambiente; Dirección resumida; Vigencia; Estado; Secuencia vinculada.

**Acciones y permisos:** Registrar → Crea configuración pendiente; no emite por sí sola. [permiso: fiscal.establishment.create]; Validar vigencia → Detecta solapes y dependencias. [permiso: fiscal.establishment.validate]; Inactivar → Bloquea nuevas reservas y conserva históricos. [permiso: fiscal.establishment.deactivate]; Consultar historial → Muestra snapshots y auditoría. [permiso: fiscal.audit.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y cargar establecimientos autorizados.
2. Capturar establecimiento, punto, ambiente y vigencia.
3. Validar unicidad, solapes y permisos.
4. Aprobar y asociar una secuencia terminal compatible.
5. Publicar configuración para documentos futuros.
6. Consultar vínculos sin alterar documentos históricos.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; EFFECTIVE: configuración vigente para reservas futuras. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Impedir una combinación establecimiento/punto/ambiente sin secuencia o con vigencia incompatible..

**Persistencia e impacto contable:** Afecta únicamente la selección de emisor y reserva de numeración futura. No publica XML, no contabiliza y no cambia datos fiscales congelados de documentos existentes. Opera sin inmuebles.

**API propia propuesta:** GET /api/v1/fiscal/establishments; POST /api/v1/fiscal/establishments; POST /api/v1/fiscal/establishments/{id}/validate; POST /api/v1/fiscal/establishments/{id}/deactivate. **Pantallas relacionadas:** XLS-023; XLS-020; XLS-021. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un establecimiento activo con punto y ambiente sin solape, cuando se aprueba, entonces puede ser seleccionado por una secuencia terminal futura.

**Prueba negativa:** Dado un punto repetido en el mismo establecimiento y ambiente, cuando se guarda, entonces se muestra conflicto y no se crea una segunda configuración.

**Evidencias/pruebas exigidas:** `T-UI-XLS-017`, `T-PROC-XLS-017`, `T-NEG-XLS-017`.

### XLS-018 — Tipos de C. Costos

**Ubicación original:** Contabilidad > Financiero > Configuración > Centro de Costos > Tipos de C. Costos. **Celda:** F30. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/configuracion/centro-de-costos/tipos-de-c-costos`.

**Objetivo y vista:** Administrar tipos de centro de costo y permitir inactivarlos sin borrar ni invalidar registros históricos. Pantalla de mantenimiento independiente en Configuración > Centro de Costos > Tipos de C.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); código (texto; requerido; Único por empresa; no reutilizable tras uso histórico.); nombre (texto; requerido; Requerido y descriptivo.); descripción (texto largo; opcional/condicional; Longitud máxima y texto seguro.); vigencia (fechas; requerido; No solapa si se versiona.); activo (booleano; requerido; La inactivación es lógica.); motivo de inactivación (texto largo; opcional/condicional; Obligatorio si existen dependencias.).

**Columnas visibles:** Código; Nombre; Centros dependientes; Vigencia; Estado; Actualizado por.

**Acciones y permisos:** Crear tipo → Deja tipo validado para clasificar centros. [permiso: cost_center_type.create]; Editar → Actualiza solo atributos permitidos o crea versión. [permiso: cost_center_type.update]; Inactivar → Bloquea nuevos centros; conserva historial. [permiso: cost_center_type.deactivate]; Ver dependencias → Lista centros y asientos vinculados. [permiso: cost_center_type.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y consultar tipos.
2. Capturar código, nombre y vigencia.
3. Validar unicidad y revisar dependencias.
4. Aprobar cambio si la segregación aplica.
5. Activar o inactivar lógicamente.
6. Consultar centros y asientos históricos.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; INACTIVE: no seleccionable en nuevas altas. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; No permitir inactivar sin advertir el número de centros y reglas que quedarán no seleccionables..

**Persistencia e impacto contable:** No altera líneas de asientos ni saldos. Al inactivar, los centros existentes siguen trazables y los reportes históricos los incluyen; solo se impide asignarlos en nuevas operaciones. No requiere dimensión inmobiliaria.

**API propia propuesta:** GET /api/v1/accounting/cost-center-types; POST /api/v1/accounting/cost-center-types; PATCH /api/v1/accounting/cost-center-types/{id}; POST /api/v1/accounting/cost-center-types/{id}/deactivate. **Pantallas relacionadas:** Ninguna opción relacionada adicional. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un tipo activo sin código repetido, cuando se registra y aprueba, entonces aparece disponible para crear centros y no cambia asientos previos.

**Prueba negativa:** Dado un código usado por la empresa, cuando se intenta crear otro tipo, entonces se rechaza con conflicto de unicidad y sin pérdida de datos.

**Evidencias/pruebas exigidas:** `T-UI-XLS-018`, `T-PROC-XLS-018`, `T-NEG-XLS-018`.

### XLS-019 — Ingreso C. Costos

**Ubicación original:** Contabilidad > Financiero > Configuración > Centro de Costos > Ingreso C. Costos. **Celda:** F31. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/configuracion/centro-de-costos/ingreso-c-costos`.

**Objetivo y vista:** Crear centros de costo jerárquicos por empresa y controlar si son obligatorios en líneas de asiento, sin acoplarlos a inmuebles. Pantalla dedicada en Configuración > Centro de Costos > Ingreso C.

**Campos y filtros:** empresa (selector; requerido; Membresía de empresa validada.); tipo de centro (selector; requerido; Tipo activo de XLS-018.); código (texto; requerido; Único por empresa; formato aprobado.); nombre (texto; requerido; No vacío.); centro padre (selector jerárquico; opcional/condicional; Debe ser de misma empresa; sin ciclos.); imputable (booleano; requerido; Solo centros imputables reciben líneas.); obligatorio en línea (booleano; requerido; Aplicado por regla de tipo/operación.); estado (enum activo/inactivo; requerido; Inactivación lógica.).

**Columnas visibles:** Código; Nombre; Padre; Tipo; Imputable; Obligatorio; Estado; Uso.

**Acciones y permisos:** Crear centro → Añade nodo y regla sin contabilizar. [permiso: cost_center.create]; Mover/editar borrador → Actualiza jerarquía si no rompe históricos. [permiso: cost_center.update]; Inactivar → Evita nuevas asignaciones y preserva reportes. [permiso: cost_center.deactivate]; Ver líneas → Navega a asientos de origen. [permiso: cost_center.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y tipo activo.
2. Capturar código, nombre, padre y reglas.
3. Validar padre, ciclos, imputabilidad y obligatoriedad.
4. Aprobar configuración cuando la política lo exija.
5. Publicar para formularios y plantillas futuras.
6. Consultar su impacto en reportes y asientos.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; POSTABLE/NON_POSTABLE: controla asignación a líneas. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Rechazar ciclo jerárquico, padre de otra empresa o centro no imputable usado en una línea..

**Persistencia e impacto contable:** Define dimensiones para futuros asientos y reportes; no crea movimientos ni modifica saldos. Una línea publicada conserva su centro aunque este se inactive. El campo inmobiliario no es obligatorio y no aparece en el contrato del núcleo.

**API propia propuesta:** GET /api/v1/accounting/cost-centers/tree; POST /api/v1/accounting/cost-centers; PATCH /api/v1/accounting/cost-centers/{id}; POST /api/v1/accounting/cost-centers/{id}/deactivate. **Pantallas relacionadas:** XLS-018; XLS-025; XLS-027. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un centro activo imputable cuyo padre pertenece a la misma empresa, cuando se aprueba, entonces aparece en el selector de líneas y en reportes por centro.

**Prueba negativa:** Dado un centro no imputable seleccionado en un asiento, cuando se valida la línea, entonces se rechaza antes de publicar y no se genera asiento.

**Evidencias/pruebas exigidas:** `T-UI-XLS-019`, `T-PROC-XLS-019`, `T-NEG-XLS-019`.

### XLS-020 — Tipos Imp. Renta

**Ubicación original:** Contabilidad > Financiero > Configuración > Retenciones > Tipos Imp. Renta. **Celda:** F33. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/configuracion/retenciones/tipos-imp-renta`.

**Objetivo y vista:** Versionar códigos y porcentajes de retención de renta por vigencia, con fuente y aprobador, sin fijar tasas en código. Pantalla dedicada para Tipos Imp.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada y perfil tributario visible.); código (texto; requerido; Único dentro del catálogo y vigencia.); descripción (texto; requerido; Debe identificar el concepto.); porcentaje (decimal; requerido; Decimal positivo o cero según catálogo aprobado; no constante.); vigencia desde/hasta (fechas; requerido; Sin solapamiento del mismo código.); fuente/fundamento (texto/archivo; requerido; Referencia documental y hash si existe.); aprobador (usuario; requerido; Segregación; no autoaprobación si está prohibida.); estado (enum borrador/aprobado/inactivo; requerido; Solo aprobado se puede aplicar.).

**Columnas visibles:** Código; Descripción; Porcentaje vigente; Vigencia; Fuente; Aprobador; Estado.

**Acciones y permisos:** Crear versión → Guarda catálogo pendiente sin aplicar tasa. [permiso: tax.catalog.create]; Validar → Comprueba solapes, formato y fuente. [permiso: tax.catalog.validate]; Aprobar/publicar → Deja versión disponible para cálculos nuevos. [permiso: tax.catalog.approve]; Inactivar → Impide uso futuro y conserva snapshots. [permiso: tax.catalog.deactivate].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y catálogo.
2. Capturar código, porcentaje, vigencia y fundamento.
3. Validar formato, solapes y fuente.
4. Solicitar y obtener aprobación segregada.
5. Publicar la versión para nuevas retenciones.
6. Consultar snapshot usado por cada documento.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; PUBLISHED: versión aplicable dentro de su vigencia. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; No permitir porcentaje sin vigencia, fuente y aprobador; no inferir la tasa solo por tipo de tercero..

**Persistencia e impacto contable:** No contabiliza por sí mismo. La versión elegida se congela en el detalle de futuras retenciones y puede producir obligación fiscal según la operación; cambiarla no modifica documentos o asientos ya publicados. No se exige inmueble.

**API propia propuesta:** GET /api/v1/tax/withholding-catalogs/renta; POST /api/v1/tax/withholding-catalogs/renta; POST /api/v1/tax/withholding-catalogs/renta/{id}/approve; POST /api/v1/tax/withholding-catalogs/renta/{id}/deactivate. **Pantallas relacionadas:** XLS-027; XLS-029. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un código de renta con porcentaje, vigencia y fuente aprobados, cuando se consulta una operación dentro del rango, entonces devuelve esa versión y su snapshot.

**Prueba negativa:** Dado un nuevo porcentaje con solape o sin aprobador, cuando se intenta publicar, entonces se rechaza y la versión anterior permanece vigente.

**Evidencias/pruebas exigidas:** `T-UI-XLS-020`, `T-PROC-XLS-020`, `T-NEG-XLS-020`.

### XLS-021 — Tipos Ret. IVA

**Ubicación original:** Contabilidad > Financiero > Configuración > Retenciones > Tipos Ret. IVA. **Celda:** F34. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/configuracion/retenciones/tipos-ret-iva`.

**Objetivo y vista:** Versionar códigos y porcentajes de retención de IVA por vigencia, con fuente y aprobador, sin fijar tasas en código. Pantalla dedicada para Tipos Ret.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada y perfil tributario visible.); código (texto; requerido; Único dentro del catálogo y vigencia.); descripción (texto; requerido; Debe identificar el concepto.); porcentaje (decimal; requerido; Decimal positivo o cero según catálogo aprobado; no constante.); vigencia desde/hasta (fechas; requerido; Sin solapamiento del mismo código.); fuente/fundamento (texto/archivo; requerido; Referencia documental y hash si existe.); aprobador (usuario; requerido; Segregación; no autoaprobación si está prohibida.); estado (enum borrador/aprobado/inactivo; requerido; Solo aprobado se puede aplicar.).

**Columnas visibles:** Código; Descripción; Porcentaje vigente; Vigencia; Fuente; Aprobador; Estado.

**Acciones y permisos:** Crear versión → Guarda catálogo pendiente sin aplicar tasa. [permiso: tax.catalog.create]; Validar → Comprueba solapes, formato y fuente. [permiso: tax.catalog.validate]; Aprobar/publicar → Deja versión disponible para cálculos nuevos. [permiso: tax.catalog.approve]; Inactivar → Impide uso futuro y conserva snapshots. [permiso: tax.catalog.deactivate].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y catálogo.
2. Capturar código, porcentaje, vigencia y fundamento.
3. Validar formato, solapes y fuente.
4. Solicitar y obtener aprobación segregada.
5. Publicar la versión para nuevas retenciones.
6. Consultar snapshot usado por cada documento.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; PUBLISHED: versión aplicable dentro de su vigencia. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; No permitir porcentaje sin vigencia, fuente y aprobador; no inferir la tasa solo por tipo de tercero..

**Persistencia e impacto contable:** No contabiliza por sí mismo. La versión elegida se congela en el detalle de futuras retenciones y puede producir obligación fiscal según la operación; cambiarla no modifica documentos o asientos ya publicados. No se exige inmueble.

**API propia propuesta:** GET /api/v1/tax/withholding-catalogs/iva; POST /api/v1/tax/withholding-catalogs/iva; POST /api/v1/tax/withholding-catalogs/iva/{id}/approve; POST /api/v1/tax/withholding-catalogs/iva/{id}/deactivate. **Pantallas relacionadas:** XLS-027; XLS-029. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un código de IVA con porcentaje, vigencia y fuente aprobados, cuando se consulta una operación dentro del rango, entonces devuelve esa versión y su snapshot.

**Prueba negativa:** Dado un nuevo porcentaje con solape o sin aprobador, cuando se intenta publicar, entonces se rechaza y la versión anterior permanece vigente.

**Evidencias/pruebas exigidas:** `T-UI-XLS-021`, `T-PROC-XLS-021`, `T-NEG-XLS-021`.

### XLS-022 — Expensas

**Ubicación original:** Contabilidad > Financiero > Configuración > Secuencia de Documentos > Expensas. **Celda:** F36. **Paquete:** `PROPERTY_MANAGEMENT`.

**Ruta React:** `/contabilidad/financiero/configuracion/secuencia-de-documentos/expensas`.

**Objetivo y vista:** Configurar la secuencia interna de expensas como capacidad opcional de PROPERTY_MANAGEMENT, sin confundirla con autorización fiscal y conservando lectura histórica. Pantalla dedicada bajo la ruta original.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); condominio (selector opcional; opcional/condicional; Requerido solo si PROPERTY_MANAGEMENT está ENABLED.); serie interna (texto; requerido; Única por empresa/condominio y tipo de expensa.); tipo de expensa (enum ordinaria/extraordinaria; requerido; Regla de extensión; no es tipo fiscal.); siguiente número (entero; requerido; Reservado atómicamente; nunca retrocede.); vigencia (fechas; requerido; No solape de serie activa.); estado del módulo (solo lectura; requerido; ENABLED/READ_ONLY/DISABLED desde contexto backend.).

**Columnas visibles:** Empresa; Condominio; Serie; Tipo; Siguiente número; Vigencia; Estado; Módulo.

**Acciones y permisos:** Crear serie → Configura secuencia vertical si el módulo está habilitado. [permiso: property.expense_sequence.create]; Reservar número → Entrega un número atómico a un documento interno. [permiso: property.expense_sequence.reserve]; Inactivar → Cierra nuevas reservas sin borrar históricos. [permiso: property.expense_sequence.deactivate]; Consultar histórico → Lee series y documentos emitidos previamente. [permiso: property.expense_sequence.read].

**Proceso que debe ejecutar:**

1. Comprobar módulo y empresa en backend.
2. Capturar serie, tipo, alcance y vigencia.
3. Validar unicidad y disponibilidad.
4. Aprobar configuración vertical.
5. Reservar el número dentro de una transacción.
6. Consultar el vínculo con el cargo sin crear deuda doble.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; MODULE_DISABLED: escrituras verticales rechazadas; lectura histórica permitida; RESERVED: número consumido y trazable. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Devolver 403 MODULE_DISABLED al crear/cambiar si el módulo no está ENABLED; reserva atómica bajo lock..

**Persistencia e impacto contable:** La reserva es un identificador interno de expensa; no crea por sí sola asiento, deuda, factura ni autorización fiscal. La generación posterior del cargo usa el núcleo y un enlace vertical opcional. Con módulo apagado no hay nuevas escrituras.

**API propia propuesta:** GET /api/v1/property/expense-sequences; POST /api/v1/property/expense-sequences; POST /api/v1/property/expense-sequences/{id}/reserve; POST /api/v1/property/expense-sequences/{id}/deactivate. **Pantallas relacionadas:** XLS-023; XLS-027. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un módulo habilitado y una serie vigente, cuando dos solicitudes reservan simultáneamente, entonces reciben números distintos y consecutivos justificados.

**Prueba negativa:** Dado un módulo deshabilitado, cuando se intenta crear o modificar una serie, entonces se devuelve MODULE_DISABLED sin escribir; la consulta histórica sigue disponible.

**Evidencias/pruebas exigidas:** `T-UI-XLS-022`, `T-PROC-XLS-022`, `T-NEG-XLS-022`.

### XLS-023 — Secuencia Terminales

**Ubicación original:** Contabilidad > Financiero > Configuración > Secuencia de Documentos > Secuencia Terminales. **Celda:** F37. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/configuracion/secuencia-de-documentos/secuencia-terminales`.

**Objetivo y vista:** Definir secuencias de terminales por establecimiento, punto, tipo y ambiente, reservando números sin duplicidad bajo concurrencia. Pantalla de configuración dedicada con filtros por empresa, establecimiento, punto, tipo y ambiente.

**Campos y filtros:** empresa (selector; requerido; Empresa activa y autorizada.); establecimiento/punto (selectores; requerido; Combinación vigente de XLS-017.); tipo de documento (selector; requerido; Tipo interno/fiscal configurado, con separación.); ambiente (enum; requerido; Debe coincidir con establecimiento.); prefijo/serie (texto; requerido; Formato y unicidad por combinación.); siguiente secuencial (entero; requerido; Positivo; incremento transaccional.); justificación de hueco (texto largo; opcional/condicional; Obligatorio al registrar incidencia.).

**Columnas visibles:** Establecimiento; Punto; Tipo; Ambiente; Serie; Siguiente; Última reserva; Estado.

**Acciones y permisos:** Configurar → Crea o versiona una combinación de secuencia. [permiso: fiscal.sequence.create]; Simular siguiente → Muestra valor sin consumirlo. [permiso: fiscal.sequence.read]; Reservar → Consume atómicamente un número para el caso autorizado. [permiso: fiscal.sequence.reserve]; Justificar hueco → Registra motivo y auditoría; no compacta. [permiso: fiscal.sequence.justify_gap].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y emisor vigente.
2. Capturar tipo, ambiente, serie y punto de inicio.
3. Validar unicidad y compatibilidad.
4. Aprobar o activar configuración.
5. Reservar el número con lock e idempotencia.
6. Consultar documento y asiento que consumieron el número.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; RESERVED: número consumido; GAP_JUSTIFIED: hueco documentado, no reutilizable. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Usar lock/serialización; rechazar combinación inexistente, ambiente contradictorio o reuso de número..

**Persistencia e impacto contable:** Consume numeración futura y deja trazabilidad del actor y correlación; no publica documento, no genera asiento y no cambia impuestos. Los números consumidos nunca se reutilizan. No requiere inmuebles.

**API propia propuesta:** GET /api/v1/fiscal/terminal-sequences; POST /api/v1/fiscal/terminal-sequences; POST /api/v1/fiscal/terminal-sequences/{id}/reserve; POST /api/v1/fiscal/terminal-sequences/{id}/justify-gap. **Pantallas relacionadas:** XLS-017; XLS-016; XLS-024. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dada una secuencia activa, cuando dos usuarios reservan el siguiente número con claves distintas, entonces cada uno obtiene un número único y queda una auditoría consultable.

**Prueba negativa:** Dado un punto de emisión inactivo o una clave idempotente reutilizada con otro cuerpo, cuando se reserva, entonces se rechaza sin duplicar ni alterar la secuencia.

**Evidencias/pruebas exigidas:** `T-UI-XLS-023`, `T-PROC-XLS-023`, `T-NEG-XLS-023`.

### XLS-024 — Comprobantes Contables

**Ubicación original:** Contabilidad > Financiero > Configuración > Secuencia de Documentos > Comprobantes Contables. **Celda:** F38. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/configuracion/secuencia-de-documentos/comprobantes-contables`.

**Objetivo y vista:** Numerar comprobantes contables por empresa, tipo y ejercicio, justificando huecos y conservando trazabilidad de cada número consumido. Pantalla dedicada para administrar numeración de comprobantes contables.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); ejercicio/periodo (selector; requerido; Periodo existente y estado compatible.); tipo contable (selector; requerido; Tipo activo de XLS-016.); siguiente número (entero; requerido; Monotónico y positivo.); reserva (objeto; requerido; Actor, timestamp y correlación.); motivo de hueco (texto largo; opcional/condicional; Requerido para documentar salto.); estado (enum disponible/reservado/consumido; requerido; Transiciones server-side.).

**Columnas visibles:** Empresa; Ejercicio; Tipo; Número actual; Última reserva; Huecos; Estado.

**Acciones y permisos:** Configurar rango → Activa una definición por empresa/tipo/ejercicio. [permiso: accounting.sequence.create]; Reservar → Aparta número dentro de transacción. [permiso: accounting.sequence.reserve]; Justificar hueco → Registra explicación sin reuso. [permiso: accounting.sequence.justify_gap]; Ver comprobante → Navega al origen contable. [permiso: accounting.journal.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, ejercicio y tipo.
2. Capturar política y siguiente número.
3. Validar unicidad y periodo.
4. Aprobar configuración.
5. Reservar al publicar el comprobante.
6. Consultar el asiento y su auditoría.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; CONSUMED: asignado a comprobante; no reutilizable. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Bloquear la reserva con tipo, empresa y periodo; impedir publicación con secuencia agotada o periodo cerrado..

**Persistencia e impacto contable:** La numeración acompaña el asiento y no tiene efecto contable independiente. Un fallo posterior deja hueco justificado; nunca se reutiliza. La reimpresión consulta la misma versión y no reserva otro número. Opera sin inmuebles.

**API propia propuesta:** GET /api/v1/accounting/journal-sequences; POST /api/v1/accounting/journal-sequences; POST /api/v1/accounting/journal-sequences/{id}/reserve; POST /api/v1/accounting/journal-sequences/{id}/justify-gap. **Pantallas relacionadas:** XLS-016; XLS-027; XLS-028. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un tipo con secuencia vigente, cuando se publica un asiento balanceado, entonces se asigna un número único y el comprobante lo conserva para consulta y reimpresión.

**Prueba negativa:** Dado un periodo cerrado o una reserva ya consumida, cuando se intenta publicar, entonces se devuelve conflicto de estado y no se crea un segundo asiento.

**Evidencias/pruebas exigidas:** `T-UI-XLS-024`, `T-PROC-XLS-024`, `T-NEG-XLS-024`.

### XLS-025 — Plan Contable

**Ubicación original:** Contabilidad > Financiero > Plan Contable > Plan Contable. **Celda:** E40. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/plan-contable/plan-contable`.

**Objetivo y vista:** Mantener un plan contable jerárquico con cuentas imputables, bloqueando movimientos en grupos o cuentas inactivas. Pantalla dedicada en Plan Contable > Plan Contable con árbol jerárquico, búsqueda por código/nombre, filtros de naturaleza y estado, detalle de cuenta y panel de uso.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); código (texto; requerido; Único por empresa; jerarquía consistente.); nombre (texto; requerido; Requerido.); padre (selector árbol; opcional/condicional; Misma empresa y sin ciclos.); naturaleza/tipo (enum configurable; requerido; Compatible con mapeos y plantilla.); imputable (booleano; requerido; Solo imputables aceptan líneas.); activo (booleano; requerido; Inactivación lógica.); vigencia (rango; requerido; Versionado sin alterar históricos.).

**Columnas visibles:** Código; Nombre; Padre; Naturaleza; Imputable; Uso en plantillas; Estado.

**Acciones y permisos:** Crear cuenta → Agrega cuenta al árbol sin movimiento. [permiso: chart_of_accounts.create]; Editar borrador → Actualiza atributos no históricos. [permiso: chart_of_accounts.update]; Inactivar → Bloquea nuevos postings y conserva referencias. [permiso: chart_of_accounts.deactivate]; Ver movimientos → Navega a líneas publicadas. [permiso: chart_of_accounts.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y versión de plan.
2. Capturar cuenta, padre, naturaleza y atributos.
3. Validar ciclo, código, imputabilidad y dependencias.
4. Aprobar la versión o cambio.
5. Publicar para selección en plantillas/asientos.
6. Consultar movimientos y reportes vinculados.

**Estados:** DRAFT: captura editable sin efecto contable; VALIDATED: validación de estructura, empresa, vigencia y permisos superada; APPROVED: aprobación segregada cuando corresponda; INACTIVE/CLOSED: no recibe nuevos datos; conserva consulta histórica; GROUP/POSTABLE: grupo no recibe movimiento; imputable sí; INACTIVE: no seleccionable en nuevos asientos. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Bloquear publicación de líneas en cuentas grupo, inactivas o de otra empresa; validar padre antes de commit..

**Persistencia e impacto contable:** Cambia el catálogo disponible para futuras líneas y mapeos; no reescribe líneas ni saldos. Una cuenta usada históricamente queda consultable. No obliga a enlazar inmueble y funciona en empresa sin extensión.

**API propia propuesta:** GET /api/v1/accounting/chart-of-accounts/tree; POST /api/v1/accounting/chart-of-accounts/accounts; PATCH /api/v1/accounting/chart-of-accounts/accounts/{id}; POST /api/v1/accounting/chart-of-accounts/accounts/{id}/deactivate. **Pantallas relacionadas:** XLS-026; XLS-027; XLS-031; XLS-032; XLS-035. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dada una cuenta imputable activa con padre válido, cuando se publica, entonces aparece en el selector de registro y acepta una línea balanceada.

**Prueba negativa:** Dada una cuenta grupo o inactiva, cuando se intenta usarla en un asiento, entonces la API rechaza la línea y el asiento queda sin publicar.

**Evidencias/pruebas exigidas:** `T-UI-XLS-025`, `T-PROC-XLS-025`, `T-NEG-XLS-025`.

### XLS-026 — Migrar Plan Contable

**Ubicación original:** Contabilidad > Financiero > Plan Contable > Migrar Plan Contable. **Celda:** E41. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/plan-contable/migrar-plan-contable`.

**Objetivo y vista:** Importar un plan contable mediante plantilla con validación de padres, ciclos, códigos y naturaleza, mostrando errores por fila y permitiendo corrección y reintento. Pantalla importadora dedicada con descarga de plantilla versionada, carga de archivo, resumen de filas, tabla de errores con número de fila/campo/valor/mensaje, vista previa de árbol y confirmación explícita.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); versión de plantilla (selector; requerido; Formato compatible y visible.); archivo (archivo; requerido; Extensión/tamaño/hash permitidos.); modo (enum validar/crear/actualizar explícito; requerido; Actualizar exige confirmación y reglas.); fila original (entero; requerido; Conservada para cada error.); mapeo de padre (texto/código; requerido; Padre existente o incluido sin ciclo.); confirmación (checkbox; requerido; Requerida para aplicar filas válidas.).

**Columnas visibles:** Fila; Código; Nombre; Padre; Naturaleza; Resultado; Error; ID creado/mapeado.

**Acciones y permisos:** Descargar plantilla → Entrega columnas y ejemplo no productivo. [permiso: chart_of_accounts.import_template]; Prevalidar → Crea lote con errores por fila; no escribe plan. [permiso: chart_of_accounts.import_validate]; Confirmar válidas → Crea/mapea solo filas aprobadas y guarda reconciliación. [permiso: chart_of_accounts.import_confirm]; Reintentar → Reprocesa correcciones sin duplicar lote. [permiso: chart_of_accounts.import_retry].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y descargar plantilla.
2. Cargar archivo y generar hash/lote.
3. Prevalidar códigos, padres, ciclos y naturaleza.
4. Corregir errores por fila o excluir filas inválidas.
5. Confirmar explícitamente filas válidas.
6. Consultar reconciliación y reintentar pendientes.

**Estados:** UPLOADED: archivo recibido; PREVALIDATED: errores y válidas separadas; CONFIRMED: filas válidas aplicadas; PARTIAL: quedan errores documentados; REJECTED: lote no aplicable. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Detectar archivo malicioso, duplicados internos, ciclo, padre ausente, código inválido y actualización no autorizada..

**Persistencia e impacto contable:** La prevalidación no genera asientos. La confirmación crea o mapea cuentas y puede cambiar el catálogo futuro; nunca edita movimientos históricos. El lote guarda mapa entre IDs originales y nuevos. No requiere inmueble.

**API propia propuesta:** GET /api/v1/accounting/chart-of-accounts/import-templates; POST /api/v1/accounting/chart-of-accounts/imports; GET /api/v1/imports/{id}; POST /api/v1/imports/{id}/confirm; POST /api/v1/imports/{id}/retry. **Pantallas relacionadas:** XLS-025. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un archivo con diez filas válidas y dos con padre inexistente, cuando se prevalida, entonces las dos filas muestran error y al confirmar solo se aplican las diez válidas, con mapa persistido.

**Prueba negativa:** Dado un lote confirmado reintentado con la misma clave, cuando se procesa, entonces devuelve el resultado original sin crear cuentas duplicadas.

**Evidencias/pruebas exigidas:** `T-UI-XLS-026`, `T-PROC-XLS-026`, `T-NEG-XLS-026`.

### XLS-027 — Registro Comp. Contable

**Ubicación original:** Contabilidad > Financiero > Comprobantes Contables > Registro Comp. Contable. **Celda:** E43. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/comprobantes-contables/registro-comp-contable`.

**Objetivo y vista:** Registrar y aprobar un comprobante contable balanceado, rechazando empresa ajena, periodo cerrado, cuenta inválida o dimensiones inconsistentes. Pantalla transaccional dedicada para Registro Comp.

**Campos y filtros:** empresa (selector; requerido; Empresa activa verificada.); fecha/periodo (fecha/selector; requerido; Periodo abierto y coincidente.); tipo contable (selector; requerido; Tipo activo y secuencia disponible.); descripción (texto; requerido; Motivo claro.); líneas (array objetos; requerido; Cuenta imputable, débito o crédito, centro si obligatorio.); soporte (archivo múltiple; opcional/condicional; Hash, tipo y permiso.); aprobador (usuario; opcional/condicional; Segregación según política.).

**Columnas visibles:** Número; Fecha; Descripción; Débitos; Créditos; Diferencia; Estado negocio; Estado contable; Estado fiscal.

**Acciones y permisos:** Guardar borrador → Conserva captura sin posting. [permiso: journal.create]; Validar → Comprueba balance, cuentas, periodo y permisos. [permiso: journal.validate]; Aprobar/publicar → Asigna número y crea asiento atómico. [permiso: journal.post]; Consultar asiento → Navega a líneas, soporte y auditoría. [permiso: journal.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, fecha y tipo.
2. Capturar líneas y soportes.
3. Validar balance, cuentas, periodo y centro.
4. Solicitar/aplicar aprobación segregada.
5. Reservar número y publicar de forma atómica.
6. Consultar asiento, saldos y eventos posteriores.

**Estados:** DRAFT; VALIDATED; APPROVED; POSTED: publicado e inmutable; REJECTED; REVERSED: solo por reverso. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Débitos/créditos exactos, cuenta imputable activa, periodo abierto, misma empresa, centro obligatorio cuando aplique y sin doble publicación..

**Persistencia e impacto contable:** Publicar crea un asiento con al menos dos líneas, débito igual a crédito y referencia de origen; afecta saldos y reportes al corte. Estados de negocio, contabilidad y tributación permanecen separados. Todos los campos inmobiliarios son opcionales/no aplicables en core.

**API propia propuesta:** GET /api/v1/accounting/journal-entries; POST /api/v1/accounting/journal-entries; POST /api/v1/accounting/journal-entries/{id}/validate; POST /api/v1/accounting/journal-entries/{id}/post. **Pantallas relacionadas:** XLS-016; XLS-019; XLS-024; XLS-025; XLS-029; XLS-030. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un borrador balanceado en periodo abierto con cuentas imputables, cuando el aprobador publica, entonces se crea un asiento numerado, POSTED, con débitos iguales a créditos y aparece en mayor.

**Prueba negativa:** Dado un asiento con diferencia, cuenta de otra empresa o periodo cerrado, cuando se intenta publicar, entonces retorna error determinista y no crea líneas publicadas ni saldo.

**Evidencias/pruebas exigidas:** `T-UI-XLS-027`, `T-PROC-XLS-027`, `T-NEG-XLS-027`.

### XLS-028 — Reimpresión Comp. Contable

**Ubicación original:** Contabilidad > Financiero > Comprobantes Contables > Reimpresión Comp. Contable. **Celda:** E44. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/comprobantes-contables/reimpresion-comp-contable`.

**Objetivo y vista:** Reimprimir un comprobante contabilizado conservando identificador, estado y la misma versión histórica, sin volver a contabilizar ni reservar numeración. Pantalla dedicada de consulta/reimpresión con filtros por empresa, número, tipo, fecha, estado y origen.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); número/identificador (texto; opcional/condicional; Búsqueda exacta o parcial.); tipo (selector; opcional/condicional; Filtra comprobantes.); fecha desde/hasta (fechas; opcional/condicional; Rango permitido.); estado contable (enum; opcional/condicional; Debe ser POSTED/REVERSED para reimpresión histórica.); formato (enum PDF/HTML; requerido; Render de snapshot guardado.); motivo (texto; requerido; Audita reimpresión.).

**Columnas visibles:** Número; Tipo; Fecha; Estado negocio; Estado contable; Estado fiscal; Versión/hash; Última impresión.

**Acciones y permisos:** Buscar → Lista comprobantes visibles por empresa. [permiso: journal.read]; Ver detalle → Muestra exactamente snapshot y trazabilidad. [permiso: journal.read]; Reimprimir → Genera copia del mismo comprobante; no crea asiento. [permiso: journal.reprint]; Descargar historial → Entrega artefacto autorizado y auditado. [permiso: journal.export].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y filtros.
2. Abrir comprobante contabilizado.
3. Verificar snapshot, hash y estados.
4. Solicitar permiso de reimpresión y motivo.
5. Generar representación sin mutar contabilidad.
6. Registrar intento y navegar al asiento original.

**Estados:** AVAILABLE: localizado; REPRINTED: copia generada; POSTED/REVERSED: estados contables conservados; NOT_FOUND/NO_ACCESS: sin revelar otra empresa. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; No permitir editar campos del snapshot; denegar acceso cruzado entre empresas y auditar cada descarga..

**Persistencia e impacto contable:** No modifica saldos, estados ni número. La salida usa la misma versión histórica y enlaza al asiento original; reimprimir nunca contabiliza otra vez, no reserva secuencia y no genera evento fiscal nuevo.

**API propia propuesta:** GET /api/v1/accounting/journal-entries; GET /api/v1/accounting/journal-entries/{id}/snapshot; POST /api/v1/accounting/journal-entries/{id}/reprints. **Pantallas relacionadas:** XLS-027; XLS-024. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un comprobante POSTED visible, cuando el usuario con permiso solicita reimpresión, entonces obtiene la misma versión/hash, queda una auditoría y el saldo permanece idéntico.

**Prueba negativa:** Dado un comprobante de otra empresa o inexistente, cuando se busca, entonces no se revela información y no se genera artefacto.

**Evidencias/pruebas exigidas:** `T-UI-XLS-028`, `T-PROC-XLS-028`, `T-NEG-XLS-028`.

### XLS-029 — Modificación Comp. Contable

**Ubicación original:** Contabilidad > Financiero > Comprobantes Contables > Modificación Comp. Contable. **Celda:** E45. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/comprobantes-contables/modificacion-comp-contable`.

**Objetivo y vista:** Editar solo comprobantes en borrador y corregir comprobantes contabilizados mediante reverso y reemplazo vinculados, nunca sobrescribiendo el original. Pantalla transaccional independiente de modificación con selector de comprobante, comparación lado a lado antes/después, motivo obligatorio, soportes y vista previa de impacto.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); comprobante origen (búsqueda; requerido; Mismo contexto y estado permitido.); cambios (array de líneas/cabecera; requerido; Editable solo en DRAFT; reemplazo para POSTED.); motivo (texto largo; requerido; Explica corrección.); soportes (archivos; opcional/condicional; Evidencia hashada.); periodo destino (selector; requerido; Abierto y permitido.); aprobador (usuario; requerido; Segregación para reverso/reemplazo.).

**Columnas visibles:** Origen; Estado origen; Tipo de cambio; Diferencia; Reversa vinculada; Reemplazo; Estado del flujo.

**Acciones y permisos:** Editar borrador → Actualiza captura sin publicar. [permiso: journal.draft_update]; Previsualizar reverso → Calcula efecto sin contabilizar aún. [permiso: journal.reverse_preview]; Aprobar reverso/reemplazo → Publica operaciones vinculadas. [permiso: journal.correct]; Ver cadena → Navega original, reversa y sustituto. [permiso: journal.read].

**Proceso que debe ejecutar:**

1. Seleccionar comprobante y validar estado.
2. Capturar cambio o propuesta de reemplazo.
3. Previsualizar diferencias y balance.
4. Obtener aprobación y verificar periodo abierto.
5. Publicar reverso y reemplazo atómicos.
6. Consultar cadena y reportes actualizados.

**Estados:** DRAFT: editable; CHANGE_REQUESTED: propuesta; REVERSED: original conserva historia; REPLACEMENT_POSTED: nuevo asiento vinculado; REJECTED. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Bloquear modificación directa de POSTED, exigir motivo/aprobación, periodo abierto, balance e idempotencia de la corrección..

**Persistencia e impacto contable:** En borrador no hay efecto. En POSTED, la reversa invierte el efecto y el reemplazo crea un asiento nuevo; el original permanece inmutable y ambos quedan trazables. No se exige inmueble ni se permite editar un publicado.

**API propia propuesta:** GET /api/v1/accounting/journal-entries/{id}; POST /api/v1/accounting/journal-entries/{id}/change-requests; POST /api/v1/accounting/journal-corrections/{id}/preview; POST /api/v1/accounting/journal-corrections/{id}/approve. **Pantallas relacionadas:** XLS-027; XLS-030; XLS-038. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un POSTED con error y un periodo abierto, cuando se aprueba la corrección, entonces se publica reversa y reemplazo vinculados; el original sigue visible y el saldo neto refleja la corrección.

**Prueba negativa:** Dado un POSTED editado directamente o una reversa en periodo cerrado, cuando se envía, entonces retorna INVALID_STATE_TRANSITION o PERIOD_CLOSED y no altera el original.

**Evidencias/pruebas exigidas:** `T-UI-XLS-029`, `T-PROC-XLS-029`, `T-NEG-XLS-029`.

### XLS-030 — Anulación Comp. Contable

**Ubicación original:** Contabilidad > Financiero > Comprobantes Contables > Anulación Comp. Contable. **Celda:** E46. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/comprobantes-contables/anulacion-comp-contable`.

**Objetivo y vista:** Anular borradores o reversar comprobantes contabilizados en periodo abierto, con motivo y aprobación, manteniendo siempre el documento original. Pantalla dedicada de anulación con búsqueda por número/origen, explicación de diferencia entre cancelar borrador y reversar publicado, vista previa de asiento reverso y confirmación reforzada.

**Campos y filtros:** empresa (selector; requerido; Contexto verificado.); comprobante (búsqueda; requerido; Debe pertenecer a empresa.); motivo (texto largo; requerido; No vacío y auditable.); fecha efectiva (fecha; requerido; Periodo abierto y permitido.); evidencia (archivos; opcional/condicional; Soporte requerido por política.); aprobador (usuario; requerido; Segregación y MFA si aplica.); confirmación impacto (checkbox; requerido; Reconoce reverso contable separado de fiscal.).

**Columnas visibles:** Número; Fecha; Estado negocio; Estado contable; Estado fiscal; Motivo; Reversa relacionada; Aprobación.

**Acciones y permisos:** Anular borrador → Marca cancelado sin posting. [permiso: journal.cancel_draft]; Previsualizar reversa → Muestra líneas inversas y efecto. [permiso: journal.reverse_preview]; Aprobar reversa → Publica reverso y mantiene original. [permiso: journal.reverse_approve]; Consultar historial → Navega a origen y eventos. [permiso: journal.read].

**Proceso que debe ejecutar:**

1. Localizar comprobante y verificar estados.
2. Capturar motivo, fecha y evidencia.
3. Validar periodo abierto y dependencias.
4. Obtener aprobación segregada.
5. Cancelar borrador o publicar reverso atómico.
6. Consultar original, reversa y reportes.

**Estados:** DRAFT; CANCELLED: borrador anulado; VOID_REQUESTED: pendiente de aprobación; REVERSED: efecto contable invertido; POSTED: original inmutable. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Rechazar periodo cerrado, doble reversa, falta de motivo/aprobación o dependencia que exige corrección de origen..

**Persistencia e impacto contable:** Un borrador cancelado no afecta libros. Un publicado se revierte en asiento separado; no se elimina ni se edita. La condición fiscal queda independiente y puede permanecer pendiente, rechazada o autorizada según otro proceso; esta pantalla no inventa canal fiscal.

**API propia propuesta:** GET /api/v1/accounting/journal-entries/{id}; POST /api/v1/accounting/journal-entries/{id}/void-preview; POST /api/v1/accounting/journal-entries/{id}/void; GET /api/v1/accounting/journal-entries/{id}/audit. **Pantallas relacionadas:** XLS-027; XLS-029; XLS-038. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un asiento POSTED en periodo abierto, cuando el aprobador confirma el reverso, entonces se publica asiento inverso enlazado, el original queda visible y el saldo se compensa al corte.

**Prueba negativa:** Dado un asiento ya REVERSED o periodo cerrado, cuando se solicita anulación, entonces se rechaza sin crear otro reverso ni borrar el histórico.

**Evidencias/pruebas exigidas:** `T-UI-XLS-030`, `T-PROC-XLS-030`, `T-NEG-XLS-030`.

### XLS-031 — Libro Mayor

**Ubicación original:** Contabilidad > Financiero > Libros Contables > Libro Mayor. **Celda:** E48. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/libros-contables/libro-mayor`.

**Objetivo y vista:** Generar el Libro Mayor al corte con saldo inicial, débitos, créditos y saldo final, trazable hasta cada asiento publicado. Pantalla de reporte dedicada Libro Mayor bajo la ruta original.

**Campos y filtros:** cuenta (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); centro de costo (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); tercero (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); periodo desde/hasta (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); as_of (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); solo publicados (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.).

**Columnas visibles:** Cuenta; Nombre; Saldo inicial; Débitos; Créditos; Saldo final; Último asiento.

**Acciones y permisos:** Consultar → Calcula snapshot reproducible solo con movimientos publicados y reversos efectivos. [permiso: report.read]; Exportar → Genera archivo asíncrono con idénticos filtros y permisos. [permiso: report.export]; Ver origen → Navega a asiento/documento sin cambiar el reporte. [permiso: report.drilldown]; Guardar vista → Conserva filtros personales sin ampliar alcance de empresa. [permiso: report.save_view].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y fecha de corte o intervalo.
2. Aplicar filtros permitidos y versión de mapeo.
3. Validar que no haya periodo ambiguo ni datos de otra empresa.
4. Calcular snapshot con débitos, créditos, saldos y totales.
5. Revisar diferencias/no clasificados y aprobar exportación si aplica.
6. Consultar origen de una fila o descargar el mismo resultado.

**Estados:** READY: filtros válidos; CALCULATING: consulta en proceso; AVAILABLE: resultado visible; EXPORTED: artefacto generado; ERROR: filtros o fuente inválidos. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Rechazar ausencia de corte, SQL/expresiones arbitrarias, exportación con otros filtros y acceso entre empresas.; Mostrar cuentas no clasificadas como preparación pendiente, no ocultarlas.; Verificar que totales de pantalla y exportación usen el mismo snapshot..

**Persistencia e impacto contable:** Es solo lectura: no contabiliza, no corrige saldos y no altera estados. Usa movimientos publicados, reversos efectivos y reglas de corte; las cifras deben reconciliar con el mayor. Los centros de costo son opcionales según la vista y los datos inmobiliarios nunca son obligatorios.

**API propia propuesta:** GET /api/v1/reports/libro-mayor; POST /api/v1/report-exports; GET /api/v1/accounting/journal-entries/{id}; GET /api/v1/reports/{report_code}/drilldowns. **Pantallas relacionadas:** XLS-025; XLS-027; XLS-038. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo y empresa con asientos publicados, cuando se ejecuta Libro Mayor, entonces los totales se calculan, coinciden con mayor al corte y cada fila navegable abre su asiento origen.

**Prueba negativa:** Dado un filtro sin fecha/corte, una cuenta no autorizada o datos de otra empresa, cuando se consulta/exporta Libro Mayor, entonces la API rechaza la solicitud y no expone resultados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-031`, `T-PROC-XLS-031`, `T-NEG-XLS-031`.

### XLS-032 — Balance General Vertical

**Ubicación original:** Contabilidad > Financiero > Libros Contables > Balance General > Balance General Vertical. **Celda:** F50. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/libros-contables/balance-general/balance-general-vertical`.

**Objetivo y vista:** Presentar el estado de situación financiera vertical con cuentas mapeadas y comprobación de igualdad patrimonial. Pantalla de reporte dedicada Balance General Vertical bajo la ruta original.

**Campos y filtros:** empresa (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); as_of (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); marco/versión de mapeo (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); nivel de detalle (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); incluir no clasificadas (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.).

**Columnas visibles:** Código; Cuenta; Clasificación; Saldo; Comparativo; Estado de mapeo.

**Acciones y permisos:** Consultar → Calcula snapshot reproducible solo con movimientos publicados y reversos efectivos. [permiso: report.read]; Exportar → Genera archivo asíncrono con idénticos filtros y permisos. [permiso: report.export]; Ver origen → Navega a asiento/documento sin cambiar el reporte. [permiso: report.drilldown]; Guardar vista → Conserva filtros personales sin ampliar alcance de empresa. [permiso: report.save_view].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y fecha de corte o intervalo.
2. Aplicar filtros permitidos y versión de mapeo.
3. Validar que no haya periodo ambiguo ni datos de otra empresa.
4. Calcular snapshot con débitos, créditos, saldos y totales.
5. Revisar diferencias/no clasificados y aprobar exportación si aplica.
6. Consultar origen de una fila o descargar el mismo resultado.

**Estados:** READY: filtros válidos; CALCULATING: consulta en proceso; AVAILABLE: resultado visible; EXPORTED: artefacto generado; ERROR: filtros o fuente inválidos. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Rechazar ausencia de corte, SQL/expresiones arbitrarias, exportación con otros filtros y acceso entre empresas.; Mostrar cuentas no clasificadas como preparación pendiente, no ocultarlas.; Verificar que totales de pantalla y exportación usen el mismo snapshot..

**Persistencia e impacto contable:** Es solo lectura: no contabiliza, no corrige saldos y no altera estados. Usa movimientos publicados, reversos efectivos y reglas de corte; las cifras deben reconciliar con el mayor. Los centros de costo son opcionales según la vista y los datos inmobiliarios nunca son obligatorios.

**API propia propuesta:** GET /api/v1/reports/balance-general-vertical; POST /api/v1/report-exports; GET /api/v1/accounting/journal-entries/{id}; GET /api/v1/reports/{report_code}/drilldowns. **Pantallas relacionadas:** XLS-025; XLS-038. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo y empresa con asientos publicados, cuando se ejecuta Balance General Vertical, entonces los totales se calculan, coinciden con mayor al corte y cada fila navegable abre su asiento origen.

**Prueba negativa:** Dado un filtro sin fecha/corte, una cuenta no autorizada o datos de otra empresa, cuando se consulta/exporta Balance General Vertical, entonces la API rechaza la solicitud y no expone resultados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-032`, `T-PROC-XLS-032`, `T-NEG-XLS-032`.

### XLS-033 — Análisis de Saldos

**Ubicación original:** Contabilidad > Financiero > Libros Contables > Balance General > Análisis de Saldos. **Celda:** F51. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/libros-contables/balance-general/analisis-de-saldos`.

**Objetivo y vista:** Analizar saldos por cuenta, tercero y centro con desglose hasta documento, excluyendo borradores y manteniendo navegación al origen. Pantalla de reporte dedicada Análisis de Saldos bajo la ruta original.

**Campos y filtros:** empresa (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); as_of (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); cuenta (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); tercero (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); centro de costo (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); estado (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); origen (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.).

**Columnas visibles:** Cuenta; Tercero; Centro; Saldo inicial; Movimientos; Saldo final; Documento origen.

**Acciones y permisos:** Consultar → Calcula snapshot reproducible solo con movimientos publicados y reversos efectivos. [permiso: report.read]; Exportar → Genera archivo asíncrono con idénticos filtros y permisos. [permiso: report.export]; Ver origen → Navega a asiento/documento sin cambiar el reporte. [permiso: report.drilldown]; Guardar vista → Conserva filtros personales sin ampliar alcance de empresa. [permiso: report.save_view].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y fecha de corte o intervalo.
2. Aplicar filtros permitidos y versión de mapeo.
3. Validar que no haya periodo ambiguo ni datos de otra empresa.
4. Calcular snapshot con débitos, créditos, saldos y totales.
5. Revisar diferencias/no clasificados y aprobar exportación si aplica.
6. Consultar origen de una fila o descargar el mismo resultado.

**Estados:** READY: filtros válidos; CALCULATING: consulta en proceso; AVAILABLE: resultado visible; EXPORTED: artefacto generado; ERROR: filtros o fuente inválidos. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Rechazar ausencia de corte, SQL/expresiones arbitrarias, exportación con otros filtros y acceso entre empresas.; Mostrar cuentas no clasificadas como preparación pendiente, no ocultarlas.; Verificar que totales de pantalla y exportación usen el mismo snapshot..

**Persistencia e impacto contable:** Es solo lectura: no contabiliza, no corrige saldos y no altera estados. Usa movimientos publicados, reversos efectivos y reglas de corte; las cifras deben reconciliar con el mayor. Los centros de costo son opcionales según la vista y los datos inmobiliarios nunca son obligatorios.

**API propia propuesta:** GET /api/v1/reports/análisis-de-saldos; POST /api/v1/report-exports; GET /api/v1/accounting/journal-entries/{id}; GET /api/v1/reports/{report_code}/drilldowns. **Pantallas relacionadas:** XLS-025; XLS-027; XLS-031. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo y empresa con asientos publicados, cuando se ejecuta Análisis de Saldos, entonces los totales se calculan, coinciden con mayor al corte y cada fila navegable abre su asiento origen.

**Prueba negativa:** Dado un filtro sin fecha/corte, una cuenta no autorizada o datos de otra empresa, cuando se consulta/exporta Análisis de Saldos, entonces la API rechaza la solicitud y no expone resultados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-033`, `T-PROC-XLS-033`, `T-NEG-XLS-033`.

### XLS-034 — Balance Horizontal Acumulado

**Ubicación original:** Contabilidad > Financiero > Libros Contables > Balance General > Balance Horizontal Acumulado. **Celda:** F52. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/libros-contables/balance-general/balance-horizontal-acumulado`.

**Objetivo y vista:** Comparar balance acumulado entre cortes o periodos, especificando agregación y variaciones. Pantalla de reporte dedicada Balance Horizontal Acumulado bajo la ruta original.

**Campos y filtros:** empresa (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); periodos/cortes (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); cuentas (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); nivel (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); criterio de acumulación (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.).

**Columnas visibles:** Cuenta; Clasificación; Corte A; Corte B; Variación absoluta; Variación %.

**Acciones y permisos:** Consultar → Calcula snapshot reproducible solo con movimientos publicados y reversos efectivos. [permiso: report.read]; Exportar → Genera archivo asíncrono con idénticos filtros y permisos. [permiso: report.export]; Ver origen → Navega a asiento/documento sin cambiar el reporte. [permiso: report.drilldown]; Guardar vista → Conserva filtros personales sin ampliar alcance de empresa. [permiso: report.save_view].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y fecha de corte o intervalo.
2. Aplicar filtros permitidos y versión de mapeo.
3. Validar que no haya periodo ambiguo ni datos de otra empresa.
4. Calcular snapshot con débitos, créditos, saldos y totales.
5. Revisar diferencias/no clasificados y aprobar exportación si aplica.
6. Consultar origen de una fila o descargar el mismo resultado.

**Estados:** READY: filtros válidos; CALCULATING: consulta en proceso; AVAILABLE: resultado visible; EXPORTED: artefacto generado; ERROR: filtros o fuente inválidos. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Rechazar ausencia de corte, SQL/expresiones arbitrarias, exportación con otros filtros y acceso entre empresas.; Mostrar cuentas no clasificadas como preparación pendiente, no ocultarlas.; Verificar que totales de pantalla y exportación usen el mismo snapshot..

**Persistencia e impacto contable:** Es solo lectura: no contabiliza, no corrige saldos y no altera estados. Usa movimientos publicados, reversos efectivos y reglas de corte; las cifras deben reconciliar con el mayor. Los centros de costo son opcionales según la vista y los datos inmobiliarios nunca son obligatorios.

**API propia propuesta:** GET /api/v1/reports/balance-horizontal-acumulado; POST /api/v1/report-exports; GET /api/v1/accounting/journal-entries/{id}; GET /api/v1/reports/{report_code}/drilldowns. **Pantallas relacionadas:** XLS-031; XLS-032; XLS-038. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo y empresa con asientos publicados, cuando se ejecuta Balance Horizontal Acumulado, entonces los totales se calculan, coinciden con mayor al corte y cada fila navegable abre su asiento origen.

**Prueba negativa:** Dado un filtro sin fecha/corte, una cuenta no autorizada o datos de otra empresa, cuando se consulta/exporta Balance Horizontal Acumulado, entonces la API rechaza la solicitud y no expone resultados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-034`, `T-PROC-XLS-034`, `T-NEG-XLS-034`.

### XLS-035 — Estado de Resultados

**Ubicación original:** Contabilidad > Financiero > Libros Contables > Estado de Resultados. **Celda:** E53. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/libros-contables/estado-de-resultados`.

**Objetivo y vista:** Generar estado de resultados por periodo y acumulado mediante mapeo aprobado de ingresos y gastos. Pantalla de reporte dedicada Estado de Resultados bajo la ruta original.

**Campos y filtros:** empresa (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); desde/hasta (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); as_of (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); versión de mapeo (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); comparativo (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); incluir no clasificados (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.).

**Columnas visibles:** Cuenta/agrupación; Ingresos; Gastos; Resultado del periodo; Acumulado; Estado de mapeo.

**Acciones y permisos:** Consultar → Calcula snapshot reproducible solo con movimientos publicados y reversos efectivos. [permiso: report.read]; Exportar → Genera archivo asíncrono con idénticos filtros y permisos. [permiso: report.export]; Ver origen → Navega a asiento/documento sin cambiar el reporte. [permiso: report.drilldown]; Guardar vista → Conserva filtros personales sin ampliar alcance de empresa. [permiso: report.save_view].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y fecha de corte o intervalo.
2. Aplicar filtros permitidos y versión de mapeo.
3. Validar que no haya periodo ambiguo ni datos de otra empresa.
4. Calcular snapshot con débitos, créditos, saldos y totales.
5. Revisar diferencias/no clasificados y aprobar exportación si aplica.
6. Consultar origen de una fila o descargar el mismo resultado.

**Estados:** READY: filtros válidos; CALCULATING: consulta en proceso; AVAILABLE: resultado visible; EXPORTED: artefacto generado; ERROR: filtros o fuente inválidos. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Rechazar ausencia de corte, SQL/expresiones arbitrarias, exportación con otros filtros y acceso entre empresas.; Mostrar cuentas no clasificadas como preparación pendiente, no ocultarlas.; Verificar que totales de pantalla y exportación usen el mismo snapshot..

**Persistencia e impacto contable:** Es solo lectura: no contabiliza, no corrige saldos y no altera estados. Usa movimientos publicados, reversos efectivos y reglas de corte; las cifras deben reconciliar con el mayor. Los centros de costo son opcionales según la vista y los datos inmobiliarios nunca son obligatorios.

**API propia propuesta:** GET /api/v1/reports/estado-de-resultados; POST /api/v1/report-exports; GET /api/v1/accounting/journal-entries/{id}; GET /api/v1/reports/{report_code}/drilldowns. **Pantallas relacionadas:** XLS-025; XLS-027; XLS-038. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo y empresa con asientos publicados, cuando se ejecuta Estado de Resultados, entonces los totales se calculan, coinciden con mayor al corte y cada fila navegable abre su asiento origen.

**Prueba negativa:** Dado un filtro sin fecha/corte, una cuenta no autorizada o datos de otra empresa, cuando se consulta/exporta Estado de Resultados, entonces la API rechaza la solicitud y no expone resultados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-035`, `T-PROC-XLS-035`, `T-NEG-XLS-035`.

### XLS-036 — Saldos Mensuales

**Ubicación original:** Contabilidad > Financiero > Libros Contables > Gastos x C.C. > Saldos Mensuales. **Celda:** F57. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/libros-contables/gastos-x-c-c/saldos-mensuales`.

**Objetivo y vista:** Mostrar gastos mensuales por centro de costo, conciliables con el mayor y usando filtros compatibles. Pantalla de reporte dedicada Saldos Mensuales bajo la ruta original.

**Campos y filtros:** empresa (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); ejercicio (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); meses (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); centro de costo (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); cuentas (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); as_of (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.).

**Columnas visibles:** Mes; Centro; Cuenta; Débitos; Créditos; Neto; Saldo acumulado.

**Acciones y permisos:** Consultar → Calcula snapshot reproducible solo con movimientos publicados y reversos efectivos. [permiso: report.read]; Exportar → Genera archivo asíncrono con idénticos filtros y permisos. [permiso: report.export]; Ver origen → Navega a asiento/documento sin cambiar el reporte. [permiso: report.drilldown]; Guardar vista → Conserva filtros personales sin ampliar alcance de empresa. [permiso: report.save_view].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y fecha de corte o intervalo.
2. Aplicar filtros permitidos y versión de mapeo.
3. Validar que no haya periodo ambiguo ni datos de otra empresa.
4. Calcular snapshot con débitos, créditos, saldos y totales.
5. Revisar diferencias/no clasificados y aprobar exportación si aplica.
6. Consultar origen de una fila o descargar el mismo resultado.

**Estados:** READY: filtros válidos; CALCULATING: consulta en proceso; AVAILABLE: resultado visible; EXPORTED: artefacto generado; ERROR: filtros o fuente inválidos. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Rechazar ausencia de corte, SQL/expresiones arbitrarias, exportación con otros filtros y acceso entre empresas.; Mostrar cuentas no clasificadas como preparación pendiente, no ocultarlas.; Verificar que totales de pantalla y exportación usen el mismo snapshot..

**Persistencia e impacto contable:** Es solo lectura: no contabiliza, no corrige saldos y no altera estados. Usa movimientos publicados, reversos efectivos y reglas de corte; las cifras deben reconciliar con el mayor. Los centros de costo son opcionales según la vista y los datos inmobiliarios nunca son obligatorios.

**API propia propuesta:** GET /api/v1/reports/saldos-mensuales; POST /api/v1/report-exports; GET /api/v1/accounting/journal-entries/{id}; GET /api/v1/reports/{report_code}/drilldowns. **Pantallas relacionadas:** XLS-019; XLS-031; XLS-038. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo y empresa con asientos publicados, cuando se ejecuta Saldos Mensuales, entonces los totales se calculan, coinciden con mayor al corte y cada fila navegable abre su asiento origen.

**Prueba negativa:** Dado un filtro sin fecha/corte, una cuenta no autorizada o datos de otra empresa, cuando se consulta/exporta Saldos Mensuales, entonces la API rechaza la solicitud y no expone resultados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-036`, `T-PROC-XLS-036`, `T-NEG-XLS-036`.

### XLS-037 — Acumulados

**Ubicación original:** Contabilidad > Financiero > Libros Contables > Gastos x C.C. > Acumulados. **Celda:** F58. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/libros-contables/gastos-x-c-c/acumulados`.

**Objetivo y vista:** Mostrar gastos acumulados por centro de costo distinguiendo mes de corte y ejercicio. Pantalla de reporte dedicada Acumulados bajo la ruta original.

**Campos y filtros:** empresa (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); ejercicio (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); mes de corte (selector/fecha/enum según filtro; requerido; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); centro de costo (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); cuentas (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.); comparativo (selector/fecha/enum según filtro; opcional/condicional; Valor permitido, empresa autorizada y corte explícito; no incluir borradores.).

**Columnas visibles:** Ejercicio; Mes corte; Centro; Cuenta; Acumulado; Comparativo; Variación.

**Acciones y permisos:** Consultar → Calcula snapshot reproducible solo con movimientos publicados y reversos efectivos. [permiso: report.read]; Exportar → Genera archivo asíncrono con idénticos filtros y permisos. [permiso: report.export]; Ver origen → Navega a asiento/documento sin cambiar el reporte. [permiso: report.drilldown]; Guardar vista → Conserva filtros personales sin ampliar alcance de empresa. [permiso: report.save_view].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y fecha de corte o intervalo.
2. Aplicar filtros permitidos y versión de mapeo.
3. Validar que no haya periodo ambiguo ni datos de otra empresa.
4. Calcular snapshot con débitos, créditos, saldos y totales.
5. Revisar diferencias/no clasificados y aprobar exportación si aplica.
6. Consultar origen de una fila o descargar el mismo resultado.

**Estados:** READY: filtros válidos; CALCULATING: consulta en proceso; AVAILABLE: resultado visible; EXPORTED: artefacto generado; ERROR: filtros o fuente inválidos. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Rechazar ausencia de corte, SQL/expresiones arbitrarias, exportación con otros filtros y acceso entre empresas.; Mostrar cuentas no clasificadas como preparación pendiente, no ocultarlas.; Verificar que totales de pantalla y exportación usen el mismo snapshot..

**Persistencia e impacto contable:** Es solo lectura: no contabiliza, no corrige saldos y no altera estados. Usa movimientos publicados, reversos efectivos y reglas de corte; las cifras deben reconciliar con el mayor. Los centros de costo son opcionales según la vista y los datos inmobiliarios nunca son obligatorios.

**API propia propuesta:** GET /api/v1/reports/acumulados; POST /api/v1/report-exports; GET /api/v1/accounting/journal-entries/{id}; GET /api/v1/reports/{report_code}/drilldowns. **Pantallas relacionadas:** XLS-019; XLS-031; XLS-036. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo y empresa con asientos publicados, cuando se ejecuta Acumulados, entonces los totales se calculan, coinciden con mayor al corte y cada fila navegable abre su asiento origen.

**Prueba negativa:** Dado un filtro sin fecha/corte, una cuenta no autorizada o datos de otra empresa, cuando se consulta/exporta Acumulados, entonces la API rechaza la solicitud y no expone resultados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-037`, `T-PROC-XLS-037`, `T-NEG-XLS-037`.

### XLS-038 — Registro de Cierres

**Ubicación original:** Contabilidad > Financiero > Libros Contables > Cierres > Registro de Cierres. **Celda:** F60. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/financiero/libros-contables/cierres/registro-de-cierres`.

**Objetivo y vista:** Ejecutar conciliaciones de cierre, bloquear el periodo y generar cierre anual con aprobación y reapertura auditada. Pantalla transaccional dedicada en Cierres con asistente por fases: checklist de saldos, impuestos configurados, reportes, pendientes y diferencias; panel de bloqueos, aprobaciones y botón de cierre/reapertura.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); periodo/año (selector; requerido; Periodo abierto o cerrado según acción.); checklist (array de controles; requerido; Cada control tiene resultado, evidencia y responsable.); diferencias (tabla Decimal; requerido; Debe estar explicada o aprobada.); aprobador (usuario; requerido; Segregación; reapertura exige segundo aprobador.); motivo reapertura (texto largo; opcional/condicional; Obligatorio solo para reabrir.); alcance reapertura (selector limitado; opcional/condicional; Periodo y duración restringidos.).

**Columnas visibles:** Periodo; Fase; Control; Resultado; Diferencia; Aprobador; Estado cierre; Último evento.

**Acciones y permisos:** Ejecutar checklist → Calcula controles y pendientes sin cerrar. [permiso: close.validate]; Aprobar cierre → Bloquea posting y consolida cierre aprobado. [permiso: close.approve]; Generar cierre anual → Produce operaciones definidas por política y trazabilidad. [permiso: close.annual_post]; Reabrir auditado → Reabre periodo limitado con doble aprobación. [permiso: close.reopen].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y periodo.
2. Ejecutar conciliaciones y capturar evidencias.
3. Resolver o aprobar diferencias.
4. Solicitar aprobación segregada.
5. Bloquear periodo y crear cierre/anualización si aplica.
6. Consultar reportes y auditar reapertura si fuese necesaria.

**Estados:** OPEN: recibe postings; CHECKING: checklist en proceso; READY_TO_CLOSE: sin bloqueos pendientes; CLOSED: nuevos postings bloqueados; REOPEN_REQUESTED; REOPENED: alcance limitado y auditado. **Validaciones:** Contexto tenant/empresa y permiso por acción; la empresa activa se verifica en backend.; Idempotencia mediante Idempotency-Key y detección de conflicto de versión.; Auditoría de actor, fecha UTC, motivo, antes/después y correlación.; Importes Decimal/numeric; nunca se calcula el saldo canónico únicamente en React.; No exigir condominium_id, property_unit_id, propietario ni alícuota en el núcleo; si Expensas está deshabilitado, las escrituras verticales devuelven MODULE_DISABLED.; Bloquear con lock de periodo; exigir checklist completo, diferencias explicadas, aprobación y reintento seguro; impedir reapertura amplia o autoaprobada..

**Persistencia e impacto contable:** El cierre bloquea nuevos postings al periodo; el cierre anual genera cancelaciones/resultados solo según política aprobada. No elimina ni edita asientos. Reapertura no altera históricos y exige motivo, alcance y aprobación dual. Opera sin inmuebles; cualquier deuda vertical histórica se consulta aparte.

**API propia propuesta:** GET /api/v1/accounting/period-closes; POST /api/v1/accounting/period-closes/{id}/checklist; POST /api/v1/accounting/period-closes/{id}/approve; POST /api/v1/accounting/period-closes/{id}/reopen; GET /api/v1/accounting/period-closes/{id}/audit. **Pantallas relacionadas:** XLS-027; XLS-031; XLS-032; XLS-035; XLS-036; XLS-037. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo con checklist completo y diferencias conciliadas, cuando el aprobador cierra, entonces nuevos postings son rechazados, reportes reproducen el corte y la auditoría registra aprobación.

**Prueba negativa:** Dado un posting concurrente que llega después del lock o una reapertura sin segundo aprobador, cuando se procesa, entonces se rechaza de forma determinista y no queda asiento parcial.

**Evidencias/pruebas exigidas:** `T-UI-XLS-038`, `T-PROC-XLS-038`, `T-NEG-XLS-038`.

### Procesos integrales del grupo

**Configuración contable, fiscal y numeración**. Secuencia: XLS-016; XLS-017; XLS-020; XLS-021; XLS-023; XLS-024. Seleccionar empresa → definir tipo contable y catálogos versionados → registrar establecimiento/punto → configurar secuencia terminal y comprobante → validar vigencias y segregación → aprobar → consultar la configuración aplicada a una operación futura. Expensas queda en flujo separado y opcional. Resultado: No contabiliza durante la configuración; deja catálogos y reservas versionadas para futuras operaciones, sin tasas hardcodeadas ni modificación de históricos. Prueba: Dado una empresa sin inmuebles, cuando se aprueban tipo, establecimiento, catálogos y secuencias sin solapes, entonces un futuro comprobante puede resolver configuración y reservar número; una tasa antigua sigue congelada en documentos previos.

**Estructura de centros y plan contable**. Secuencia: XLS-018; XLS-019; XLS-025; XLS-026. Crear tipo de centro → crear jerarquía de centros → mantener plan y cuentas imputables → descargar plantilla → cargar y prevalidar filas → corregir errores por fila → confirmar válidas → consultar mapa y dependencias. Resultado: La configuración habilita dimensiones y cuentas futuras; la importación no publica asientos y conserva el mapa de IDs, errores y reintentos sin duplicar. Prueba: Dado un plan con padres válidos y dos filas erróneas, cuando se confirma el lote, entonces solo las filas válidas quedan activas, una cuenta grupo no puede recibir posting y los asientos históricos no cambian.

**Ciclo de comprobante contable y corrección**. Secuencia: XLS-027; XLS-028; XLS-029; XLS-030. Crear borrador → capturar líneas/soportes → validar balance, empresa, periodo y cuenta → aprobar → reservar número y publicar → reimprimir snapshot → si hay error, editar borrador o solicitar reverso/reemplazo → anular borrador o reversar publicado → consultar cadena completa. Resultado: El posting crea asiento balanceado e inmutable; reimpresión no crea efecto; modificación/anulación de publicado agrega reversos y vínculos, sin borrar ni sobrescribir el original. Estados negocio, contable y fiscal permanecen separados. Prueba: Dado un borrador balanceado, cuando se publica y luego se reimprime, entonces el saldo queda una sola vez; si se corrige, la reversa y el reemplazo compensan/ajustan con aprobación, mientras el original conserva su número y auditoría.

**Reportes contables trazables**. Secuencia: XLS-031; XLS-032; XLS-033; XLS-034; XLS-035; XLS-036; XLS-037. Seleccionar empresa y corte → aplicar filtros concretos → consultar snapshot de publicados y reversos → revisar totales y no clasificados → abrir asiento/documento de origen → exportar con los mismos filtros → conciliar contra mayor. Resultado: Solo lectura; no crea movimientos. Los reportes deben coincidir en pantalla/exportación y mostrar diferencias o cuentas no clasificadas sin ocultarlas. Prueba: Dado un asiento publicado y su reverso efectivo antes del corte, cuando se ejecutan mayor, balances, resultados y gastos por centro, entonces todos excluyen borradores, muestran el efecto neto y permiten navegar al origen.

**Cierre mensual y anual**. Secuencia: XLS-038; XLS-027; XLS-031; XLS-032; XLS-035; XLS-036; XLS-037. Seleccionar periodo → ejecutar checklist y conciliaciones → resolver diferencias → revisar reportes → aprobar cierre → bloquear postings → generar cierre anual según política → consultar resultados → solicitar reapertura limitada con doble aprobación y auditoría si fuera necesario. Resultado: El periodo cerrado rechaza nuevos asientos; el cierre anual produce operaciones definidas por política. Ningún cierre edita/elimina publicados y la reapertura no borra evidencia. Prueba: Dado un periodo conciliado, cuando dos procesos intentan publicar y cerrar concurrentemente, entonces el lock ordena la operación: una publica antes del cierre o la otra es rechazada; nunca queda posting parcial.

## Contabilidad > Caja Chica

### XLS-039 — Registro de Caja Chica

**Ubicación original:** Contabilidad > Caja Chica > Registro de Caja Chica. **Celda:** D63. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/caja-chica/registro-de-caja-chica`.

**Objetivo y vista:** Administrar el ciclo completo de uno o varios fondos fijos: seleccionar fondo y custodio, registrar comprobantes, preparar la rendición, aprobarla y solicitar la reposición sin volver a reconocer un gasto ya contabilizado. Pantalla dedicada bajo el menú original, con selector de empresa y fondo, tarjeta de límite autorizado/saldo disponible, bandeja de gastos del periodo, formulario de comprobante y panel de vista previa contable.

**Campos y filtros:** empresa (selector; requerido; pertenece al contexto autorizado del usuario); fondo_id (selector de fondo; requerido; fondo activo de la empresa; muestra custodio, límite y saldo); custodio_id (selector de tercero/usuario; requerido; custodio vigente según política; no se reemplaza en movimientos históricos); fecha_documento (fecha; requerido; periodo abierto y no posterior a la fecha de registro); proveedor (búsqueda de tercero; opcional/condicional; tercero de la misma empresa; permite soporte sin proveedor solo si política lo autoriza); importe (decimal USD; requerido; mayor que cero, precisión Decimal y no supera saldo disponible); cuenta_gasto (selector de cuenta imputable; requerido; cuenta activa de la empresa y compatible con plantilla vigente); soporte (archivo; requerido; tipo/tamaño permitidos, hash y referencia únicos; no duplicado); periodo_rendicion (selector de periodo; requerido; no existe otra rendición confirmada para fondo y periodo).

**Columnas visibles:** fondo y custodio; periodo de rendición; cantidad de soportes; importe rendido; saldo antes/después; estado de negocio; estado contable; última acción y responsable.

**Acciones y permisos:** Nuevo fondo → crea fondo en borrador con custodio, límite y cuentas configuradas [permiso: petty_cash.fund.create]; Registrar soporte → crea gasto pendiente de validación con archivo y clave de idempotencia [permiso: petty_cash.document.create]; Validar rendición → congela selección, detecta duplicados y genera vista previa sin publicar [permiso: petty_cash.reconciliation.validate]; Enviar a aprobación → crea solicitud con versión/hash y bloquea cambios no aprobados [permiso: petty_cash.reconciliation.submit]; Aprobar y reponer → aprueba una sola vez, publica gasto y transferencia de reposición si corresponde [permiso: petty_cash.replenishment.approve]; Reversar → genera reverso enlazado; nunca edita ni elimina el asiento publicado [permiso: petty_cash.reversal.create].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, fondo, custodio y periodo abierto; el servidor verifica permisos y versión.
2. Capturar cada gasto, proveedor opcional permitido, cuenta, importe, fecha y soporte; guardar como pendiente.
3. Validar saldo, periodo, soporte, duplicidad, suma de rendición y plantilla contable; mostrar diferencias antes de continuar.
4. Enviar la rendición congelada a aprobación segregada; cualquier cambio invalida la aprobación anterior.
5. Al aprobar, reconocer cada gasto una sola vez y generar la reposición como transferencia fondo-banco con idempotencia.
6. Consultar comprobantes, asiento, reposición, auditoría y saldo actualizado; una corrección posterior usa reverso.

**Estados:** tipo: negocio; valores: BORRADOR; PENDIENTE_VALIDACION; PENDIENTE_APROBACION; APROBADA; RECHAZADA; RENDIDA; REVERSADA; tipo: contable; valores: NO_PUBLICADO; PREVIO; PUBLICADO; REVERSADO; tipo: fiscal; valores: NO_APLICA; PENDIENTE_CONFIGURACION; SOPORTE_VALIDADO. **Validaciones:** RLS, empresa, rol y permiso se verifican en backend; no confiar en campos enviados por React.; Importe, saldo y sumas usan numeric/Decimal; locks evitan dos reposiciones concurrentes.; Hash y referencia del soporte detectan duplicados; un reintento con la misma idempotency key devuelve el resultado existente.; No permitir publicación con fondo inactivo, custodio inválido, periodo cerrado, cuenta inactiva, soporte rechazado o diferencias no aprobadas.; La aprobación exige segregación cuando la política lo indique y contenido sin cambios desde la vista previa..

**Persistencia e impacto contable:** El evento PETTY_CASH_EXPENSE_RECORDED debita GASTO_RUBRO y, si la configuración aprobada lo exige, IMPUESTO; acredita CAJA_CHICA. La reposición debita CAJA_CHICA y acredita BANCO. Las cuentas, tratamiento tributario y cualquier tasa provienen de catálogos versionados por vigencia, nunca de constantes. Un asiento publicado permanece inmutable; reversos y auditoría conservan el vínculo.

**API propia propuesta:** GET /api/v1/petty-cash/funds; POST /api/v1/petty-cash/funds; GET /api/v1/petty-cash/funds/{fund_id}/documents; POST /api/v1/petty-cash/funds/{fund_id}/documents; POST /api/v1/petty-cash/reconciliations/preview; POST /api/v1/petty-cash/reconciliations/{id}/submit; POST /api/v1/petty-cash/replenishments/{id}/approve; POST /api/v1/petty-cash/documents/{id}/reverse. **Pantallas relacionadas:** XLS-040. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un fondo activo con saldo y un custodio autorizado, cuando se registran dos soportes válidos, se valida y aprueba la rendición, entonces cada gasto se publica una vez, la reposición queda enlazada al periodo y el saldo del fondo se actualiza sin duplicar gasto.

**Prueba negativa:** Dado un soporte ya rendido o un intento de reponer un periodo confirmado, cuando el usuario confirma nuevamente, entonces la API rechaza por duplicado/idempotencia, no publica otro asiento y muestra el documento original y la causa.

**Evidencias/pruebas exigidas:** `T-UI-XLS-039`, `T-PROC-XLS-039`, `T-NEG-XLS-039`.

### XLS-040 — Documentos Pendientes

**Ubicación original:** Contabilidad > Caja Chica > Documentos Pendientes. **Celda:** D64. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/caja-chica/documentos-pendientes`.

**Objetivo y vista:** Dar una bandeja operativa para localizar soportes pendientes de rendición o aprobación, resolver errores por fila y evitar que un rechazo, duplicado o falta de evidencia habilite una reposición. Pantalla dedicada, no fusionada con Registro de Caja Chica, con pestañas Pendientes de rendir, Pendientes de aprobar, Rechazados y Duplicados bloqueados.

**Campos y filtros:** fondo_id (selector; opcional/condicional; solo fondos de empresas autorizadas); custodio_id (búsqueda; opcional/condicional; coincide con custodio vigente o histórico del documento); estado (multi-selección; requerido; valores de la máquina de estados; no inferir estado contable); desde_hasta (rango de fechas; opcional/condicional; fecha de documento dentro de límites permitidos); tercero (búsqueda; opcional/condicional; tercero de la empresa activa); referencia_soporte (texto; opcional/condicional; búsqueda exacta o prefijada, sin SQL libre); motivo_bloqueo (multi-selección; opcional/condicional; soporte_faltante, rechazado, duplicado, saldo_insuficiente o periodo_cerrado).

**Columnas visibles:** documento/soporte; fondo; custodio; fecha; proveedor; importe; cuenta de gasto; estado de soporte; estado de aprobación; elegible para reposición; motivo de bloqueo; última actualización.

**Acciones y permisos:** Abrir origen → navega al registro dedicado conservando filtros y posición [permiso: petty_cash.document.read]; Validar soporte → marca evidencia válida o devuelve error concreto por documento [permiso: petty_cash.document.validate]; Aprobar documento → lo hace elegible para rendición, sin crear un segundo gasto [permiso: petty_cash.document.approve]; Rechazar → bloquea la reposición y exige motivo/evidencia [permiso: petty_cash.document.reject]; Marcar duplicado → enlaza con el soporte canónico y bloquea el duplicado [permiso: petty_cash.document.duplicate]; Devolver para corregir → mantiene historial y solicita dato o archivo faltante [permiso: petty_cash.document.return].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y pestaña de trabajo; cargar permisos, corte y estados desde backend.
2. Filtrar por fondo, custodio, fecha, tercero, estado o motivo y revisar totales de la consulta.
3. Abrir cada soporte para comprobar archivo, hash, importe, cuenta, periodo y vínculo con el registro de origen.
4. Validar y, cuando corresponda, aprobar el documento con versión; los errores quedan visibles por fila.
5. Rechazar, devolver o marcar duplicado con motivo y enlace al soporte canónico; el sistema mantiene el bloqueo.
6. Actualizar elegibilidad y navegar a Registro de Caja Chica para completar rendición; nunca publicar desde una consulta repetida.

**Estados:** tipo: soporte; valores: PENDIENTE; VALIDADO; FALTANTE; RECHAZADO; DUPLICADO; tipo: aprobacion; valores: NO_SOLICITADA; PENDIENTE; APROBADA; DEVUELTA; tipo: reposicion; valores: BLOQUEADA; ELEGIBLE; INCLUIDA; RENDIDA; tipo: contable; valores: NO_PUBLICADO; PUBLICADO; REVERSADO. **Validaciones:** La consulta se limita por tenant, empresa, permisos y paginación; filtros son campos permitidos, no expresiones libres.; Cada transición exige versión actual, actor, motivo cuando corresponda y auditoría append-only.; Un duplicado debe enlazar a un documento canónico; no se elimina ni se reemplaza silenciosamente el archivo original.; La elegibilidad requiere soporte validado, aprobación requerida, fondo activo, saldo suficiente y ausencia de asiento/reposición previa.; Errores se muestran por fila y no se ocultan por un total agregado; reintentar no crea un nuevo documento..

**Persistencia e impacto contable:** La bandeja es control y trazabilidad: validar o aprobar soporte no publica por sí solo ni crea gasto. Un documento rechazado, duplicado, sin saldo o de periodo cerrado queda excluido de reposición. Solo la rendición aprobada en XLS-039 dispara el posting de gasto y luego la transferencia de reposición; si ya existe asiento, la consulta lo muestra y no lo vuelve a contabilizar.

**API propia propuesta:** GET /api/v1/petty-cash/pending-documents; GET /api/v1/petty-cash/pending-documents/{id}; POST /api/v1/petty-cash/pending-documents/{id}/validate; POST /api/v1/petty-cash/pending-documents/{id}/approve; POST /api/v1/petty-cash/pending-documents/{id}/reject; POST /api/v1/petty-cash/pending-documents/{id}/mark-duplicate; POST /api/v1/petty-cash/pending-documents/{id}/return; GET /api/v1/petty-cash/pending-documents/{id}/history. **Pantallas relacionadas:** XLS-039. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un soporte pendiente con archivo íntegro y datos consistentes, cuando el revisor lo valida y aprueba, entonces cambia a elegible, aparece en la rendición del fondo y conserva historial; la reposición queda bloqueada hasta la aprobación de la rendición.

**Prueba negativa:** Dado un soporte con el mismo hash/referencia de uno ya rendido, cuando se intenta aprobarlo para reposición, entonces se marca duplicado, se enlaza al canónico, se mantiene bloqueado y no se genera asiento ni transferencia adicional.

**Evidencias/pruebas exigidas:** `T-UI-XLS-040`, `T-PROC-XLS-040`, `T-NEG-XLS-040`.

### Procesos integrales del grupo

**Fondo fijo, gasto soportado, rendición y reposición**. Secuencia: XLS-039; XLS-040; XLS-039. El custodio selecciona un fondo activo y periodo abierto en Registro de Caja Chica, captura soportes y gastos, consulta Documentos Pendientes para validación y aprobación, vuelve a la rendición congelada y solicita la reposición. El sistema conserva soporte, versiones, permisos, auditoría y navegación al origen. Resultado: Cada gasto válido publica débito a cuenta de gasto/impuesto configurado y crédito a CAJA_CHICA; la reposición publica débito a CAJA_CHICA y crédito a BANCO. El efecto es idempotente, con asientos inmutables y reverso enlazado para correcciones. Prueba: Dado un fondo con límite y saldo suficientes, cuando se registran soportes válidos, se aprueban y se confirma la reposición, entonces queda una sola contabilización por gasto, la transferencia queda enlazada al periodo y los saldos antes/después concilian; repetir la solicitud devuelve el resultado existente.

**Pendiente rechazado o duplicado bloquea reposición**. Secuencia: XLS-040; XLS-039. El revisor filtra la bandeja, abre el soporte, lo devuelve por falta de evidencia o lo enlaza como duplicado, y el custodio intenta incluirlo en la rendición. Resultado: La elegibilidad permanece bloqueada; no se publica gasto ni reposición. Si existía un asiento canónico, solo se consulta y cualquier corrección posterior exige reverso, no edición. Prueba: Dado un documento rechazado o con hash duplicado, cuando se intenta confirmar la rendición, entonces la validación identifica la fila, explica el motivo, impide la reposición completa o excluye la fila según política y no crea ningún efecto contable adicional.

## Contabilidad > CxP

### XLS-041 — Grupo de Proveedores

**Ubicación original:** Contabilidad > CxP > Proveedores > Grupo de Proveedores. **Celda:** E67. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/proveedores/grupo-de-proveedores`.

**Objetivo y vista:** Administrar grupos reutilizables para clasificar proveedores sin crear una segunda identidad tributaria ni duplicar personas. Listado paginado con árbol o tabla de grupos, buscador por código/nombre, contador de proveedores y panel lateral de alta/edición.

**Campos y filtros:** Código (texto; requerido; único por empresa; formato configurado); Nombre (texto; requerido; no vacío; longitud configurada); Descripción (texto; requerido; longitud máxima configurada); Estado (selector; requerido; ACTIVO o INACTIVO); Grupo padre (selector; requerido; no permitir ciclos).

**Columnas visibles:** Código; Nombre; Grupo padre; Proveedores asignados; Estado; Actualizado por/fecha.

**Acciones y permisos:** Crear grupo → crea borrador y lo deja listo para asignación [permiso: cxp.proveedor_grupo.crear]; Editar borrador → actualiza datos no publicados [permiso: cxp.proveedor_grupo.editar]; Activar/Inactivar → cambia disponibilidad sin borrar historial [permiso: cxp.proveedor_grupo.activar]; Ver proveedores → abre proveedores filtrados por el grupo [permiso: cxp.proveedor.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y consultar grupos con paginación.
2. Capturar código, nombre, jerarquía y estado; validar duplicados y ciclos.
3. Previsualizar proveedores afectados y registrar motivo si se inactiva.
4. Guardar con idempotencia y confirmar resultado; no modificar terceros históricos.
5. Consultar auditoría y navegar al registro de proveedor relacionado.

**Estados:** Borrador; Activo; Inactivo; Con cambios auditados. **Validaciones:** La empresa activa debe estar autorizada.; Código y nombre no pueden duplicarse dentro de la empresa.; La jerarquía no puede formar ciclos.; Inactivar un grupo exige confirmar impacto y conserva sus asignaciones históricas.; Las dimensiones inmobiliarias son opcionales y no se solicitan..

**Persistencia e impacto contable:** No genera asiento ni saldo. Solo agrega una dimensión clasificatoria a terceros; cualquier proveedor ya utilizado conserva sus documentos, cuentas por pagar y trazabilidad.

**API propia propuesta:** GET /api/v1/cxp/provider-groups; POST /api/v1/cxp/provider-groups; PATCH /api/v1/cxp/provider-groups/{group_id}; GET /api/v1/cxp/provider-groups/{group_id}/providers. **Pantallas relacionadas:** XLS-041. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un código de grupo disponible y nombre válido, cuando el usuario guarda con permiso de creación, entonces el grupo queda ACTIVO o en el estado seleccionado, aparece una auditoría y puede asignarse a proveedores.

**Prueba negativa:** Dado un código ya usado o una relación padre que forma ciclo, cuando se intenta guardar, entonces el backend rechaza la operación, muestra el campo con error y no crea ni modifica datos.

**Evidencias/pruebas exigidas:** `T-UI-XLS-041`, `T-PROC-XLS-041`, `T-NEG-XLS-041`.

### XLS-042 — Registro Proveedores

**Ubicación original:** Contabilidad > CxP > Proveedores > Registro Proveedores. **Celda:** E68. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/proveedores/registro-proveedores`.

**Objetivo y vista:** Registrar y mantener proveedores reutilizables por empresa con identificación, datos fiscales, contactos y cuentas bancarias controladas. Pantalla dedicada con búsqueda de terceros existentes, pestañas Identificación, Fiscal, Contactos, Bancos y Auditoría, y vista previa de cambios.

**Campos y filtros:** Tipo de persona (selector; requerido; persona natural u organización); Identificación (texto; requerido; formato según tipo y país); Razón social/nombre (texto; requerido; coincide con evidencia); Correo y teléfono (texto; requerido; formatos válidos); Cuenta bancaria (objeto; requerido; banco, tipo, número y titular; requiere aprobación para cambio); Grupo (selector; requerido; grupo activo de la empresa).

**Columnas visibles:** Identificación; Nombre/Razón social; Estado proveedor; Grupo; Cuenta principal enmascarada; Último cambio; Estado de aprobación.

**Acciones y permisos:** Nuevo proveedor → crea tercero reutilizable y perfil proveedor [permiso: cxp.proveedor.crear]; Modificar datos → crea versión pendiente o solicita aprobación [permiso: cxp.proveedor.editar]; Aprobar cambio bancario → activa la cuenta con segregación de funciones [permiso: cxp.proveedor.aprobar_banco]; Inactivar → impide nuevas operaciones sin borrar historial [permiso: cxp.proveedor.inactivar]; Consultar auditoría → muestra versiones y evidencias [permiso: cxp.proveedor.auditoria].

**Proceso que debe ejecutar:**

1. Buscar identificación antes de crear y seleccionar persona existente si corresponde.
2. Capturar datos de identificación, fiscales, contacto, grupo y banco.
3. Validar duplicidad, evidencia y cambios sensibles; presentar vista previa.
4. Enviar a aprobación cuando cambie banco o política lo requiera.
5. Confirmar y consultar el perfil vigente, historial y vínculos a documentos.

**Estados:** Borrador; Pendiente de aprobación; Activo; Inactivo; Rechazado. **Validaciones:** No crear otro tercero si ya existe la misma identidad en la empresa.; Validar identificación según tipo y país configurado.; Datos fiscales usados en documentos quedan congelados en el documento.; Una cuenta bancaria nueva requiere evidencia, aprobación y segregación.; No exigir condominio, unidad ni alícuota..

**Persistencia e impacto contable:** No genera asiento. Habilita el tercero para documentos de CxP y conserva snapshots fiscales y bancarios en cada operación; cambiar la cuenta no altera pagos históricos.

**API propia propuesta:** GET /api/v1/cxp/providers; POST /api/v1/cxp/providers; PATCH /api/v1/cxp/providers/{provider_id}; POST /api/v1/cxp/providers/{provider_id}/bank-changes; GET /api/v1/cxp/providers/{provider_id}/audit. **Pantallas relacionadas:** XLS-042. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un tercero no duplicado con identificación y nombre válidos, cuando se confirma el registro, entonces se crea un perfil proveedor activo, se registra auditoría y queda disponible para Documentos de Soporte.

**Prueba negativa:** Dado que la identificación ya pertenece a una persona de la empresa, cuando el usuario intenta crear otro proveedor, entonces se ofrece reutilizar el perfil y se bloquea la duplicación.

**Evidencias/pruebas exigidas:** `T-UI-XLS-042`, `T-PROC-XLS-042`, `T-NEG-XLS-042`.

### XLS-043 — Importación Masiva de Proveedores/Clientes

**Ubicación original:** Contabilidad > CxP > Proveedores > Importación Masiva de Proveedores/Clientes. **Celda:** E69. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/proveedores/importacion-masiva-de-proveedores-clientes`.

**Objetivo y vista:** Importar en lote proveedores y clientes, reutilizando personas existentes, detectando duplicados y permitiendo corregir filas antes de confirmar. Asistente de importación dedicado: descargar plantilla versionada, cargar CSV/XLSX, revisar resumen, tabla de errores por fila y pestaña de homologación.

**Campos y filtros:** Archivo (archivo; requerido; extensión y tamaño permitidos; hash); Versión de plantilla (selector; requerido; vigente para la empresa); Modo de coincidencia (selector; requerido; identificación y reglas configuradas); Roles (lista; requerido; PROVEEDOR, CLIENTE o ambos); Confirmar filas válidas (booleano; requerido; requiere revisión y permisos).

**Columnas visibles:** Fila; Identificación; Nombre; Roles; Resultado validación; Mensaje; Tercero reutilizado; Estado confirmación.

**Acciones y permisos:** Descargar plantilla → obtiene columnas y ejemplo de versión vigente [permiso: migracion.importar_plantilla]; Prevalidar → crea lote y errores por fila sin escribir perfiles activos [permiso: migracion.importar_prevalidar]; Homologar → vincula una fila con tercero o corrige datos [permiso: migracion.homologar]; Confirmar válidas → crea/actualiza roles de filas aprobadas [permiso: migracion.importar_confirmar]; Reintentar rechazadas → procesa solo filas corregidas sin duplicar lote [permiso: migracion.importar_reintentar].

**Proceso que debe ejecutar:**

1. Descargar plantilla, seleccionar versión y cargar archivo con hash.
2. Prevalidar estructura, identificación, roles, grupos y duplicados.
3. Revisar errores por fila y homologar personas existentes.
4. Corregir y reintentar solo filas rechazadas; conservar resultados previos.
5. Confirmar filas válidas con idempotencia y consultar conciliación del lote.

**Estados:** Cargado; Prevalidado; Con errores; Listo para confirmar; Confirmado parcial; Confirmado; Requiere corrección. **Validaciones:** Rechazar archivos maliciosos, ZIP bombs y entidades externas.; Identificación, roles y columnas obligatorias deben ser válidos.; Detectar duplicados dentro del archivo y contra la empresa.; No confirmar filas con tercero, grupo o dato fiscal sin homologar.; Reintentar no puede crear una segunda persona..

**Persistencia e impacto contable:** Crea o actualiza perfiles de terceros, no asientos ni saldos. La reutilización evita doble identidad; el lote conserva mapas de origen, errores y reintentos para auditoría.

**API propia propuesta:** POST /api/v1/imports/providers-customers; GET /api/v1/imports/{batch_id}; POST /api/v1/imports/{batch_id}/homologations; POST /api/v1/imports/{batch_id}/confirm; POST /api/v1/imports/{batch_id}/retry. **Pantallas relacionadas:** XLS-043. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un archivo con diez filas válidas y dos filas corregibles, cuando se prevalida, homologa y confirma el lote, entonces se crean los perfiles de las diez filas, las dos corregidas quedan disponibles y el resumen conserva la trazabilidad.

**Prueba negativa:** Dado un archivo con una identificación duplicada y una fila con rol inválido, cuando se confirma sin corregir, entonces esas filas quedan rechazadas con errores visibles y no se crean duplicados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-043`, `T-PROC-XLS-043`, `T-NEG-XLS-043`.

### XLS-044 — Documentos de Soporte

**Ubicación original:** Contabilidad > CxP > Documentos de Soporte. **Celda:** D70. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/documentos-de-soporte`.

**Objetivo y vista:** Registrar o importar documentos de soporte de compras, validarlos y generar una sola obligación y contabilización por documento confirmado. Bandeja y formulario dedicados con pestañas Datos, Líneas/Impuestos, Soportes, Vista previa contable e Historial.

**Campos y filtros:** Tipo de documento (selector; requerido; tipo permitido); Proveedor (búsqueda; requerido; perfil activo y evidencia); Fecha/serie/número (fecha y texto; requerido; periodo abierto; número válido); Clave de acceso (texto; requerido; longitud/formato cuando aplique); Líneas y bases (tabla decimal; requerido; sumas y tratamiento tributario configurado); Archivo/XML (archivo; requerido; hash, antivirus y estructura verificable).

**Columnas visibles:** Tipo y número; Proveedor; Fecha; Total; Estado validación; Estado contable; Clave/duplicado; Saldo CxP.

**Acciones y permisos:** Registrar → guarda borrador sin contabilizar [permiso: cxp.documento.crear]; Prevalidar XML/lote → devuelve errores y duplicados sin publicar [permiso: cxp.documento.validar]; Confirmar y contabilizar → crea obligación y asiento una sola vez [permiso: cxp.documento.publicar]; Reimprimir soporte → genera copia del documento existente sin contabilizar [permiso: cxp.documento.reimprimir]; Anular registro local → envía al flujo de reverso autorizado [permiso: cxp.documento.reversar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, proveedor y tipo; cargar soporte o XML.
2. Capturar líneas, bases, impuestos, vencimiento y cuentas sugeridas.
3. Validar proveedor, clave, número, fechas, totales, duplicados y periodo.
4. Revisar vista previa de obligación/asiento y aprobar según política.
5. Publicar con idempotencia, guardar XML/hash y consultar saldo y auditoría.

**Estados:** Borrador; En validación; Observado; Listo para contabilizar; Publicado; Reversado. **Validaciones:** Clave, proveedor, serie, número, fecha, bases, impuestos y total deben conciliar.; Duplicado considera empresa, proveedor, tipo y número completo.; XML original y hash son inmutables; separar estado fiscal de contable.; No publicar en periodo cerrado ni sin cuenta/tratamiento homologado.; Reintentos idempotentes no crean segunda obligación..

**Persistencia e impacto contable:** Al publicar crea un payable_item y su asiento según plantilla aprobada; deuda, impuestos y saldo quedan enlazados al documento. Reimpresión no vuelve a contabilizar. Un reverso conserva el original.

**API propia propuesta:** POST /api/v1/cxp/support-documents; POST /api/v1/cxp/support-documents/{id}/validate; POST /api/v1/cxp/support-documents/{id}/post; GET /api/v1/cxp/support-documents/{id}/preview; POST /api/v1/cxp/support-documents/{id}/reverse. **Pantallas relacionadas:** XLS-044. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un documento válido no duplicado y un periodo abierto, cuando el aprobador confirma la vista previa, entonces se crea una obligación, un asiento publicado y un saldo CxP exactamente una vez.

**Prueba negativa:** Dado un XML duplicado o con total que no coincide con sus líneas, cuando se intenta publicar, entonces la operación se rechaza, se conserva el soporte y no se genera asiento adicional.

**Evidencias/pruebas exigidas:** `T-UI-XLS-044`, `T-PROC-XLS-044`, `T-NEG-XLS-044`.

### XLS-045 — Ingreso de Anticipos

**Ubicación original:** Contabilidad > CxP > Anticipos > Ingreso de Anticipos. **Celda:** E72. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/anticipos/ingreso-de-anticipos`.

**Objetivo y vista:** Registrar un anticipo a proveedor con desembolso, saldo disponible y trazabilidad bancaria sin reconocerlo como gasto. Formulario transaccional con proveedor, fecha, medio de desembolso, cuenta origen, importe, soporte y contrapartida; panel de saldo disponible, vista previa contable, historial y aplicaciones.

**Campos y filtros:** Proveedor (búsqueda; requerido; activo y de la empresa); Fecha y referencia (fecha/texto; requerido; periodo abierto; referencia única); Importe (decimal; requerido; mayor que cero; precisión configurada); Cuenta/medio de desembolso (selector; requerido; cuenta habilitada); Soporte (archivo; requerido; hash y tipo permitido); Dimensión opcional (selector; requerido; solo si módulo habilitado).

**Columnas visibles:** Número anticipo; Proveedor; Fecha; Importe original; Aplicado; Disponible; Estado; Asiento.

**Acciones y permisos:** Guardar borrador → crea anticipo no publicado [permiso: cxp.anticipo.crear]; Previsualizar asiento → muestra débito/crédito propuesto [permiso: cxp.anticipo.previsualizar]; Publicar desembolso → registra activo de anticipo y asiento [permiso: cxp.anticipo.publicar]; Consultar aplicaciones → abre cruces vinculados [permiso: cxp.anticipo.consultar]; Reimprimir comprobante → copia soporte sin nuevo efecto [permiso: cxp.anticipo.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar proveedor, periodo, cuenta de desembolso y soporte.
2. Capturar importe y referencia; validar saldo, duplicidad y cuenta.
3. Revisar vista previa que separa anticipo de gasto.
4. Aprobar y publicar en una transacción idempotente.
5. Consultar disponible, aplicaciones y vínculo bancario.

**Estados:** Borrador; Pendiente de aprobación; Publicado; Parcialmente aplicado; Aplicado; Reversado. **Validaciones:** Proveedor y empresa deben coincidir.; Importe positivo, cuenta vigente y periodo abierto.; No duplicar referencia/soporte según regla de la empresa.; El asiento debe usar plantilla de anticipo, no gasto.; Publicar exige permiso y bloqueo de concurrencia..

**Persistencia e impacto contable:** Registra un activo/saldo a favor contra proveedor y reduce fondos según el medio; no crea gasto ni obligación por compra hasta el cruce correspondiente. Sus aplicaciones alimentan el auxiliar CxP.

**API propia propuesta:** POST /api/v1/cxp/supplier-advances; GET /api/v1/cxp/supplier-advances/{id}/preview; POST /api/v1/cxp/supplier-advances/{id}/post; GET /api/v1/cxp/supplier-advances/{id}/applications. **Pantallas relacionadas:** XLS-045. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un anticipo válido con desembolso identificado, cuando se aprueba y publica, entonces queda saldo disponible para el proveedor, asiento único y soporte consultable.

**Prueba negativa:** Dado un importe cero, referencia duplicada o periodo cerrado, cuando se intenta publicar, entonces se rechaza sin movimiento bancario ni gasto.

**Evidencias/pruebas exigidas:** `T-UI-XLS-045`, `T-PROC-XLS-045`, `T-NEG-XLS-045`.

### XLS-046 — Cruce de Anticipos Proveedores

**Ubicación original:** Contabilidad > CxP > Anticipos > Cruce de Anticipos Proveedores. **Celda:** E73. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/anticipos/cruce-de-anticipos-proveedores`.

**Objetivo y vista:** Aplicar un anticipo a una deuda del mismo proveedor y empresa hasta el saldo disponible, en una transacción única y trazable. Pantalla de selección con filtros por proveedor, corte, vencimiento y estado; panel maestro-detalle que muestra anticipos disponibles, obligaciones elegibles, importe a aplicar, saldo antes/después y vista previa del asiento.

**Campos y filtros:** Proveedor (búsqueda; requerido; mismo proveedor en ambas fuentes); Anticipo (selector; requerido; saldo disponible positivo); Documento CxP (selector; requerido; obligación abierta elegible); Importe aplicación (decimal; requerido; mayor que cero y menor o igual a ambos saldos); Fecha efectiva (fecha; requerido; periodo abierto); Motivo (texto; requerido; auditable).

**Columnas visibles:** Anticipo; Documento; Proveedor; Saldo anticipo; Saldo deuda; Aplicado; Fecha; Estado.

**Acciones y permisos:** Simular cruce → calcula saldos y asiento sin escribir [permiso: cxp.anticipo_cruce.previsualizar]; Confirmar cruce → aplica en una transacción única [permiso: cxp.anticipo_cruce.publicar]; Cancelar borrador → descarta selección no publicada [permiso: cxp.anticipo_cruce.cancelar]; Consultar trazabilidad → navega a anticipo, obligación y asiento [permiso: cxp.anticipo_cruce.consultar]; Reimprimir constancia → copia operación existente [permiso: cxp.anticipo_cruce.reimprimir].

**Proceso que debe ejecutar:**

1. Filtrar y seleccionar proveedor, anticipo y obligación compatible.
2. Capturar importe, fecha y motivo; validar saldos bajo bloqueo.
3. Revisar saldos antes/después y vista previa de aplicación.
4. Confirmar una sola transacción con idempotencia.
5. Consultar enlaces, estados y reporte de aplicaciones.

**Estados:** Borrador; Previsualizado; Publicado; Reversado; Rechazado. **Validaciones:** Proveedor, empresa y moneda deben coincidir.; Importe no puede superar anticipo ni obligación.; Bloquear saldos durante la confirmación y rechazar versión obsoleta.; No aplicar a documentos anulados, reversados o cerrados.; Reintento con misma clave devuelve operación existente..

**Persistencia e impacto contable:** Reduce el anticipo disponible y la deuda CxP por el mismo importe; genera aplicación y asiento de compensación, no ingreso ni gasto nuevo. El histórico queda disponible para cortes.

**API propia propuesta:** GET /api/v1/cxp/advance-offsets/eligible; POST /api/v1/cxp/advance-offsets/preview; POST /api/v1/cxp/advance-offsets; GET /api/v1/cxp/advance-offsets/{id}. **Pantallas relacionadas:** XLS-046. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un anticipo disponible de 100 y una deuda elegible de 80, cuando se confirma una aplicación de 80, entonces el anticipo queda con 20, la deuda con cero y existe un asiento único enlazado.

**Prueba negativa:** Dado que la deuda pertenece a otra empresa o el importe supera el saldo disponible, cuando se confirma, entonces el backend rechaza la operación sin modificar ninguno de los dos auxiliares.

**Evidencias/pruebas exigidas:** `T-UI-XLS-046`, `T-PROC-XLS-046`, `T-NEG-XLS-046`.

### XLS-047 — Anulación de Anticipos Proveedores

**Ubicación original:** Contabilidad > CxP > Anticipos > Anulación de Anticipos Proveedores. **Celda:** E74. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/anticipos/anulacion-de-anticipos-proveedores`.

**Objetivo y vista:** Reversar un anticipo no aplicado o deshacer primero sus aplicaciones, conservando vínculos y controles bancarios. Pantalla transaccional con buscador de anticipos por proveedor/fecha/estado, detalle de aplicaciones, dependencias bancarias y asistente de reverso.

**Campos y filtros:** Anticipo (búsqueda; requerido; publicado y de empresa activa); Motivo (texto; requerido; mínimo y auditable); Fecha reverso (fecha; requerido; periodo abierto); Tratamiento aplicaciones (selector; requerido; deshacer primero o bloquear); Evidencia (archivo; requerido; soporte y hash); Confirmación (booleano; requerido; acepta efecto contable y bancario).

**Columnas visibles:** Anticipo; Proveedor; Original; Aplicado; Disponible; Dependencias; Estado; Reverso.

**Acciones y permisos:** Revisar dependencias → muestra aplicaciones y banco relacionado [permiso: cxp.anticipo_anulacion.consultar]; Deshacer aplicaciones → revierte cruces autorizados previamente [permiso: cxp.anticipo_anulacion.desaplicar]; Solicitar reverso → envía aprobación con motivo/evidencia [permiso: cxp.anticipo_anulacion.solicitar]; Confirmar reverso → publica reverso local único [permiso: cxp.anticipo_anulacion.publicar]; Reimprimir constancia → copia historial sin nuevo asiento [permiso: cxp.anticipo_anulacion.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar anticipo publicado y revisar aplicaciones/relaciones bancarias.
2. Capturar motivo, fecha y evidencia; resolver aplicaciones según permisos.
3. Validar periodo, dependencias y vista previa del reverso.
4. Aprobar y publicar reverso sin borrar el original.
5. Consultar saldo, asiento reverso, auditoría y estado bancario pendiente.

**Estados:** Publicado; Con aplicaciones; Pendiente de reverso; Reversado; Bloqueado por dependencia. **Validaciones:** No borrar ni editar el anticipo publicado.; Exigir desaplicar antes si existen cruces activos.; Verificar periodo abierto y permiso de reverso.; Conservar XML/soporte y asiento original.; La operación es idempotente y bloquea doble reverso..

**Persistencia e impacto contable:** Revierte el efecto del anticipo y sus aplicaciones según orden aprobado; conserva original, enlaces y evidencias. Si hay dependencia bancaria, la deja en flujo controlado y no altera el extracto por simple anulación.

**API propia propuesta:** GET /api/v1/cxp/supplier-advances/{id}/dependencies; POST /api/v1/cxp/supplier-advances/{id}/unapply; POST /api/v1/cxp/supplier-advances/{id}/reverse; GET /api/v1/cxp/supplier-advances/{id}/history. **Pantallas relacionadas:** XLS-047. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un anticipo publicado sin aplicaciones y con periodo abierto, cuando un usuario autorizado confirma el reverso, entonces se genera reverso enlazado, el saldo queda cero disponible y el original permanece consultable.

**Prueba negativa:** Dado un anticipo con aplicación activa, cuando se intenta reversar sin desaplicar, entonces la pantalla bloquea la operación y enumera la dependencia sin crear asiento.

**Evidencias/pruebas exigidas:** `T-UI-XLS-047`, `T-PROC-XLS-047`, `T-NEG-XLS-047`.

### XLS-048 — Migración Anticipos Proveedores

**Ubicación original:** Contabilidad > CxP > Anticipos > Migración Anticipos Proveedores. **Celda:** E75. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/anticipos/migracion-anticipos-proveedores`.

**Objetivo y vista:** Migrar anticipos de proveedores al corte con saldo, contrapartida inicial y conciliación sin doble contabilización. Asistente dedicado con plantilla versionada, fecha de corte, empresa, cuenta de contrapartida y tabla de conciliación.

**Campos y filtros:** Archivo plantilla (archivo; requerido; formato, hash y columnas vigentes); Fecha de corte (fecha; requerido; periodo y política de migración); Proveedor/origen (texto; requerido; homologable a tercero); Saldo anticipo (decimal; requerido; no negativo y moneda); Cuenta contrapartida (selector; requerido; cuenta aprobada para apertura); Modo de carga (selector; requerido; preparar o confirmar).

**Columnas visibles:** Fila; Proveedor origen; Proveedor destino; Saldo; Contrapartida; Resultado; Diferencia; Estado.

**Acciones y permisos:** Descargar plantilla → obtiene estructura de migración [permiso: migracion.anticipos_plantilla]; Prevalidar corte → calcula errores y duplicados sin publicar [permiso: migracion.anticipos_prevalidar]; Conciliar → muestra origen contra saldos cargados [permiso: migracion.anticipos_conciliar]; Confirmar lote → crea saldos iniciales y asientos aprobados [permiso: migracion.anticipos_confirmar]; Reintentar errores → procesa filas corregidas sin duplicar [permiso: migracion.anticipos_reintentar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, corte, plantilla y contrapartida aprobada.
2. Cargar archivo y homologar proveedores a identidades existentes.
3. Prevalidar saldos, moneda, duplicados, cuentas y consistencia del corte.
4. Revisar conciliación y confirmar solo filas válidas con aprobación.
5. Consultar lote, saldos iniciales, asientos y diferencias pendientes.

**Estados:** Cargado; Prevalidado; Con errores; Conciliado; Confirmado parcial; Confirmado; Requiere reintento. **Validaciones:** Corte, moneda, saldo y proveedor deben ser válidos.; Homologar antes de confirmar; no crear identidades implícitas.; Detectar lote/clave ya confirmado y rechazar doble contabilización.; Contrapartida requiere cuenta y permiso aprobados.; Errores por fila deben ser descargables y corregibles..

**Persistencia e impacto contable:** Crea saldos iniciales de anticipo y sus contrapartidas de migración; no registra gasto. Cada fila queda enlazada al lote, proveedor y asiento de apertura, con conciliación para evitar segunda carga.

**API propia propuesta:** POST /api/v1/migrations/supplier-advances; GET /api/v1/migrations/{batch_id}; POST /api/v1/migrations/{batch_id}/reconcile; POST /api/v1/migrations/{batch_id}/confirm; POST /api/v1/migrations/{batch_id}/retry. **Pantallas relacionadas:** XLS-048. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un lote conciliado con tres anticipos y contrapartida aprobada, cuando se confirma, entonces se crean tres saldos iniciales y asientos de apertura enlazados, con total igual al archivo.

**Prueba negativa:** Dado que una fila ya fue confirmada o su saldo no concilia con el corte, cuando se reintenta el lote, entonces la fila se rechaza y no se duplica ningún saldo ni asiento.

**Evidencias/pruebas exigidas:** `T-UI-XLS-048`, `T-PROC-XLS-048`, `T-NEG-XLS-048`.

### XLS-049 — Ingreso Nota de Crédito

**Ubicación original:** Contabilidad > CxP > Notas de Crédito > Ingreso Nota de Crédito. **Celda:** E77. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/notas-de-credito/ingreso-nota-de-credito`.

**Objetivo y vista:** Registrar una nota de crédito recibida vinculada a una compra y ajustar CxP e impuestos según documento válido. Formulario separado de ingreso con búsqueda de compra/obligación, captura de motivo, líneas, bases, impuestos y soporte.

**Campos y filtros:** Proveedor y compra origen (búsqueda; requerido; misma empresa y vínculo válido); Tipo/número/clave (texto; requerido; unicidad y formato aplicable); Fecha (fecha; requerido; periodo abierto y reglas vigentes configuradas); Motivo y líneas (texto/tabla; requerido; coincide con soporte); Bases/impuestos (tabla decimal; requerido; cálculo por matriz vigente); XML/soporte (archivo; requerido; hash y validación).

**Columnas visibles:** NC; Proveedor; Compra origen; Fecha; Total; Saldo antes/después; Estado fiscal; Estado contable.

**Acciones y permisos:** Registrar borrador → guarda documento sin impacto [permiso: cxp.nota_credito.crear]; Validar soporte → comprueba vínculo, totales y duplicados [permiso: cxp.nota_credito.validar]; Publicar ajuste → genera ajuste CxP/asiento único [permiso: cxp.nota_credito.publicar]; Reimprimir → copia documento ya registrado [permiso: cxp.nota_credito.reimprimir]; Consultar origen → navega a compra y asiento [permiso: cxp.nota_credito.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar proveedor y compra u obligación vinculada.
2. Capturar nota, motivo, líneas, bases, impuestos y soporte.
3. Validar unicidad, vínculo, importes, periodo y matriz fiscal configurada.
4. Revisar vista previa del saldo y crédito a favor; aprobar.
5. Publicar una vez y consultar documento, asiento y trazabilidad.

**Estados:** Borrador; En validación; Observada; Publicada; Reversada. **Validaciones:** Nota y compra deben pertenecer a la misma empresa/proveedor.; No duplicar por tipo y número completo.; Bases, impuestos y total deben conciliar con soporte.; No modificar documentos publicados; correcciones usan reverso.; No hardcodear porcentajes: resolver matriz vigente configurada..

**Persistencia e impacto contable:** Reduce la obligación y ajusta impuestos según la configuración aprobada; si excede saldo impago, crea saldo a favor explícito. No borra la compra ni usa saldo cero como rechazo automático.

**API propia propuesta:** POST /api/v1/cxp/credit-notes; POST /api/v1/cxp/credit-notes/{id}/validate; POST /api/v1/cxp/credit-notes/{id}/post; GET /api/v1/cxp/credit-notes/{id}/preview. **Pantallas relacionadas:** XLS-049. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un soporte válido vinculado a una compra abierta, cuando se publica la nota, entonces el saldo CxP y el asiento se ajustan una vez, conservando el documento original y su auditoría.

**Prueba negativa:** Dado un número duplicado, proveedor distinto o total inconsistente, cuando se intenta publicar, entonces el backend rechaza la nota y mantiene intacta la obligación original.

**Evidencias/pruebas exigidas:** `T-UI-XLS-049`, `T-PROC-XLS-049`, `T-NEG-XLS-049`.

### XLS-050 — Anulación Nota de Crédito

**Ubicación original:** Contabilidad > CxP > Notas de Crédito > Anulación Nota de Crédito. **Celda:** E78. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/notas-de-credito/anulacion-nota-de-credito`.

**Objetivo y vista:** Revertir localmente una nota de crédito recibida mediante reverso autorizado, sin pretender anular el documento fiscal del proveedor. Pantalla propia de anulación con buscador de NC publicadas, detalle de compra, estado fiscal informado, dependencias, motivo, evidencia y vista previa de reverso.

**Campos y filtros:** Nota de crédito (búsqueda; requerido; publicada y empresa activa); Motivo (texto; requerido; obligatorio y auditable); Fecha reverso (fecha; requerido; periodo abierto); Evidencia (archivo; requerido; soporte/hash); Resultado fiscal externo (texto/estado; requerido; solo registro informativo; no asumir API); Confirmación (booleano; requerido; acepta reverso local).

**Columnas visibles:** NC; Proveedor; Compra; Total; Estado contable; Estado fiscal informado; Dependencias; Reverso.

**Acciones y permisos:** Consultar detalle → muestra XML/soporte y vínculos [permiso: cxp.nota_credito.consultar]; Solicitar reverso → crea aprobación con motivo [permiso: cxp.nota_credito.reversar_solicitar]; Confirmar reverso local → publica asiento reverso sin borrar NC [permiso: cxp.nota_credito.reversar_publicar]; Registrar evidencia externa → actualiza solo resultado documentado [permiso: cxp.nota_credito.evidencia]; Reimprimir → copia historial sin nuevo asiento [permiso: cxp.nota_credito.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar NC publicada y revisar compra, aplicaciones y estado fiscal.
2. Capturar motivo, evidencia y fecha; identificar dependencias.
3. Previsualizar reverso contable y advertencia sobre trámite externo.
4. Aprobar/publicar reverso local sin borrar XML ni original.
5. Registrar por separado cualquier evidencia externa y consultar auditoría.

**Estados:** Publicada; Pendiente de reverso; Reversada localmente; Con trámite externo informado; Bloqueada. **Validaciones:** Solo NC publicada puede solicitar reverso.; Resolver aplicaciones/dependencias antes de publicar.; No borrar documento, XML o autorización.; Estado fiscal externo debe ser informativo hasta evidencia verificable.; Reverso idempotente y sujeto a periodo/permisos..

**Persistencia e impacto contable:** Reconstituye localmente el efecto de la NC sobre CxP e impuestos mediante reverso enlazado. No afirma anulación fiscal del proveedor ni elimina XML, número o historial.

**API propia propuesta:** GET /api/v1/cxp/credit-notes/{id}/dependencies; POST /api/v1/cxp/credit-notes/{id}/reverse; POST /api/v1/cxp/credit-notes/{id}/external-evidence; GET /api/v1/cxp/credit-notes/{id}/history. **Pantallas relacionadas:** XLS-050. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado una NC publicada sin dependencias bloqueantes, cuando el usuario autorizado confirma el reverso local, entonces se publica un reverso enlazado, la NC permanece consultable y el resultado fiscal no se inventa.

**Prueba negativa:** Dado una NC con aplicación activa o periodo cerrado, cuando se intenta anular, entonces la pantalla bloquea el reverso y muestra la dependencia o cierre responsable.

**Evidencias/pruebas exigidas:** `T-UI-XLS-050`, `T-PROC-XLS-050`, `T-NEG-XLS-050`.

### XLS-051 — Ingreso Liq. De Compras

**Ubicación original:** Contabilidad > CxP > Liquidación de Compras > Ingreso Liq. De Compras. **Celda:** E80. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/liquidacion-de-compras/ingreso-liq-de-compras`.

**Objetivo y vista:** Emitir una liquidación de compras solo bajo supuestos configurados y aprobados, generar XML real mediante adaptador habilitado y consultar resultado autorizado. Flujo dedicado con datos del proveedor/sujeto, concepto, bases, impuestos configurados, numeración, soportes, vista previa contable, firma y bandeja de trabajo.

**Campos y filtros:** Proveedor/sujeto (búsqueda; requerido; perfil y supuesto habilitado); Fecha y numeración (fecha/texto; requerido; secuencia vigente y no reutilizada); Concepto y líneas (tabla; requerido; soporte y cuentas); Tratamiento fiscal (selector; requerido; matriz vigente aprobada; sin tasas fijas); Certificado/configuración (referencia; requerido; secreto custodiado, no expuesto); Soportes (archivo; requerido; hash y evidencia).

**Columnas visibles:** Número/clave; Sujeto; Fecha; Total; Estado local; Recepción; Autorización; Asiento; RIDE.

**Acciones y permisos:** Guardar borrador → crea documento sin emisión [permiso: tax.liquidacion.crear]; Validar y firmar → genera XML firmado si configuración válida [permiso: tax.liquidacion.firmar]; Transmitir/encolar → usa adaptador oficial documentado y devuelve trabajo [permiso: tax.liquidacion.transmitir]; Consultar autorización → actualiza respuesta real y efectos [permiso: tax.liquidacion.consultar]; Reimprimir RIDE → copia autorizado sin contabilizar otra vez [permiso: tax.liquidacion.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, sujeto y supuesto configurado/aprobado.
2. Capturar líneas, tratamiento fiscal, numeración y soportes.
3. Validar XML, secuencia, firma, cuentas y vista previa CxP.
4. Aprobar, firmar y transmitir por adaptador documentado; seguir trabajo.
5. Consultar recepción/autorización real y publicar efecto contable una sola vez.

**Estados:** Borrador; Validación fallida; Firmada; Enviada; Recibida; Autorizada; No autorizada; Rechazada. **Validaciones:** Supuesto y perfil tributario deben estar aprobados para la fecha.; Resolver numeración, firma, XSD/catálogos y credenciales custodiadas.; No inventar endpoint público ni estado autorizado.; Separar estados fiscal y contable; no publicar dos veces.; Tasas y retenciones provienen de configuración vigente, nunca constantes..

**Persistencia e impacto contable:** Al autorizar y confirmar el efecto, crea documento/obligación y asiento según plantilla. Firma, recepción y autorización se guardan con artefactos; no se presenta una pantalla falsa de SRI ni se publica antes del control definido.

**API propia propuesta:** POST /api/v1/tax/purchase-settlements; POST /api/v1/tax/purchase-settlements/{id}/validate-sign; POST /api/v1/tax/purchase-settlements/{id}/transmit; GET /api/v1/tax/purchase-settlements/{id}/status; POST /api/v1/tax/purchase-settlements/{id}/post-effect. **Pantallas relacionadas:** XLS-051. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un supuesto habilitado, XML válido y certificado configurado, cuando el adaptador devuelve autorización real y el usuario confirma el efecto, entonces se conserva el comprobante y se crea una obligación/asiento único.

**Prueba negativa:** Dado un supuesto no habilitado o una respuesta fiscal no autorizada, cuando se intenta publicar, entonces el sistema mantiene el documento en estado fiscal correspondiente y no crea una deuda contable autorizada.

**Evidencias/pruebas exigidas:** `T-UI-XLS-051`, `T-PROC-XLS-051`, `T-NEG-XLS-051`.

### XLS-052 — Anulación Liq. De Compras

**Ubicación original:** Contabilidad > CxP > Liquidación de Compras > Anulación Liq. De Compras. **Celda:** E81. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/liquidacion-de-compras/anulacion-liq-de-compras`.

**Objetivo y vista:** Separar el reverso local de una liquidación de compras del trámite fiscal de anulación, reflejando solo resultados remotos comprobados. Pantalla propia con búsqueda de liquidaciones, estado fiscal/contable lado a lado, dependencias, motivo, evidencia y asistente de acciones.

**Campos y filtros:** Liquidación (búsqueda; requerido; identificador y empresa); Motivo local (texto; requerido; evidencia obligatoria); Fecha reverso (fecha; requerido; periodo abierto); Acción fiscal (selector; requerido; registrar solicitud o tarea manual); Resultado remoto (estado/texto; requerido; solo respuesta documentada); Confirmación (booleano; requerido; separa efectos).

**Columnas visibles:** Liquidación; Clave; Proveedor; Estado contable; Estado fiscal; Solicitud externa; Dependencias; Reverso.

**Acciones y permisos:** Revisar → muestra XML, autorización y asiento [permiso: tax.liquidacion.consultar]; Reversar local → publica reverso autorizado del efecto interno [permiso: tax.liquidacion.reversar_local]; Crear tarea fiscal → registra instrucción y responsable si aplica [permiso: tax.liquidacion.crear_tarea]; Registrar resultado → guarda evidencia de canal real [permiso: tax.liquidacion.resultado]; Reimprimir → copia constancia sin nuevo efecto [permiso: tax.liquidacion.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar liquidación autorizada y revisar dependencias.
2. Capturar motivo y elegir reverso local, tarea externa o ambos.
3. Validar periodo, permisos y evidencia; mostrar advertencia de separación.
4. Publicar reverso local si fue aprobado y registrar solicitud externa separadamente.
5. Actualizar resultado solo con evidencia; consultar historial y efectos CxP.

**Estados:** Autorizada; Pendiente de decisión; Reversada localmente; Solicitud fiscal pendiente; Anulación fiscal confirmada; Anulación fiscal rechazada. **Validaciones:** No borrar XML, autorización ni asiento original.; Separar permiso de reverso local y permiso de trámite fiscal.; No llamar a una API SRI no documentada; usar adaptador solo con capacidad comprobada.; No cambiar estado remoto sin evidencia.; Reverso local idempotente y sujeto a dependencias/periodo..

**Persistencia e impacto contable:** El reverso local deshace efectos contables/CxP según autorización; el trámite fiscal conserva XML y cambia únicamente con respuesta o evidencia verificable. Nunca se confunde una tarea manual con autorización.

**API propia propuesta:** GET /api/v1/tax/purchase-settlements/{id}/cancellation-context; POST /api/v1/tax/purchase-settlements/{id}/local-reversal; POST /api/v1/tax/cancellation-requests; PATCH /api/v1/tax/cancellation-requests/{id}/result; GET /api/v1/tax/cancellation-requests/{id}. **Pantallas relacionadas:** XLS-052. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado una liquidación autorizada y un reverso local aprobado, cuando se confirma, entonces se crea el reverso contable y una solicitud fiscal separada, cada una con su estado e historial.

**Prueba negativa:** Dado que no existe canal oficial automatizable o falta evidencia externa, cuando se intenta marcar anulación fiscal confirmada, entonces el sistema lo impide y mantiene la solicitud pendiente/manual.

**Evidencias/pruebas exigidas:** `T-UI-XLS-052`, `T-PROC-XLS-052`, `T-NEG-XLS-052`.

### XLS-053 — Anular Retención

**Ubicación original:** Contabilidad > CxP > Retenciones > Anular Retención. **Celda:** E83. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/retenciones/anular-retencion`.

**Objetivo y vista:** Anular una retención emitida mediante flujo fiscal aplicable y reverso local autorizado, conservando XML y estados separados. Pantalla dedicada bajo Retenciones emitidas, con selector de retención, documento origen, código/base/valor, estado de aceptación o trámite, dependencias y acciones separadas.

**Campos y filtros:** Retención emitida (búsqueda; requerido; documento y empresa válidos); Motivo (texto; requerido; evidencia y aprobación); Fecha/acción (fecha/selector; requerido; periodo y flujo configurado); Resultado fiscal (estado/texto; requerido; respuesta o evidencia real); Soporte (archivo; requerido; XML/hash y documento); Confirmación (booleano; requerido; acepta separación de efectos).

**Columnas visibles:** Código/clave; Proveedor; Documento origen; Base; Valor; Estado local; Estado fiscal; Reverso.

**Acciones y permisos:** Consultar retención → abre XML, documento y vínculos [permiso: tax.withholding.consultar]; Solicitar trámite → crea solicitud o tarea externa [permiso: tax.withholding.solicitar_anulacion]; Reversar efecto local → publica reverso autorizado sin borrar XML [permiso: tax.withholding.reversar_local]; Registrar respuesta → guarda evidencia y estado remoto [permiso: tax.withholding.registrar_resultado]; Reimprimir → copia retención existente [permiso: tax.withholding.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar retención emitida y revisar documento, base, valor y dependencias.
2. Capturar motivo, evidencia y acción fiscal permitida por configuración vigente.
3. Validar aceptación/trámite, permisos, periodo y vista previa local.
4. Aprobar y publicar reverso local; crear tarea externa cuando corresponda.
5. Registrar únicamente respuesta comprobada y consultar auditoría/efectos.

**Estados:** Emitida; Pendiente de trámite; Reversada localmente; Solicitud externa pendiente; Anulada fiscalmente confirmada; Rechazada. **Validaciones:** Retención debe estar emitida y pertenecer a la empresa.; No borrar XML ni modificar publicado; usar reverso.; Resolver código, base y porcentaje desde configuración vigente y snapshot.; Separar aceptación/trámite fiscal de reverso contable.; Sin canal oficial documentado, generar tarea y no simular resultado..

**Persistencia e impacto contable:** Revierte localmente la obligación tributaria y el efecto sobre CxP solo tras autorización; conserva XML, clave, documento y resultado fiscal. No recalcula con tasas hardcodeadas ni presume API pública de anulación.

**API propia propuesta:** GET /api/v1/tax/withholdings/{id}/cancellation-context; POST /api/v1/tax/withholdings/{id}/local-reversal; POST /api/v1/tax/withholding-cancellations; PATCH /api/v1/tax/withholding-cancellations/{id}/result; GET /api/v1/tax/withholding-cancellations/{id}. **Pantallas relacionadas:** XLS-053. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado una retención emitida con evidencia y flujo aprobado, cuando se confirma el reverso local y se registra una respuesta externa verificable, entonces los estados quedan separados y el XML permanece íntegro.

**Prueba negativa:** Dado que el usuario intenta confirmar anulación fiscal sin respuesta o modificar el valor publicado, cuando guarda, entonces se rechaza la acción y se conserva el estado y documento originales.

**Evidencias/pruebas exigidas:** `T-UI-XLS-053`, `T-PROC-XLS-053`, `T-NEG-XLS-053`.

### XLS-054 — Rep. Documentos Ingresados

**Ubicación original:** Contabilidad > CxP > Reportes > Rep. Documentos Ingresados. **Celda:** E85. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/reportes/rep-documentos-ingresados`.

**Objetivo y vista:** Listar documentos de compras ingresados por proveedor, fecha y estado, totalizando neto, impuestos y saldo con navegación al origen. Reporte dedicado con filtros visibles de empresa, intervalo/corte, proveedor, tipo, estado fiscal/contable y texto de clave/número.

**Campos y filtros:** Desde/hasta (fecha; requerido; rango válido); Proveedor (búsqueda; requerido; empresa activa); Estado contable/fiscal (multi-selector; requerido; valores separados); Tipo/documento (multi-selector; requerido; catálogo permitido); Corte/saldo (fecha/selector; requerido; fecha explícita para saldo).

**Columnas visibles:** Fecha; Tipo/número; Proveedor; Clave; Neto; Impuestos; Total; Pagado; Saldo; Estado; Origen.

**Acciones y permisos:** Consultar → ejecuta reporte con snapshot de filtros [permiso: reportes.cxp.consultar]; Exportar → genera archivo con mismos filtros y totales [permiso: reportes.exportar]; Abrir documento → navega a origen dedicado [permiso: reportes.cxp.navegar_origen]; Abrir asiento → navega al asiento y auxiliares [permiso: reportes.cxp.navegar_asiento]; Reimprimir soporte → copia documento sin contabilizar [permiso: reportes.cxp.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, intervalo/corte, proveedor y estados separados.
2. Ejecutar consulta y revisar filas, subtotales y documentos excluidos.
3. Abrir origen para comprobar soporte, obligación y asiento.
4. Exportar el mismo snapshot con columnas y totales conciliables.
5. Registrar filtros/usuario y volver a consultar para auditoría.

**Estados:** Sin ejecutar; Cargando; Con resultados; Sin resultados; Exportación en proceso; Error de validación. **Validaciones:** Exigir empresa y fechas/corte explícitos.; Aplicar permisos de empresa y datos sensibles.; Totales de neto, impuestos, total, pagado y saldo deben conciliar con origen.; No mezclar estado fiscal con contable.; Exportación usa idénticos filtros y snapshot; no SQL libre..

**Persistencia e impacto contable:** No genera movimientos. Lee documentos y movimientos publicados/reversos efectivos al corte; saldo deriva del auxiliar CxP y los anulados se presentan según estado, sin alterar el libro.

**API propia propuesta:** GET /api/v1/reports/cxp-documents; POST /api/v1/report-exports; GET /api/v1/cxp/support-documents/{id}; GET /api/v1/journals/{id}. **Pantallas relacionadas:** XLS-054. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un rango y proveedor con dos compras publicadas, cuando se ejecuta el reporte, entonces aparecen ambas, los totales coinciden con sus documentos y cada fila navega a origen y asiento.

**Prueba negativa:** Dado un rango invertido o empresa no autorizada, cuando se consulta, entonces se muestra error sin filtrar datos de otra empresa ni producir totales engañosos.

**Evidencias/pruebas exigidas:** `T-UI-XLS-054`, `T-PROC-XLS-054`, `T-NEG-XLS-054`.

### XLS-055 — Rep. Retenciones Emitidas

**Ubicación original:** Contabilidad > CxP > Reportes > Rep. Retenciones Emitidas. **Celda:** E86. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/reportes/rep-retenciones-emitidas`.

**Objetivo y vista:** Reportar retenciones emitidas con código, base, porcentaje configurado, valor, autorización y documento relacionado. Reporte dedicado titulado exactamente Rep.

**Campos y filtros:** Desde/hasta (fecha; requerido; rango válido); Proveedor (búsqueda; requerido; empresa activa); Estado (multi-selector; requerido; local y fiscal por separado); Código/tipo (texto/selector; requerido; catálogo configurado); Corte (fecha; requerido; fecha de consulta).

**Columnas visibles:** Código; Clave; Fecha; Proveedor; Documento relacionado; Base; Porcentaje snapshot; Valor; Autorización; Estado; Asiento.

**Acciones y permisos:** Consultar → ejecuta reporte con snapshot [permiso: reportes.retenciones.consultar]; Exportar → exporta mismas filas y totales [permiso: reportes.exportar]; Abrir retención → navega a pantalla dedicada [permiso: reportes.retenciones.origen]; Abrir documento → navega a compra/liquidación origen [permiso: reportes.cxp.navegar_origen]; Reimprimir → copia retención sin nuevo efecto [permiso: reportes.retenciones.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, rango/corte, tercero y estados separados.
2. Ejecutar y revisar código, base, porcentaje snapshot, valor y autorización.
3. Navegar al documento origen y asiento para conciliar.
4. Exportar con los mismos filtros, columnas y totales.
5. Guardar snapshot, usuario y versión de configuración usada.

**Estados:** Sin ejecutar; Cargando; Con resultados; Sin resultados; Exportación en proceso. **Validaciones:** Filtrar por empresa y fechas/corte obligatorios.; Mostrar base, porcentaje y valor almacenados en snapshot.; No recalcular valores ni hardcodear porcentajes.; Separar autorización fiscal de estado contable.; Permitir navegación solo con permisos del origen..

**Persistencia e impacto contable:** No genera efectos; consulta retenciones y sus movimientos publicados. El porcentaje mostrado es histórico/configurado para la operación y no se reemplaza por una constante actual.

**API propia propuesta:** GET /api/v1/reports/issued-withholdings; POST /api/v1/report-exports; GET /api/v1/tax/withholdings/{id}; GET /api/v1/cxp/documents/{id}. **Pantallas relacionadas:** XLS-055. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo con retenciones emitidas autorizadas, cuando se consulta el reporte, entonces cada fila contiene código, base, porcentaje snapshot, valor, autorización y vínculo al documento.

**Prueba negativa:** Dado un usuario sin permiso para la empresa o un rango inválido, cuando consulta, entonces no se devuelven datos y se muestra el error sin exponer información.

**Evidencias/pruebas exigidas:** `T-UI-XLS-055`, `T-PROC-XLS-055`, `T-NEG-XLS-055`.

### XLS-056 — Rep. de Anticipos

**Ubicación original:** Contabilidad > CxP > Reportes > Rep. de Anticipos. **Celda:** E87. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/reportes/rep-de-anticipos`.

**Objetivo y vista:** Mostrar por proveedor el anticipo original, aplicaciones, reversos y disponible al corte con trazabilidad completa. Reporte de anticipos con fecha de corte obligatoria, filtros de proveedor/estado y modo detalle por anticipo.

**Campos y filtros:** Corte (fecha; requerido; fecha comercial válida); Proveedor (búsqueda; requerido; empresa activa); Estado (multi-selector; requerido; publicado/aplicado/reversado); Incluir detalle (booleano; requerido; muestra aplicaciones y reversos); Moneda (selector; requerido; moneda de la empresa).

**Columnas visibles:** Proveedor; Anticipo; Fecha original; Original; Aplicaciones; Reversos; Disponible; Estado; Último movimiento; Origen.

**Acciones y permisos:** Consultar → calcula saldo al corte desde movimientos [permiso: reportes.anticipos.consultar]; Ver detalle → abre aplicaciones y reversos [permiso: reportes.anticipos.detalle]; Exportar → genera archivo con totales y detalle [permiso: reportes.exportar]; Abrir anticipo → navega a registro transaccional [permiso: reportes.anticipos.origen]; Reimprimir → copia comprobante sin nuevo efecto [permiso: reportes.anticipos.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, corte, proveedor, moneda y modo detalle.
2. Consultar anticipo original y movimientos efectivos hasta el corte.
3. Revisar aplicaciones, reversos, disponible y totales por proveedor.
4. Navegar a cada operación para validar asiento y soporte.
5. Exportar snapshot conciliable y registrar filtros/usuario.

**Estados:** Sin ejecutar; Cargando; Con resultados; Sin resultados; Exportación en proceso. **Validaciones:** Corte y empresa son obligatorios.; Aplicar fecha efectiva de movimientos, no fecha de consulta.; Mostrar saldos a favor y reversos por separado.; Totales de reporte deben conciliar con auxiliar bajo locks/versiones.; No permitir edición desde el reporte..

**Persistencia e impacto contable:** No contabiliza. Deriva disponible como original menos aplicaciones más reversos efectivos al corte, conservando operaciones posteriores fuera del saldo histórico.

**API propia propuesta:** GET /api/v1/reports/supplier-advances; GET /api/v1/cxp/supplier-advances/{id}/movements; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-056. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un anticipo de 100, aplicación de 40 y reverso de 10 efectivos al corte, cuando se consulta, entonces el reporte muestra original 100, aplicaciones 40, reversos 10 y disponible 70.

**Prueba negativa:** Dado un corte anterior a la fecha del movimiento o un proveedor de otra empresa, cuando se consulta, entonces el movimiento queda fuera o la consulta se rechaza sin alterar el saldo histórico.

**Evidencias/pruebas exigidas:** `T-UI-XLS-056`, `T-PROC-XLS-056`, `T-NEG-XLS-056`.

### XLS-057 — Rep. Saldo de Proveedores

**Ubicación original:** Contabilidad > CxP > Reportes > Rep. Saldo de Proveedores. **Celda:** E88. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/reportes/rep-saldo-de-proveedores`.

**Objetivo y vista:** Mostrar saldo y antigüedad de proveedores al corte, conciliable con la cuenta de control y separado de anticipos/saldos a favor. Reporte con fecha de corte obligatoria, filtros por proveedor, cuenta de control, estado y bandas configuradas.

**Campos y filtros:** Corte (fecha; requerido; fecha válida); Proveedor (búsqueda; requerido; empresa activa); Cuenta de control (selector; requerido; cuenta configurada); Bandas (configuración; requerido; versión vigente del reporte); Incluir detalle (booleano; requerido; documentos por proveedor).

**Columnas visibles:** Proveedor; Saldo total; No vencido; 0–30; 31–60; 61–90; Más de 90; Saldo a favor/anticipo; Cuenta control; Conciliación.

**Acciones y permisos:** Consultar → calcula saldo/antigüedad al corte [permiso: reportes.saldos_proveedores.consultar]; Ver detalle → abre obligaciones por vencimiento [permiso: reportes.saldos_proveedores.detalle]; Conciliar control → muestra diferencias contra cuenta contable [permiso: reportes.saldos_proveedores.conciliar]; Exportar → genera reporte con mismos filtros [permiso: reportes.exportar]; Abrir obligación → navega al auxiliar/origen [permiso: reportes.saldos_proveedores.origen].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, corte, cuenta de control y versión de bandas.
2. Calcular obligaciones y vencimiento al corte desde movimientos publicados.
3. Separar saldos a favor/anticipos y presentar totales por proveedor.
4. Revisar diferencias contra cuenta de control y abrir documentos.
5. Exportar snapshot y registrar conciliación o excepción explicada.

**Estados:** Sin ejecutar; Cargando; Con resultados; Con diferencias; Sin resultados; Exportación en proceso. **Validaciones:** Empresa, corte, cuenta y versión de bandas obligatorios.; No incluir movimientos posteriores al corte.; Conciliar con cuenta de control y mostrar diferencias, no ocultarlas.; Separar anticipos/saldos a favor de deuda vencida.; Respeta permisos y no permite editar desde el reporte..

**Persistencia e impacto contable:** No modifica saldos. Lee payable_item y asientos publicados/reversos; antigüedad se basa en vencimiento al corte y la cuenta de control se compara sin reemplazar el auxiliar.

**API propia propuesta:** GET /api/v1/reports/supplier-balances; GET /api/v1/reports/supplier-balances/{provider_id}/detail; POST /api/v1/reports/supplier-balances/reconcile; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-057. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un proveedor con una obligación no vencida y otra de 45 días, cuando se consulta al corte, entonces aparecen en no vencido y banda 31–60, con total conciliable a la cuenta de control.

**Prueba negativa:** Dado que la cuenta de control no está configurada o el corte es inválido, cuando se ejecuta, entonces se bloquea el reporte y no se presenta un saldo no conciliable.

**Evidencias/pruebas exigidas:** `T-UI-XLS-057`, `T-PROC-XLS-057`, `T-NEG-XLS-057`.

### XLS-058 — Rep. Pagos Realizados

**Ubicación original:** Contabilidad > CxP > Reportes > Rep. Pagos Realizados. **Celda:** E89. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxp/reportes/rep-pagos-realizados`.

**Objetivo y vista:** Listar pagos realizados, medio bancario, documentos cancelados y reversos, excluyendo anulados de los totales netos. Reporte dedicado con filtros de intervalo/corte, proveedor, cuenta/medio, estado y documento.

**Campos y filtros:** Desde/hasta (fecha; requerido; rango válido); Proveedor (búsqueda; requerido; empresa activa); Medio/cuenta (multi-selector; requerido; catálogo bancario); Estado (multi-selector; requerido; publicado/reversado/anulado); Corte (fecha; requerido; fecha efectiva para neto).

**Columnas visibles:** Fecha; Pago; Proveedor; Medio/cuenta; Referencia bancaria; Importe bruto; Aplicaciones; Reversos; Neto; Documentos cancelados; Estado; Conciliación.

**Acciones y permisos:** Consultar → lista pagos y netos al corte [permiso: reportes.pagos.consultar]; Ver aplicaciones → abre documentos cancelados y saldos [permiso: reportes.pagos.detalle]; Abrir pago → navega al registro transaccional [permiso: reportes.pagos.origen]; Abrir banco → navega a conciliación/extracto [permiso: reportes.pagos.banco]; Exportar → genera archivo con filtros y totales [permiso: reportes.exportar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, intervalo/corte, proveedor, cuenta y estados.
2. Consultar pagos publicados y movimientos efectivos hasta el corte.
3. Revisar medio bancario, documentos aplicados, reversos y neto.
4. Navegar a pago, asiento y conciliación para explicar diferencias.
5. Exportar snapshot y verificar que anulados no entren en totales netos.

**Estados:** Sin ejecutar; Cargando; Con resultados; Con diferencias; Sin resultados; Exportación en proceso. **Validaciones:** Intervalo/corte y empresa obligatorios.; Aplicar fecha efectiva y estados, no solo fecha de captura.; Excluir anulados de totales netos y mostrar su existencia separada.; Total de aplicaciones debe conciliar con documentos cancelados.; Exportar exactamente los filtros y columnas consultados..

**Persistencia e impacto contable:** No genera pagos ni asientos. Lee pagos y reversos publicados; el neto excluye anulados según estado y conserva el bruto, aplicaciones, documentos y evidencia bancaria para auditoría.

**API propia propuesta:** GET /api/v1/reports/cxp-payments; GET /api/v1/cxp/payments/{id}/applications; GET /api/v1/treasury/payments/{id}/reconciliation; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-058. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un pago publicado de 100 aplicado a dos documentos y un reverso posterior de 20, cuando se consulta al corte posterior, entonces el reporte muestra bruto 100, reverso 20 y neto 80 con enlaces a ambos documentos.

**Prueba negativa:** Dado un pago anulado, cuando se ejecuta el reporte neto, entonces no suma al total neto, aparece identificado como anulado y no se puede reimprimir como nuevo pago.

**Evidencias/pruebas exigidas:** `T-UI-XLS-058`, `T-PROC-XLS-058`, `T-NEG-XLS-058`.

### Procesos integrales del grupo

**Alta, clasificación e importación controlada de terceros**. Secuencia: XLS-041; XLS-042; XLS-043. Crear o seleccionar grupo, registrar proveedor reutilizando la persona, descargar plantilla y cargar roles; prevalidar, homologar duplicados, corregir filas y confirmar solo las válidas. Resultado: No genera asientos; deja terceros y perfiles proveedor/cliente disponibles para documentos, con auditoría y mapas de importación. Prueba: Dado un tercero nuevo y dos filas que lo referencian, cuando se registra, importa y confirma el lote, entonces existe una sola identidad, roles correctos y cero duplicación.

**Compra soportada, anticipo y aplicación a CxP**. Secuencia: XLS-044; XLS-045; XLS-046. Registrar/validar soporte de compra, publicar una obligación; registrar desembolso como anticipo separado del gasto y aplicar una parte o todo al payable_item bajo locks. Resultado: La compra crea deuda y asiento; el anticipo crea saldo disponible sin gasto; el cruce reduce ambos auxiliares y deja aplicación única. Prueba: Dado un proveedor, soporte válido y anticipo disponible, cuando se publica la compra y se cruza el anticipo, entonces los saldos y asientos concilian sin segunda deuda.

**Reversos controlados de anticipos y notas de crédito**. Secuencia: XLS-047; XLS-049; XLS-050. Revisar dependencias, desaplicar cuando corresponda, registrar NC vinculada, y usar reversos separados para anticipo o NC sin borrar documentos ni XML. Resultado: Los reversos deshacen efectos autorizados y conservan originales; NC ajusta obligación/impuestos y puede crear saldo a favor explícito. Prueba: Dado un anticipo aplicado y una NC publicada, cuando se resuelven dependencias y se ejecutan reversos autorizados, entonces el historial mantiene vínculos y el auxiliar queda conciliable.

**Liquidación de compras y anulaciones separadas**. Secuencia: XLS-051; XLS-052. Capturar supuesto aprobado, validar/firmar XML, transmitir por adaptador documentado, consultar resultado real y separar reverso contable de solicitud fiscal o tarea manual. Resultado: Solo la confirmación prevista publica obligación/asiento; anulación local y estado fiscal remoto permanecen separados. Prueba: Dado un XML firmado y un canal fiscal disponible o manual, cuando se procesa, entonces cada estado refleja evidencia real y no se simula autorización/anulación.

**Retención emitida, anulación y reportes de control**. Secuencia: XLS-053; XLS-054; XLS-055; XLS-056; XLS-057; XLS-058. Consultar la retención emitida, tramitar reverso fiscal/local por separado y usar los reportes para conciliar documentos, retenciones, anticipos, saldos y pagos al corte con navegación a origen. Resultado: Los reportes no contabilizan; muestran movimientos publicados y reversos efectivos. La retención solo cambia por flujo autorizado y conserva su XML. Prueba: Dado un conjunto de compras, anticipos, retenciones y pagos, cuando se consultan reportes al mismo corte, entonces totales, auxiliares y cuenta de control son conciliables y los anulados quedan fuera del neto.

## Contabilidad > CxC

### XLS-059 — Registro Clientes

**Ubicación original:** Contabilidad > CxC > Clientes > Registro Clientes. **Celda:** E92. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/clientes/registro-clientes`.

**Objetivo y vista:** Crear y mantener el tercero cliente y sus contactos sin confundir a la persona responsable con una unidad o propietario inmobiliario. Listado paginado con búsqueda por razón social, identificación y código; panel lateral de alta/edición con pestañas Identidad, perfiles por empresa, contactos, direcciones y datos de cobro.

**Campos y filtros:** empresa (selector; requerido; Empresa activa autorizada; no se permite cruzar tenant.); tipo de tercero (selector; requerido; Persona natural, sociedad u organización según catálogo configurado.); identificación (texto; requerido; Formato y unicidad validados por empresa; admitir identificación extranjera.); razón social/nombres (texto; requerido; No vacío; conservar valor histórico al versionar.); contactos (array de objetos; opcional/condicional; Cada contacto requiere medio, finalidad y preferencia válida.); direcciones (array de objetos; opcional/condicional; País y dirección mínima; sin exigir formato ecuatoriano fuera de Ecuador.); perfil cliente (booleano; requerido; Debe quedar activo para usarlo en CxC.); condominio/unidad (selector opcional; opcional/condicional; Visible y validado solo con PROPERTY_MANAGEMENT habilitado.).

**Columnas visibles:** Código; Identificación; Nombre/Razón social; Perfil cliente; Contacto principal; Estado; Última modificación.

**Acciones y permisos:** Guardar borrador → Crea versión no publicada para revisión [permiso: cxc.terceros.crear]; Activar cliente → Habilita el tercero para operaciones nuevas y registra auditoría [permiso: cxc.terceros.activar]; Editar → Crea nueva versión; no cambia snapshots históricos [permiso: cxc.terceros.editar]; Ver historial → Muestra versiones, actor y documentos congelados [permiso: cxc.terceros.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y buscar coincidencias de identificación antes de iniciar.
2. Capturar identidad, perfil cliente, contactos y direcciones; añadir contexto inmobiliario solo si aplica.
3. Validar unicidad, formatos, permisos y coincidencias de terceros existentes.
4. Guardar o enviar a aprobación según política; activar solo tras completar datos requeridos.
5. Publicar el perfil cliente y emitir evento para búsquedas de CxC.
6. Consultar el tercero y sus snapshots sin alterar documentos previos.

**Estados:** Borrador; Pendiente de aprobación; Activo; Inactivo; Bloqueado por duplicidad. **Validaciones:** Detectar coincidencia exacta y probable antes de permitir alta.; Exigir segregación cuando quien crea no puede autoaprobar.; Validar empresa activa, versión esperada y contacto principal único.; Auditar cambios de identificación y mantener snapshots inmutables..

**Persistencia e impacto contable:** No genera asiento por sí solo ni saldo de cartera. El tercero habilita referencias para receivable_item; identidad fiscal, nombre y dirección se copian como snapshot al documento o asiento de origen. La edición no reescribe facturas, cobros, retenciones ni reportes históricos. Los campos de inmueble son opcionales y no agregan FKs obligatorias al núcleo.

**API propia propuesta:** GET /api/v1/third-parties?role=customer; POST /api/v1/third-parties; PATCH /api/v1/third-parties/{id}; POST /api/v1/third-parties/{id}/activate; GET /api/v1/third-parties/{id}/history. **Pantallas relacionadas:** Ninguna opción relacionada adicional. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un tercero sin coincidencias activas, cuando el usuario completa identidad y perfil cliente válidos y guarda, entonces se crea un cliente activo o pendiente según política, queda disponible para CxC y sus datos se muestran en el historial.

**Prueba negativa:** Dado un tercero ya existente con la misma identificación en la empresa, cuando se intenta guardar otro registro, entonces se bloquea el alta, se muestra la coincidencia y no se crea duplicado ni movimiento contable.

**Evidencias/pruebas exigidas:** `T-UI-XLS-059`, `T-PROC-XLS-059`, `T-NEG-XLS-059`.

### XLS-060 — Importación Masiva de Proveedores/Clientes

**Ubicación original:** Contabilidad > CxC > Clientes > Importación Masiva de Proveedores/Clientes. **Celda:** E93. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/clientes/importacion-masiva-de-proveedores-clientes`.

**Objetivo y vista:** Importar en un único lote proveedores y clientes desde CxC, reutilizando el maestro de terceros para impedir duplicados aunque la carga se origine en CxP. Bandeja de importaciones con selector de tipo de archivo y perfil de columnas, enlace para descargar plantilla, carga multipart, resumen de filas y tabla de errores descargable.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada del lote.); archivo (archivo CSV/XLSX; requerido; Extensión, tamaño, hash e identificación de plantilla permitidos.); roles a importar (multiselección; requerido; Cliente, proveedor o ambos; al menos uno.); modo de coincidencia (selector; requerido; Identificación/código; reglas visibles y no destructivas.); hoja y encabezados (selector/texto; opcional/condicional; Coinciden con la plantilla versionada.); fecha de corte (fecha; opcional/condicional; Requerida para datos históricos; no puede preceder política de migración.); confirmar filas válidas (booleano; requerido; Solo después de revisar el resumen; nunca confirma rechazadas.).

**Columnas visibles:** Fila; Identificación; Nombre; Roles; Resultado; Código creado/encontrado; Detalle de error.

**Acciones y permisos:** Descargar plantilla → Entrega plantilla versionada con ejemplo no productivo [permiso: cxc.migracion.plantilla]; Prevalidar → Crea lote y clasifica filas sin crear terceros activos [permiso: cxc.migracion.importar]; Homologar → Asocia coincidencias o solicita decisión por fila [permiso: cxc.migracion.homologar]; Confirmar válidas → Crea o actualiza perfiles permitidos con resumen [permiso: cxc.migracion.confirmar]; Reintentar errores → Procesa solo filas corregidas con mismo lote/hash [permiso: cxc.migracion.reintentar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Cargado; Prevalidando; Con errores; Listo para confirmar; Confirmado parcial; Confirmado; Fallido. **Validaciones:** Validar encabezados, tipos, obligatorios y duplicados internos.; Detectar duplicados contra maestro por empresa e identificación.; No actualizar datos sensibles existentes sin regla y evidencia.; Rechazar filas con terceros ambiguos hasta homologación explícita.; Registrar hash, usuario, plantilla, errores y conteos por estado..

**Persistencia e impacto contable:** La prevalidación no contabiliza. La confirmación puede crear terceros y perfiles cliente/proveedor, pero no genera ventas, compras, cobros ni saldos. Si existe un tercero coincidente, se reutiliza su identidad y se agrega el perfil autorizado; se registra mapa de fila a UUID. Un reintento no duplica terceros ni efectos auxiliares.

**API propia propuesta:** POST /api/v1/imports/third-parties; GET /api/v1/imports/{id}; POST /api/v1/imports/{id}/homologations; POST /api/v1/imports/{id}/confirm; POST /api/v1/imports/{id}/retry. **Pantallas relacionadas:** XLS-059. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un archivo válido con una fila nueva y otra coincidente, cuando se prevalidan, homologan y confirman, entonces se crea un solo tercero nuevo, se reutiliza el coincidente, se asignan roles y el lote queda conciliado sin duplicados.

**Prueba negativa:** Dado un archivo reintentado con la misma fila ya confirmada, cuando se pulsa reintentar, entonces la fila se omite como idempotente; si una fila tiene identificación inválida, queda rechazada con error por fila y no afecta a las demás.

**Evidencias/pruebas exigidas:** `T-UI-XLS-060`, `T-PROC-XLS-060`, `T-NEG-XLS-060`.

### XLS-061 — Ingreso de Recaudación

**Ubicación original:** Contabilidad > CxC > Recaudaciones > Ingreso de Recaudación. **Celda:** E95. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/recaudaciones/ingreso-de-recaudacion`.

**Objetivo y vista:** Registrar un ingreso de recaudación en caja, banco, transferencia, depósito identificado o cheque, permitiendo aplicar parcialmente a una o varias obligaciones del mismo tercero y dejando el excedente como anticipo. Pantalla transaccional con encabezado de empresa, tercero, fecha comercial y recibo; grilla de medios de pago y grilla de aplicaciones a receivable_item con saldo antes/después.

**Campos y filtros:** empresa (selector; requerido; Empresa activa y periodo abierto.); tercero (búsqueda; requerido; Cliente activo en la empresa.); fecha de cobro (fecha; requerido; Dentro de periodo abierto; no futura según política.); medio de pago (selector; requerido; Caja, banco, transferencia, depósito o cheque recibido.); importe (decimal; requerido; Mayor que cero; precisión monetaria del backend.); aplicaciones (array de documentos; opcional/condicional; Mismo tercero/empresa, sin superar saldo aplicable.); soporte (archivo/referencia; opcional/condicional; Hash y tipo de soporte cuando corresponda.); cheque posfechado (objeto opcional; opcional/condicional; Número, banco, vencimiento y custodia si aplica.).

**Columnas visibles:** Número recibo; Fecha; Cliente; Total recibido; Aplicado; Anticipo; Medio; Estado.

**Acciones y permisos:** Guardar borrador → Conserva captura sin asiento publicado [permiso: cxc.recaudaciones.crear]; Previsualizar asiento → Calcula cuentas y diferencias sin publicar [permiso: cxc.recaudaciones.previsualizar]; Confirmar cobro → Publica cobro, aplicaciones y anticipo en una transacción [permiso: cxc.recaudaciones.confirmar]; Reimprimir → Abre representación del mismo recibo sin contabilizar [permiso: cxc.recaudaciones.reimprimir]; Anular → Envía al flujo separado de reverso sujeto a dependencias [permiso: cxc.recaudaciones.anular].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Borrador; Pendiente de aprobación; Confirmado; Aplicado parcial; Anticipo disponible; Reversado; Bloqueado por conciliación. **Validaciones:** Verificar periodo abierto, empresa y tercero.; Impedir aplicación mayor al saldo disponible bajo bloqueo.; Exigir suma de medios igual al total recibido.; Validar idempotency key y versión de cada obligación.; No considerar cheque no compensado como efectivo disponible.; Exigir soporte y aprobación si la política lo determina..

**Persistencia e impacto contable:** Publica débito a caja/banco o cuenta puente según medio y crédito a cartera por aplicaciones; el excedente acredita anticipos de cliente, no ingresos nuevos. Cada aplicación actualiza el saldo canónico bajo lock y versionado. El asiento, recibo y aplicaciones se publican juntos; no requiere inmueble ni alícuota.

**API propia propuesta:** GET /api/v1/receivables/items?third_party_id={id}; POST /api/v1/receipts; POST /api/v1/receipts/{id}/preview; POST /api/v1/receipts/{id}/confirm; GET /api/v1/receipts/{id}. **Pantallas relacionadas:** XLS-059. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un cliente con dos obligaciones abiertas y un cobro superior a una de ellas, cuando se aplican importes parciales y se confirma, entonces se publica un asiento balanceado, se actualizan ambas obligaciones y el remanente queda como anticipo consultable.

**Prueba negativa:** Dado un doble clic o una segunda confirmación con la misma clave, cuando el servidor procesa la solicitud, entonces devuelve el recibo ya confirmado sin duplicar asiento, aplicaciones ni anticipo; una aplicación que excede saldo es rechazada atómicamente.

**Evidencias/pruebas exigidas:** `T-UI-XLS-061`, `T-PROC-XLS-061`, `T-NEG-XLS-061`.

### XLS-062 — Reimpresión de Recuadación

**Ubicación original:** Contabilidad > CxC > Recaudaciones > Reimpresión de Recuadación. **Celda:** E96. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/recaudaciones/reimpresion-de-recuadacion`.

**Objetivo y vista:** Reimprimir el comprobante de recaudación conservando número, aplicaciones, medios de pago, soportes visibles y marca de reversado cuando exista. Bandeja de búsqueda por número, cliente, rango de fechas, medio y estado; vista previa del recibo con versión imprimible/PDF, código de verificación interno, desglose de aplicaciones, anticipo y reversos.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); número de recibo (texto; opcional/condicional; Coincidencia exacta o parcial normalizada.); tercero (búsqueda; opcional/condicional; Solo clientes visibles para la empresa.); desde/hasta (rango de fechas; opcional/condicional; Rango válido y limitado por permiso.); medio (selector; opcional/condicional; Filtra medio original.); estado (multiselección; opcional/condicional; Incluye confirmado, reversado y parcial.); motivo de reimpresión (texto; requerido; Obligatorio para auditoría; no altera documento.).

**Columnas visibles:** Número; Fecha; Cliente; Aplicaciones; Anticipo; Medio; Estado contable; Estado fiscal; Última impresión.

**Acciones y permisos:** Buscar → Lista recibos autorizados para consulta [permiso: cxc.recaudaciones.consultar]; Ver detalle → Muestra snapshot y trazabilidad completa [permiso: cxc.recaudaciones.consultar]; Reimprimir → Genera copia identificada como reimpresión y audita actor [permiso: cxc.recaudaciones.reimprimir]; Descargar → Entrega archivo temporal con control de acceso [permiso: cxc.recaudaciones.reimprimir].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Confirmado; Aplicado parcial; Anticipo; Reversado; No encontrado. **Validaciones:** Aplicar filtros con alcance de empresa y permisos.; Bloquear edición de importes, tercero, fecha y aplicaciones desde esta pantalla.; Marcar claramente reversado y enlazar el reverso.; No ejecutar endpoints de confirmación desde la acción de impresión.; Auditar cada generación y permitir trazabilidad del archivo..

**Persistencia e impacto contable:** No hay impacto contable, fiscal ni de saldo. Se registra evento de consulta/reimpresión, usuario, fecha, motivo, versión de plantilla y hash del archivo generado. El documento refleja el estado actual e histórico del recibo, pero no reejecuta sus aplicaciones ni vuelve a publicar movimientos.

**API propia propuesta:** GET /api/v1/receipts; GET /api/v1/receipts/{id}; POST /api/v1/receipts/{id}/reprints. **Pantallas relacionadas:** XLS-061. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un recibo confirmado con una aplicación y anticipo, cuando el usuario autorizado solicita reimpresión, entonces se genera una copia con los mismos importes y una marca de reimpresión, sin nuevo asiento ni cambio de saldo.

**Prueba negativa:** Dado un recibo inexistente o un usuario sin permiso, cuando se consulta o se intenta descargar, entonces no se revela información y se devuelve resultado controlado sin generar archivo ni evento contable.

**Evidencias/pruebas exigidas:** `T-UI-XLS-062`, `T-PROC-XLS-062`, `T-NEG-XLS-062`.

### XLS-063 — Anulación de de Recuadación

**Ubicación original:** Contabilidad > CxC > Recaudaciones > Anulación de de Recuadación. **Celda:** E97. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/recaudaciones/anulacion-de-de-recuadacion`.

**Objetivo y vista:** Reversar una recaudación y sus aplicaciones de forma atómica, verificando primero dependencias como depósito o conciliación bancaria. Pantalla dedicada de búsqueda y reverso: resumen inmutable del recibo, aplicaciones, medio, depósitos/conciliaciones dependientes y documentos relacionados.

**Campos y filtros:** recibo (búsqueda; requerido; Debe estar confirmado y pertenecer a empresa activa.); motivo (selector/texto; requerido; Catálogo de motivos y explicación mínima.); fecha efectiva (fecha; requerido; Periodo abierto y no anterior a dependencias válidas.); evidencia (archivo; requerido; Soporte con hash y tipo.); resolver dependencias (checkbox; requerido; No permite continuar si depósito/conciliación sigue activo.); aprobador (usuario; requerido; Segregación y permiso según importe.); comentario fiscal (texto; opcional/condicional; Solo seguimiento; no ejecuta anulación fiscal automáticamente.).

**Columnas visibles:** Recibo; Estado; Aplicado; Anticipo; Depósito relacionado; Conciliación; Reverso.

**Acciones y permisos:** Evaluar dependencias → Identifica operaciones bancarias que deben resolverse primero [permiso: cxc.recaudaciones.anular]; Previsualizar reverso → Muestra aplicaciones y cuentas a restituir [permiso: cxc.recaudaciones.anular]; Solicitar aprobación → Crea solicitud con evidencia y hash [permiso: cxc.recaudaciones.aprobar]; Confirmar reverso → Revierte cobro y aplicaciones atómicamente [permiso: cxc.recaudaciones.anular]; Consultar resultado → Enlaza recibo, reverso y tareas fiscales separadas [permiso: cxc.recaudaciones.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Elegible; Dependencia pendiente; Aprobación pendiente; Reversado; Rechazado; Bloqueado. **Validaciones:** Bloquear recibos ya reversados o con periodo cerrado.; Comprobar dependencia bancaria y conciliación antes de publicar.; Exigir motivo, soporte, aprobación e idempotencia.; Mantener enlace original-reverso y no editar asiento publicado.; Recalcular saldos bajo lock y verificar balance cero de la operación..

**Persistencia e impacto contable:** Publica un asiento reverso enlazado al original y revierte aplicaciones para restituir cartera y/o anticipo. Si el medio ya impactó banco conciliado, la operación se bloquea hasta resolver esa dependencia. El efecto fiscal, si corresponde, se registra como estado independiente; no se presenta como autorización automática.

**API propia propuesta:** GET /api/v1/receipts/{id}/reversal-impact; POST /api/v1/receipts/{id}/reversal-preview; POST /api/v1/receipts/{id}/reversal-requests; POST /api/v1/receipts/{id}/reverse; GET /api/v1/receipts/{id}/dependencies. **Pantallas relacionadas:** XLS-061; XLS-064. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un recibo confirmado no depositado con aplicaciones, cuando el aprobador confirma el reverso, entonces las aplicaciones se deshacen en una transacción, el saldo de cartera/anticipo se restituye y queda un asiento reverso enlazado.

**Prueba negativa:** Dado un recibo incluido en una conciliación cerrada, cuando se solicita anulación, entonces la pantalla muestra la dependencia y bloquea la publicación; no modifica saldos ni crea un reverso parcial.

**Evidencias/pruebas exigidas:** `T-UI-XLS-063`, `T-PROC-XLS-063`, `T-NEG-XLS-063`.

### XLS-064 — Registro de Cheques a Fecha

**Ubicación original:** Contabilidad > CxC > Recaudaciones > Registro de Cheques a Fecha. **Celda:** E98. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/recaudaciones/registro-de-cheques-a-fecha`.

**Objetivo y vista:** Registrar y custodiar cheques posfechados recibidos, con vencimiento, banco, responsable y estados separados del efectivo disponible. Bandeja de cheques con filtros por custodia, vencimiento y cliente; formulario con número, banco, importe y cuenta puente; línea de tiempo Custodia–Posfechado–Depositado–Compensado/Devuelto.

**Campos y filtros:** empresa (selector; requerido; Empresa activa.); cliente (búsqueda; requerido; Tercero cliente activo.); número de cheque (texto; requerido; Único por banco/emisor/empresa según regla.); banco emisor (texto/selector; requerido; Catálogo o texto homologado.); importe (decimal; requerido; Mayor que cero y coincidente con medio de pago.); fecha de vencimiento (fecha; requerido; Posterior o igual a fecha de recepción.); custodio (usuario; requerido; Usuario con custodia asignada.); recibo relacionado (referencia; opcional/condicional; Debe pertenecer al mismo cliente y empresa.).

**Columnas visibles:** Cheque; Cliente; Importe; Vencimiento; Custodio; Estado; Recibo; Depósito.

**Acciones y permisos:** Registrar → Crea cheque en custodia y cuenta puente [permiso: tesoreria.cheques.recibidos.crear]; Depositar → Enlaza depósito y cambia custodia, sin nuevo ingreso [permiso: tesoreria.cheques.recibidos.depositar]; Marcar compensado → Confirma disponibilidad según conciliación [permiso: tesoreria.cheques.recibidos.compensar]; Marcar devuelto → Registra devolución y tarea de cobranza [permiso: tesoreria.cheques.recibidos.devolver]; Consultar → Muestra eventos y recibo relacionado [permiso: tesoreria.cheques.recibidos.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Custodia; Posfechado; Depositado; Compensado; Devuelto; Reversado. **Validaciones:** Validar unicidad, fechas, importe y vínculo al recibo.; No permitir estado compensado sin evidencia bancaria o conciliación.; Separar dirección RECEIVED de cheques emitidos.; Impedir editar importe o emisor después de depositar; usar corrección autorizada.; Aplicar transición idempotente y auditar custodios..

**Persistencia e impacto contable:** El registro inicial usa una cuenta puente/no disponible definida por configuración y no reconoce efectivo compensado. Depositar traslada fondos en tránsito sin generar ingreso. Compensar puede reclasificar según plantilla aprobada. Devolver conserva historial y habilita gestión posterior; no se duplica el cobro ni se edita el recibo original.

**API propia propuesta:** POST /api/v1/treasury/received-cheques; PATCH /api/v1/treasury/received-cheques/{id}/deposit; POST /api/v1/treasury/received-cheques/{id}/clear; POST /api/v1/treasury/received-cheques/{id}/return; GET /api/v1/treasury/received-cheques. **Pantallas relacionadas:** XLS-061; XLS-063. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un cheque posfechado recibido como medio de un cobro, cuando se registra y luego se deposita, entonces queda en custodia/depósito, no aumenta efectivo disponible antes de compensación y conserva trazabilidad al recibo.

**Prueba negativa:** Dado un cheque ya compensado, cuando se intenta editar importe o retrocederlo directamente a custodia, entonces se bloquea la edición y se exige un flujo de devolución/reverso con evidencia.

**Evidencias/pruebas exigidas:** `T-UI-XLS-064`, `T-PROC-XLS-064`, `T-NEG-XLS-064`.

### XLS-065 — Cruce de Anticipos Clientes

**Ubicación original:** Contabilidad > CxC > Ajustes > Cruce de Anticipos Clientes. **Celda:** E100. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/ajustes/cruce-de-anticipos-clientes`.

**Objetivo y vista:** Aplicar un anticipo disponible de cliente contra uno o varios cargos del mismo responsable y empresa, con bloqueo concurrente, límite de saldo y trazabilidad completa del cruce. Pantalla de cruce con selección de cliente, panel de anticipos disponibles y panel de documentos elegibles.

**Campos y filtros:** empresa (selector; requerido; Empresa activa y periodo abierto.); cliente (búsqueda; requerido; Mismo responsable del anticipo y documentos.); anticipo (selector; requerido; Saldo disponible positivo y no bloqueado.); documentos destino (array; requerido; Obligaciones del mismo tercero/empresa.); importe por documento (array decimal; requerido; Suma no supera anticipo ni saldo destino.); fecha efectiva (fecha; requerido; Válida para corte y periodo abierto.); motivo (texto; requerido; Explica cruce manual si aplica.).

**Columnas visibles:** Anticipo; Documento destino; Saldo anticipo antes; Aplicado; Saldo destino antes; Saldo después; Estado.

**Acciones y permisos:** Cargar saldos → Recupera anticipos y obligaciones bajo versión [permiso: cxc.anticipos.consultar]; Previsualizar cruce → Calcula aplicaciones y cuentas sin publicar [permiso: cxc.anticipos.previsualizar]; Confirmar cruce → Publica aplicación atómica con locks [permiso: cxc.anticipos.cruzar]; Reimprimir constancia → Genera evidencia sin contabilizar [permiso: cxc.anticipos.reimprimir]; Anular cruce → Abre reverso específico del cruce [permiso: cxc.anticipos.anular].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Borrador; Elegible; Aprobación pendiente; Aplicado parcial; Aplicado total; Reversado; Rechazado. **Validaciones:** Bloquear filas de anticipo y destino durante confirmación.; Validar tercero, empresa, moneda y saldo actual.; Rechazar suma mayor que cualquier límite bajo lock.; No permitir cruce contra documento anulado o cerrado.; Respetar idempotency key y conservar aplicaciones históricas..

**Persistencia e impacto contable:** Reduce el saldo disponible del anticipo y la obligación destino mediante settlement_application, sin generar ingreso o efectivo nuevo. El asiento mueve el crédito de anticipos a cartera según la plantilla aprobada; la operación queda enlazada a ambos auxiliares. No requiere inmueble, condominio ni alícuota.

**API propia propuesta:** GET /api/v1/customer-advances?available=true; GET /api/v1/receivables/items?eligible_for_advance=true; POST /api/v1/advance-crossings/preview; POST /api/v1/advance-crossings; GET /api/v1/advance-crossings/{id}. **Pantallas relacionadas:** XLS-061; XLS-066; XLS-067. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un anticipo con saldo disponible y dos obligaciones del mismo cliente, cuando se aplican importes dentro de ambos saldos y se confirma, entonces el anticipo disminuye, las obligaciones se reducen y el asiento de traslado queda balanceado y trazable.

**Prueba negativa:** Dado que otro usuario consume el anticipo antes de confirmar, cuando se intenta cruzar el importe original, entonces la versión no coincide, se rechaza todo el lote y no queda aplicación parcial.

**Evidencias/pruebas exigidas:** `T-UI-XLS-065`, `T-PROC-XLS-065`, `T-NEG-XLS-065`.

### XLS-066 — Anulación de Anticipos Clientes

**Ubicación original:** Contabilidad > CxC > Ajustes > Anulación de Anticipos Clientes. **Celda:** E101. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/ajustes/anulacion-de-anticipos-clientes`.

**Objetivo y vista:** Reversar un anticipo recibido respetando sus aplicaciones y movimientos bancarios relacionados. Pantalla de búsqueda de anticipos recibidos con resumen de cobro origen, saldo disponible, aplicaciones, medio y dependencias bancarias.

**Campos y filtros:** anticipo (búsqueda; requerido; Debe existir y pertenecer a empresa activa.); motivo (selector/texto; requerido; Motivo catalogado y comentario.); evidencia (archivo; requerido; Soporte obligatorio con hash.); fecha efectiva (fecha; requerido; Periodo abierto y válida para dependencias.); aplicaciones (solo lectura; requerido; Se muestran todas y su estado.); dependencias bancarias (solo lectura; requerido; Depósito/conciliación que condiciona el reverso.); aprobador (usuario; requerido; Permiso y segregación aplicables.).

**Columnas visibles:** Anticipo; Recibido; Aplicado; Disponible; Banco/depósito; Estado; Reverso.

**Acciones y permisos:** Analizar impacto → Calcula saldo, aplicaciones y dependencias [permiso: cxc.anticipos.anular]; Solicitar aprobación → Registra solicitud y evidencia [permiso: cxc.anticipos.aprobar]; Previsualizar reverso → Muestra asiento y restituciones [permiso: cxc.anticipos.anular]; Confirmar reverso → Revierte el origen según reglas atómicas [permiso: cxc.anticipos.anular]; Consultar → Navega al cobro, cruces y reverso [permiso: cxc.anticipos.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Elegible; Dependencia pendiente; Aprobación pendiente; Reversado parcial; Reversado total; Rechazado. **Validaciones:** Validar saldo, aplicaciones, reversos previos y periodo.; Bloquear publicación con dependencia bancaria no resuelta.; Exigir aprobación, evidencia e idempotencia.; Recalcular auxiliares bajo lock y comprobar balance.; Mantener relación origen-reverso y auditoría completa..

**Persistencia e impacto contable:** El reverso reduce o elimina el saldo de anticipo y revierte el efecto del recibo origen, restituyendo aplicaciones solo cuando el flujo lo permite. Si hubo cruces, se enlazan al proceso de anulación de cruce; si hubo banco conciliado, se bloquea hasta resolverlo. Nunca se elimina el asiento publicado.

**API propia propuesta:** GET /api/v1/customer-advances/{id}/reversal-impact; POST /api/v1/customer-advances/{id}/reversal-preview; POST /api/v1/customer-advances/{id}/reversal-requests; POST /api/v1/customer-advances/{id}/reverse. **Pantallas relacionadas:** XLS-061; XLS-065; XLS-067. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un anticipo parcialmente disponible sin dependencia bancaria pendiente, cuando se aprueba su reverso, entonces se reversa el origen y el saldo auxiliar queda consistente, con asiento enlazado y aplicaciones históricas intactas.

**Prueba negativa:** Dado un anticipo ya aplicado mediante un cruce no revertido, cuando se solicita anulación directa, entonces se bloquea y se dirige al flujo de anulación de cruces sin crear reverso incompleto.

**Evidencias/pruebas exigidas:** `T-UI-XLS-066`, `T-PROC-XLS-066`, `T-NEG-XLS-066`.

### XLS-067 — Anulación Cruce de Anticipos Clientes

**Ubicación original:** Contabilidad > CxC > Ajustes > Anulación Cruce de Anticipos Clientes. **Celda:** E102. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/ajustes/anulacion-cruce-de-anticipos-clientes`.

**Objetivo y vista:** Reversar específicamente la aplicación de un anticipo a documentos de cliente, restituyendo deuda y saldo disponible sin duplicar cobro ni alterar el recibo original. Pantalla enfocada en cruces confirmados: filtros por anticipo, cliente, documento, fecha y estado; detalle de líneas con importe aplicado, saldo antes/después y asiento.

**Campos y filtros:** cruce (búsqueda; requerido; Cruce confirmado y no reversado.); líneas a revertir (multiselección; requerido; Solo aplicaciones elegibles.); motivo (texto; requerido; Explicación de reverso.); evidencia (archivo; requerido; Soporte con hash.); fecha efectiva (fecha; requerido; Periodo abierto.); aprobador (usuario; requerido; Permiso de reverso y segregación.); referencia bancaria (texto; opcional/condicional; Requerida si existe dependencia bancaria.).

**Columnas visibles:** Cruce; Anticipo; Documento; Aplicado; Saldo anticipo antes/después; Saldo documento antes/después; Estado.

**Acciones y permisos:** Seleccionar líneas → Carga líneas y valida elegibilidad [permiso: cxc.anticipos.cruces.consultar]; Previsualizar → Calcula restitución y reverso [permiso: cxc.anticipos.cruces.previsualizar]; Solicitar aprobación → Crea solicitud con evidencia [permiso: cxc.anticipos.aprobar]; Confirmar anulación → Revierte aplicación atómicamente [permiso: cxc.anticipos.cruces.anular]; Consultar origen → Navega a anticipo y documentos [permiso: cxc.anticipos.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Confirmado; Parcialmente reversible; Aprobación pendiente; Reversado; Bloqueado; Rechazado. **Validaciones:** Bloquear cruce ya revertido o incluido en cierre incompatible.; Verificar versión y saldo con lock.; No permitir importe superior al aplicado.; Exigir motivo, evidencia y aprobación.; Validar que el asiento inverso balancee y enlace al original..

**Persistencia e impacto contable:** Revierte settlement_application y publica el asiento inverso: el anticipo recupera disponibilidad y el documento destino recupera saldo exigible. El cobro origen permanece confirmado salvo que un flujo separado lo anule. No se modifica ni borra el asiento original y se preservan cortes históricos.

**API propia propuesta:** GET /api/v1/advance-crossings/{id}; POST /api/v1/advance-crossings/{id}/reversal-preview; POST /api/v1/advance-crossings/{id}/reversal-requests; POST /api/v1/advance-crossings/{id}/reverse. **Pantallas relacionadas:** XLS-065; XLS-066. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un cruce confirmado de 100 a una factura, cuando se revierte esa línea con aprobación, entonces el anticipo aumenta 100, la factura recupera 100 y se publica un reverso enlazado sin nuevo cobro.

**Prueba negativa:** Dado que la línea fue revertida previamente, cuando se intenta anularla de nuevo, entonces la pantalla rechaza la operación idempotentemente y no cambia ningún auxiliar.

**Evidencias/pruebas exigidas:** `T-UI-XLS-067`, `T-PROC-XLS-067`, `T-NEG-XLS-067`.

### XLS-068 — Ajuste de Cartera

**Ubicación original:** Contabilidad > CxC > Ajustes > Ajuste de Cartera. **Celda:** E103. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/ajustes/ajuste-de-cartera`.

**Objetivo y vista:** Registrar un ajuste de cartera con motivo, evidencia, cuenta y aprobación proporcional al importe, distinguiendo castigo, condonación, diferencia de redondeo u otra categoría aprobada. Formulario transaccional con selección de obligación, tipo de ajuste, importe, fecha y cuenta contrapartida parametrizada.

**Campos y filtros:** empresa (selector; requerido; Empresa y periodo abierto.); obligación (búsqueda; requerido; Receivable_item vigente.); tipo de ajuste (selector; requerido; Catálogo aprobado; no usar texto libre como categoría.); importe (decimal; requerido; Mayor que cero y dentro del saldo/regla del tipo.); cuenta contrapartida (selector; requerido; Cuenta imputable autorizada.); motivo (texto; requerido; Justificación suficiente.); evidencia (archivo; requerido; Documento con hash.); fecha efectiva (fecha; requerido; Válida para el corte.).

**Columnas visibles:** Ajuste; Cliente; Documento; Tipo; Importe; Cuenta; Aprobación; Estado.

**Acciones y permisos:** Previsualizar → Muestra impacto en auxiliar y asiento [permiso: cxc.ajustes.previsualizar]; Solicitar → Envía a aprobación con snapshot [permiso: cxc.ajustes.crear]; Aprobar → Aprueba según umbral y segregación [permiso: cxc.ajustes.aprobar]; Publicar → Registra ajuste y asiento una vez [permiso: cxc.ajustes.publicar]; Reversar → Abre reverso enlazado; no edita publicado [permiso: cxc.ajustes.reversar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Borrador; Aprobación 1; Aprobación 2; Publicado; Reversado; Rechazado. **Validaciones:** Validar categoría, cuenta, importe, periodo y saldo.; Aplicar umbral configurable sin hardcodear políticas.; Impedir autoaprobación y cambios después de aprobar.; No permitir publicar en periodo cerrado.; Verificar asiento balanceado e idempotencia..

**Persistencia e impacto contable:** Ajusta el saldo de cartera y publica contrapartida conforme a la plantilla de la categoría. No cambia directamente el importe original de la factura. El ajuste queda trazable al documento, cuenta, evidencia y aprobaciones; un error posterior se corrige con reverso, respetando cierres.

**API propia propuesta:** POST /api/v1/receivable-adjustments/preview; POST /api/v1/receivable-adjustments; POST /api/v1/receivable-adjustments/{id}/approve; POST /api/v1/receivable-adjustments/{id}/post; POST /api/v1/receivable-adjustments/{id}/reverse. **Pantallas relacionadas:** XLS-074; XLS-080. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un documento abierto y un ajuste aprobado con evidencia y cuenta válida, cuando se publica, entonces el saldo de cartera y el asiento se actualizan una sola vez y el historial muestra la regla y aprobadores.

**Prueba negativa:** Dado un importe fuera del límite o una cuenta no imputable, cuando se intenta aprobar/publicar, entonces se rechaza la solicitud completa y no se modifica cartera ni mayor.

**Evidencias/pruebas exigidas:** `T-UI-XLS-068`, `T-PROC-XLS-068`, `T-NEG-XLS-068`.

### XLS-069 — Migración Anticipos Clientes

**Ubicación original:** Contabilidad > CxC > Ajustes > Migración Anticipos Clientes. **Celda:** E104. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/ajustes/migracion-anticipos-clientes`.

**Objetivo y vista:** Migrar anticipos de clientes existentes al corte, preservando fecha, tercero, importe, saldo y referencias históricas, y conciliándolos contra un asiento inicial único. Asistente por etapas: plantilla, carga, prevalidación, homologación de terceros/cuentas, conciliación y confirmación.

**Campos y filtros:** empresa (selector; requerido; Empresa destino autorizada.); archivo (CSV/XLSX; requerido; Plantilla versionada con hash.); fecha de corte (fecha; requerido; Define saldo inicial y debe estar en periodo de migración.); tercero origen (texto; requerido; Identificación o clave a homologar.); saldo recibido (decimal; requerido; No negativo y con precisión monetaria.); fecha original (fecha; requerido; No posterior al corte sin justificación.); cuenta inicial (selector; requerido; Cuenta aprobada para contrapartida.); soportes (archivo/array; opcional/condicional; Referencias históricas opcionales.).

**Columnas visibles:** Fila; Tercero origen; Tercero homologado; Saldo; Fecha; Estado; Error; Mapa.

**Acciones y permisos:** Descargar plantilla → Entrega campos y reglas de corte [permiso: cxc.migracion.plantilla]; Cargar/prevalidar → Clasifica filas sin asiento [permiso: cxc.migracion.importar]; Homologar → Resuelve terceros y cuentas ambiguos [permiso: cxc.migracion.homologar]; Conciliar → Compara total de filas con asiento inicial [permiso: cxc.migracion.conciliar]; Confirmar → Crea anticipos y publica un asiento único [permiso: cxc.migracion.confirmar]; Reintentar → Procesa correcciones sin duplicar [permiso: cxc.migracion.reintentar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Cargado; Con errores; Homologación pendiente; Conciliado; Confirmado; Confirmado parcial; Fallido. **Validaciones:** Validar corte, fechas, identificaciones y saldos.; Exigir suma de filas igual al asiento inicial propuesto.; No permitir confirmar filas sin tercero/cuenta homologados.; Registrar origen, hash, actor y mapa de IDs.; Usar idempotencia por lote y fila..

**Persistencia e impacto contable:** Antes de confirmar no hay impacto. Al confirmar, se crean saldos de anticipos con fecha y origen migratorio, y un asiento inicial único balanceado contra la cuenta aprobada. Las filas confirmadas no se vuelven a contabilizar en reintentos. Los anticipos quedan disponibles para cruces posteriores y no se presentan como recaudaciones del periodo actual.

**API propia propuesta:** POST /api/v1/imports/customer-advances; GET /api/v1/imports/{id}; POST /api/v1/imports/{id}/homologations; POST /api/v1/imports/{id}/reconcile; POST /api/v1/imports/{id}/confirm. **Pantallas relacionadas:** XLS-059; XLS-065. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un lote válido con dos anticipos homologados y total conciliado, cuando se confirma, entonces se crean dos saldos con sus fechas originales y un solo asiento inicial balanceado, sin duplicación en un reintento.

**Prueba negativa:** Dado que el total de filas no coincide con el asiento o falta homologar un tercero, cuando se intenta confirmar, entonces el lote queda bloqueado, muestra diferencias y no crea anticipos ni asiento parcial.

**Evidencias/pruebas exigidas:** `T-UI-XLS-069`, `T-PROC-XLS-069`, `T-NEG-XLS-069`.

### XLS-070 — Facturación

**Ubicación original:** Contabilidad > CxC > Comprobantes de Venta > Facturación. **Celda:** E106. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/comprobantes-de-venta/facturacion`.

**Objetivo y vista:** Crear una factura de venta desde una operación aprobada, con cálculo basado en catálogo tributario vigente y configuración por empresa, firma y transmisión XML/RIDE real cuando esté habilitada. Pantalla de factura con encabezado de cliente, líneas de productos/servicios, impuestos calculados desde configuración versionada, vencimiento y forma de pago.

**Campos y filtros:** empresa (selector; requerido; Perfil tributario y secuencial configurados.); cliente (búsqueda; requerido; Identificación y snapshot fiscal válidos.); fecha emisión (fecha; requerido; Periodo abierto y secuencial disponible.); líneas (array de objetos; requerido; Producto/servicio, cantidad, precio y tratamiento fiscal.); condición de pago (selector; requerido; Contado/crédito y vencimiento coherentes.); impuestos (calculado; requerido; Tarifa y retención desde matriz vigente; no editable como constante.); soportes (archivo/array; opcional/condicional; Evidencia operacional.); XML/RIDE (artefactos; opcional/condicional; Solo tras generación/firma/autorización reales.).

**Columnas visibles:** Número; Cliente; Fecha; Subtotal; Impuestos; Total; Estado contable; Estado fiscal; Vencimiento.

**Acciones y permisos:** Guardar borrador → Conserva documento sin publicar [permiso: ventas.facturas.crear]; Validar/preview → Calcula impuestos, asiento y XML candidato [permiso: ventas.facturas.previsualizar]; Emitir → Publica contabilidad e inicia flujo fiscal real [permiso: ventas.facturas.emitir]; Consultar XML/RIDE → Descarga artefactos disponibles y respuestas [permiso: tributacion.documentos.consultar]; Reversar/anular → Abre flujos separados según estado [permiso: ventas.facturas.anular].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Borrador; Validada; Contable publicada; Fiscal pendiente; Enviada; Autorizada; No autorizada; Reversada. **Validaciones:** Validar secuencial, identificación, periodo, líneas y total.; Recalcular en backend con Decimal y matriz vigente.; Validar firma, XSD, respuesta y autorización por separado.; No publicar sin cuentas y snapshot completos.; No crear segunda obligación al reintentar transmisión..

**Persistencia e impacto contable:** Al emitir se crea o vincula una única obligación receivable_item, se publica ingreso/impuestos con cuentas configuradas y se conserva snapshot fiscal. Estado contable y fiscal son independientes: una falla externa no borra el asiento. Las tarifas nunca se codifican en pantalla; provienen de vigencia aprobada.

**API propia propuesta:** POST /api/v1/sales/invoices/preview; POST /api/v1/sales/invoices; POST /api/v1/tax/documents/{id}/submit; GET /api/v1/tax/documents/{id}; GET /api/v1/sales/invoices/{id}. **Pantallas relacionadas:** XLS-059; XLS-071; XLS-072. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un borrador válido y una configuración tributaria vigente, cuando se valida y emite, entonces se publica una factura con obligación única, asiento balanceado y trabajo fiscal real con XML/RIDE o estado de error trazable.

**Prueba negativa:** Dado un XML rechazado o un timeout externo, cuando se reintenta el trabajo, entonces se conserva un único documento y asiento, se registra otro intento y no se crea una segunda factura ni se marca autorizada sin respuesta.

**Evidencias/pruebas exigidas:** `T-UI-XLS-070`, `T-PROC-XLS-070`, `T-NEG-XLS-070`.

### XLS-071 — Facturación Recurrente

**Ubicación original:** Contabilidad > CxC > Comprobantes de Venta > Facturación Recurrente. **Celda:** E107. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/comprobantes-de-venta/facturacion-recurrente`.

**Objetivo y vista:** Generar cargos y/o facturas recurrentes por periodo sin duplicados, separando cargo de expensa no fiscal y comprobante fiscal cuando la configuración aprobada lo requiera. Bandeja de planes recurrentes con calendario de periodos, versión de plantilla y vista previa de candidatos.

**Campos y filtros:** empresa (selector; requerido; Empresa activa.); plan recurrente (selector; requerido; Plan activo y versión aprobada.); periodo comercial (periodo; requerido; Único por plan y periodo.); fecha de emisión/vencimiento (fechas; requerido; Reglas del plan y periodo abierto.); cliente/padrón (filtro o snapshot; requerido; Conjunto estable de destinatarios.); modo cargo/factura (selector; requerido; Regla aprobada separa documentos.); vista previa hash (texto calculado; requerido; Debe coincidir al confirmar.); inmueble (selector opcional; opcional/condicional; Solo para empresa/módulo que lo necesite.).

**Columnas visibles:** Plan; Periodo; Candidatos; Cargos; Facturas; Omitidos por duplicidad; Errores; Estado.

**Acciones y permisos:** Previsualizar → Calcula lote y hash sin publicar [permiso: ventas.recurrencia.previsualizar]; Aprobar lote → Congela snapshot y requiere permiso [permiso: ventas.recurrencia.aprobar]; Generar → Crea obligaciones/documentos una sola vez [permiso: ventas.recurrencia.generar]; Reintentar fallidas → Reprocesa solo filas elegibles [permiso: ventas.recurrencia.reintentar]; Consultar → Navega a origen y resultado [permiso: ventas.recurrencia.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Borrador; Previsualizado; Aprobación pendiente; Publicado parcial; Publicado; Con errores; Omitido duplicado. **Validaciones:** Validar unicidad plan-periodo antes de generar.; Congelar clientes, importes y reglas en snapshot.; No mezclar cargo fiscal y no fiscal sin relación explícita.; Verificar todas las filas antes de marcar lote finalizado.; Recalcular saldos y usar idempotencia por candidato..

**Persistencia e impacto contable:** Cada periodo produce una clave única por empresa, plan y periodo. Un cargo no fiscal y una factura que lo representa se enlazan a una sola obligación canónica. La publicación genera asientos según plantilla; reintentos devuelven el resultado existente. Campos inmobiliarios son opcionales y no acoplan el núcleo.

**API propia propuesta:** POST /api/v1/recurring-billing/preview; POST /api/v1/recurring-billing/{id}/approve; POST /api/v1/recurring-billing/{id}/generate; POST /api/v1/recurring-billing/{id}/retry; GET /api/v1/recurring-billing/{id}. **Pantallas relacionadas:** XLS-070; XLS-059. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un plan aprobado para un periodo sin ejecuciones previas, cuando se genera el lote, entonces cada cliente elegible obtiene un único cargo/factura según regla, el asiento queda balanceado y una segunda ejecución devuelve el lote existente.

**Prueba negativa:** Dado un periodo ya generado o una plantilla modificada después de la vista previa, cuando se confirma con hash antiguo, entonces se rechaza la operación y no se crean documentos duplicados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-071`, `T-PROC-XLS-071`, `T-NEG-XLS-071`.

### XLS-072 — Notas de Venta

**Ubicación original:** Contabilidad > CxC > Comprobantes de Venta > Notas de Venta. **Celda:** E108. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/comprobantes-de-venta/notas-de-venta`.

**Objetivo y vista:** Registrar notas de venta únicamente cuando el perfil tributario y la configuración aprobada las permitan, sin tratarlas como equivalentes automáticos a una factura electrónica. Formulario independiente de notas de venta con cliente, líneas, subtotal/impuestos según catálogo, condición de pago y motivo.

**Campos y filtros:** empresa (selector; requerido; Perfil tributario debe permitir nota de venta.); cliente (búsqueda; requerido; Identificación y snapshot válidos.); fecha (fecha; requerido; Periodo abierto.); líneas (array de objetos; requerido; Descripción, cantidad, precio y clasificación.); tratamiento tributario (calculado/selector; requerido; Solo valores permitidos por perfil y vigencia.); forma de pago (selector; requerido; Configuración válida.); motivo (texto; requerido; Justificación comercial.); soporte (archivo; opcional/condicional; Evidencia opcional según política.).

**Columnas visibles:** Número; Cliente; Fecha; Subtotal; Tributos; Total; Estado contable; Perfil validado.

**Acciones y permisos:** Guardar → Crea borrador independiente [permiso: ventas.notas-venta.crear]; Validar perfil → Confirma aplicabilidad sin emitir [permiso: ventas.notas-venta.validar]; Emitir → Publica nota y obligación según configuración [permiso: ventas.notas-venta.emitir]; Consultar → Muestra documento y asiento [permiso: ventas.notas-venta.consultar]; Reversar → Abre reverso autorizado [permiso: ventas.notas-venta.reversar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Borrador; Perfil validado; Aprobación pendiente; Emitida; Reversada; Bloqueada por perfil. **Validaciones:** Validar perfil antes de mostrar emitir como disponible.; No reutilizar numeración fiscal incompatible.; Recalcular importes en backend.; Separar estado contable de cualquier estado fiscal.; Bloquear emisión si tratamiento no está configurado para vigencia..

**Persistencia e impacto contable:** Publica el asiento de venta y una obligación de cartera conforme a la plantilla aplicable; no promete XML/autorización si el documento no pertenece al flujo electrónico. El documento conserva snapshot de perfil, líneas y tratamiento. No depende de inmueble ni inventario.

**API propia propuesta:** POST /api/v1/sales/notes/preview; POST /api/v1/sales/notes; GET /api/v1/sales/notes/{id}; POST /api/v1/sales/notes/{id}/reverse. **Pantallas relacionadas:** XLS-070; XLS-059. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un perfil habilitado y una nota con líneas válidas, cuando se valida y emite, entonces se genera el documento, obligación y asiento balanceado, identificado como nota de venta y no como factura electrónica.

**Prueba negativa:** Dado un perfil no habilitado, cuando el usuario intenta emitir, entonces la pantalla bloquea la acción, explica la configuración faltante y no publica documento ni asiento.

**Evidencias/pruebas exigidas:** `T-UI-XLS-072`, `T-PROC-XLS-072`, `T-NEG-XLS-072`.

### XLS-073 — Anulación Comp. Venta

**Ubicación original:** Contabilidad > CxC > Comprobantes de Venta > Anulación Comp. Venta. **Celda:** E109. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/comprobantes-de-venta/anulacion-comp-venta`.

**Objetivo y vista:** Gestionar la anulación de comprobantes de venta conservando dos flujos: reverso contable y gestión fiscal/documental. Bandeja de comprobantes con pestañas Estado contable y Estado fiscal, detalle de factura/nota, obligación, autorizaciones y solicitudes previas.

**Campos y filtros:** documento (búsqueda; requerido; Comprobante emitido de empresa activa.); tipo de solicitud (selector; requerido; Reverso contable, gestión fiscal o ambos, separados.); motivo (texto; requerido; Explicación y categoría.); fecha solicitud (fecha; requerido; Valida para regla configurada y auditoría.); evidencia (archivo; requerido; Soporte con hash.); canal fiscal (selector; opcional/condicional; Solo capacidades configuradas; puede requerir operador.); aprobador (usuario; requerido; Permiso y segregación.).

**Columnas visibles:** Documento; Clave/número; Cliente; Estado contable; Estado fiscal; Solicitud; Plazo/configuración; Resultado.

**Acciones y permisos:** Evaluar → Calcula elegibilidad y dependencias [permiso: tributacion.anulaciones.evaluar]; Previsualizar reverso → Muestra impacto contable separado [permiso: ventas.documentos.reversar]; Solicitar fiscal → Crea tarea/solicitud por canal permitido [permiso: tributacion.anulaciones.solicitar]; Confirmar reverso → Publica asiento inverso si aprobado [permiso: ventas.documentos.reversar]; Registrar respuesta → Actualiza evidencia fiscal sin inventar autorización [permiso: tributacion.anulaciones.registrar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Elegible; Reverso pendiente; Tarea fiscal pendiente; Reversada contablemente; Anulada fiscalmente; Rechazada; Bloqueada. **Validaciones:** Separar validaciones fiscal y contable.; No inventar endpoint SRI ni afirmar automatización sin capacidad configurada.; Verificar periodo, documento autorizado, dependencias y aprobación.; Mantener estados y evidencias inmutables.; Idempotencia para solicitud y reverso..

**Persistencia e impacto contable:** El reverso contable reduce/revierte obligación, ingresos e impuestos según plantilla y queda enlazado al comprobante. La gestión fiscal solo actualiza estado tras evidencia de canal permitido; puede quedar pendiente sin deshacer el asiento automáticamente. No se editan ni borran documentos publicados.

**API propia propuesta:** GET /api/v1/tax/documents/{id}/cancellation-impact; POST /api/v1/tax/cancellation-requests; POST /api/v1/sales/documents/{id}/reversal-preview; POST /api/v1/sales/documents/{id}/reverse; POST /api/v1/tax/cancellation-requests/{id}/result. **Pantallas relacionadas:** XLS-070; XLS-072. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un comprobante publicado y elegible, cuando se aprueba el reverso y se registra la respuesta del canal fiscal permitido, entonces existe un asiento inverso enlazado y estados contable/fiscal separados con evidencia.

**Prueba negativa:** Dado un documento fuera de regla o sin canal fiscal configurado, cuando se intenta anularlo, entonces se bloquea la parte no permitida, se explica la tarea manual si corresponde y no se marca anulado ni se publica reverso parcial.

**Evidencias/pruebas exigidas:** `T-UI-XLS-073`, `T-PROC-XLS-073`, `T-NEG-XLS-073`.

### XLS-074 — Migrar Antigüedad de Cartera

**Ubicación original:** Contabilidad > CxC > Comprobantes de Venta > Migrar Antigüedad de Cartera. **Celda:** E110. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/comprobantes-de-venta/migrar-antiguedad-de-cartera`.

**Objetivo y vista:** Importar documentos abiertos y pagos previos para reconstruir antigüedad de cartera usando fechas originales y vencimientos suministrados, sin inventar fechas. Asistente de migración con plantilla de documentos, pagos y aplicaciones; pestañas de validación, homologación y conciliación.

**Campos y filtros:** empresa (selector; requerido; Empresa destino.); archivo documentos (CSV/XLSX; requerido; Plantilla versionada.); archivo pagos/aplicaciones (CSV/XLSX; opcional/condicional; Claves de relación verificables.); fecha de corte (fecha; requerido; Corte de migración.); fecha emisión original (fecha; requerido; Se conserva y valida.); fecha vencimiento original (fecha; requerido; Obligatoria si existe; no se inventa.); saldo abierto (decimal; requerido; Conciliado con original menos pagos.); cuenta inicial (selector; requerido; Contrapartida aprobada.).

**Columnas visibles:** Fila; Documento origen; Tercero; Emisión; Vencimiento; Original; Pagado; Saldo; Banda al corte; Estado.

**Acciones y permisos:** Cargar plantilla → Crea lote sin publicar [permiso: cxc.migracion.importar]; Prevalidar → Detecta fechas, duplicados y saldos [permiso: cxc.migracion.validar]; Homologar → Asocia terceros y claves origen [permiso: cxc.migracion.homologar]; Conciliar → Compara documentos, pagos y asiento [permiso: cxc.migracion.conciliar]; Confirmar → Crea obligaciones y asiento inicial [permiso: cxc.migracion.confirmar]; Reintentar → Corrige filas pendientes sin duplicar [permiso: cxc.migracion.reintentar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Cargado; Con errores; Homologación pendiente; Conciliado; Confirmado; Parcial; Fallido. **Validaciones:** Rechazar vencimiento inventado o ausente cuando sea necesario.; Validar unicidad por empresa, tercero, tipo y número.; Conciliar total original, pagos, saldo y asiento.; No confirmar filas ambiguas o sin homologación.; Proteger reintentos por lote/fila..

**Persistencia e impacto contable:** La confirmación crea receivable_item con fechas y saldos históricos, aplicaciones de pagos previos y un asiento inicial conciliado. No genera ventas actuales ni altera antigüedad histórica. El reporte posterior deriva bandas desde vencimiento original y separa anticipos/saldos a favor. Cada origen conserva hash y mapa.

**API propia propuesta:** POST /api/v1/imports/receivable-aging; GET /api/v1/imports/{id}; POST /api/v1/imports/{id}/validate; POST /api/v1/imports/{id}/reconcile; POST /api/v1/imports/{id}/confirm. **Pantallas relacionadas:** XLS-068; XLS-080; XLS-081. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un lote con documentos, fechas originales y pagos conciliados, cuando se confirma, entonces se reconstruyen saldos y aplicaciones con antigüedad correcta al corte y un asiento inicial balanceado, sin duplicar en reintento.

**Prueba negativa:** Dado un documento sin fecha de vencimiento requerida o con saldo que no cuadra, cuando se prevalida, entonces la fila queda rechazada con detalle y el lote no publica asiento parcial.

**Evidencias/pruebas exigidas:** `T-UI-XLS-074`, `T-PROC-XLS-074`, `T-NEG-XLS-074`.

### XLS-075 — Campañas

**Ubicación original:** Contabilidad > CxC > Gestión de Cobranza > Campañas. **Celda:** E112. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/gestion-de-cobranza/campanas`.

**Objetivo y vista:** Segmentar cartera, aprobar campañas de cobranza, enviar recordatorios y registrar promesas de pago con privacidad, preferencias de comunicación y saldo congelado al envío. Panel de campañas con constructor de filtros, vista previa de destinatarios y saldo al corte, plantilla versionada, canales y ventana de envío.

**Campos y filtros:** empresa (selector; requerido; Empresa activa.); fecha de corte (fecha; requerido; Congela saldos usados por campaña.); segmento (filtros; requerido; Vencimiento, saldo, responsable y estado.); plantilla (selector; requerido; Versión aprobada y variables permitidas.); canal (multiselección; requerido; Canales configurados y preferencia válida.); ventana de envío (fecha/hora; requerido; Rango permitido y zona horaria.); promesa (objeto opcional; opcional/condicional; Fecha e importe, no contabiliza por sí sola.); aprobador (usuario; requerido; Aprobación de campaña.).

**Columnas visibles:** Campaña; Corte; Segmento; Destinatarios; Enviados; Rebotados; Promesas; Estado.

**Acciones y permisos:** Previsualizar segmento → Congela conteo y saldo sin enviar [permiso: cxc.cobranza.previsualizar]; Aprobar → Publica snapshot y plantilla aprobados [permiso: cxc.cobranza.aprobar]; Enviar → Crea trabajos de entrega y registra intentos [permiso: cxc.cobranza.enviar]; Registrar promesa → Guarda compromiso con permiso [permiso: cxc.cobranza.promesas]; Consultar → Muestra resultados sin exponer terceros [permiso: cxc.cobranza.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Borrador; Previsualizada; Aprobación pendiente; Programada; Enviando; Completada; Cancelada. **Validaciones:** Excluir terceros sin canal o preferencia válida.; No incluir datos de un cliente en otro destinatario.; Congelar saldo y segmento antes de aprobación.; Idempotencia de envío para evitar mensajes duplicados.; Auditar plantilla, variables, actor y resultados..

**Persistencia e impacto contable:** No genera asiento ni cambia saldos. Registra snapshot de cartera, intentos de entrega, rebotes, preferencias, base/propósito configurados y promesas. Una promesa puede alimentar seguimiento, pero no convierte automáticamente una expectativa en cobro, ajuste o ingreso.

**API propia propuesta:** POST /api/v1/collections/campaigns/preview; POST /api/v1/collections/campaigns; POST /api/v1/collections/campaigns/{id}/approve; POST /api/v1/collections/campaigns/{id}/send; POST /api/v1/collections/promises. **Pantallas relacionadas:** XLS-080; XLS-081. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un segmento aprobado con saldo congelado y preferencias válidas, cuando se envía la campaña, entonces se crean trabajos por destinatario, se registran resultados y una promesa queda visible sin modificar cartera ni mayor.

**Prueba negativa:** Dado un destinatario sin preferencia o con campaña ya enviada, cuando se intenta enviar nuevamente, entonces se excluye o devuelve resultado idempotente, sin mensaje duplicado ni efecto contable.

**Evidencias/pruebas exigidas:** `T-UI-XLS-075`, `T-PROC-XLS-075`, `T-NEG-XLS-075`.

### XLS-076 — Ingreso de Retenciones

**Ubicación original:** Contabilidad > CxC > Retenciones > Ingreso de Retenciones. **Celda:** E114. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/retenciones/ingreso-de-retenciones`.

**Objetivo y vista:** Registrar o importar una retención recibida del cliente, validar soporte y aplicarla a una factura y al crédito tributario una sola vez. Pantalla con selector visible Recibidas/Emitidas para contexto, fijada en Recibidas dentro de CxC; formulario de emisor, comprobante, bases/valores configurados, factura destino, soporte y estado de aplicación.

**Campos y filtros:** empresa (selector; requerido; Empresa activa y perfil receptor.); cliente/emisor (búsqueda; requerido; Tercero cliente y snapshot.); número/clave (texto; requerido; Identidad del comprobante y duplicidad.); fecha (fecha; requerido; Fecha válida para documento y corte.); bases y valores (array decimal; requerido; Catálogo/vigencia; no aceptar porcentajes arbitrarios.); factura destino (búsqueda; requerido; Obligación del mismo cliente, saldo compatible.); soporte/XML (archivo; requerido; Hash y validación estructural si existe.); importe aplicado (decimal; requerido; No supera retención disponible ni crédito permitido.).

**Columnas visibles:** Retención; Cliente; Comprobante; Fecha; Base/valor; Factura; Aplicado; Crédito tributario; Estado.

**Acciones y permisos:** Registrar → Crea retención recibida pendiente [permiso: cxc.retenciones.recibidas.crear]; Importar soporte → Valida archivo y datos sin aplicar [permiso: cxc.retenciones.recibidas.importar]; Previsualizar aplicación → Muestra reducción de cartera/crédito [permiso: cxc.retenciones.recibidas.previsualizar]; Aplicar → Publica efecto una sola vez [permiso: cxc.retenciones.recibidas.aplicar]; Consultar → Navega a factura y reporte [permiso: cxc.retenciones.recibidas.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Borrador; Pendiente de soporte; Validada; Aplicada parcial; Aplicada total; Rechazada; Reversada. **Validaciones:** Validar emisor, clave/número, duplicado, soporte y vigencia.; Resolver bases/porcentajes desde catálogo configurado; no constantes.; Impedir aplicar más de una vez bajo lock.; Separar dirección RECEIVED y estado contable/fiscal.; Conciliar factura, retención, crédito y asiento..

**Persistencia e impacto contable:** La retención recibida reduce la obligación del cliente según configuración y reconoce el crédito tributario correspondiente; no duplica factura ni cobro. Se guarda en maestro único `withholding` con dirección RECEIVED, snapshot de valores y soporte. Cualquier reverso se ejecuta en pantalla separada.

**API propia propuesta:** POST /api/v1/withholdings/received; POST /api/v1/withholdings/{id}/validate; POST /api/v1/withholdings/{id}/apply; GET /api/v1/withholdings/{id}; GET /api/v1/receivables/items/{id}. **Pantallas relacionadas:** XLS-070; XLS-077. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un soporte válido y una factura del mismo cliente, cuando se valida y aplica la retención recibida, entonces se reduce la obligación una vez, se registra crédito tributario y el asiento queda balanceado con trazabilidad.

**Prueba negativa:** Dado el mismo comprobante ya aplicado o un valor superior al disponible, cuando se intenta aplicar nuevamente, entonces la operación se rechaza sin nuevo crédito, asiento ni modificación de saldo.

**Evidencias/pruebas exigidas:** `T-UI-XLS-076`, `T-PROC-XLS-076`, `T-NEG-XLS-076`.

### XLS-077 — Anulación de Retenciones

**Ubicación original:** Contabilidad > CxC > Retenciones > Anulación de Retenciones. **Celda:** E115. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/retenciones/anulacion-de-retenciones`.

**Objetivo y vista:** Reversar una retención recibida y su aplicación con evidencia, manteniendo separado el flujo de anulación fiscal del emisor ajeno. Bandeja de retenciones recibidas aplicadas con detalle de factura, soporte, valores, crédito y estado.

**Campos y filtros:** retención (búsqueda; requerido; Dirección RECEIVED y aplicación existente.); factura (solo lectura; requerido; Factura relacionada y saldo impactado.); motivo (selector/texto; requerido; Causa y explicación.); evidencia (archivo; requerido; Soporte de reverso.); fecha efectiva (fecha; requerido; Periodo abierto.); aprobador (usuario; requerido; Segregación requerida.); tarea emisor (referencia; opcional/condicional; Seguimiento externo; no supone API pública.).

**Columnas visibles:** Retención; Factura; Valor; Crédito tributario; Aplicado; Estado; Reverso.

**Acciones y permisos:** Evaluar impacto → Calcula restitución y dependencias [permiso: cxc.retenciones.recibidas.anular]; Previsualizar → Muestra reverso contable y saldo [permiso: cxc.retenciones.recibidas.previsualizar]; Solicitar aprobación → Registra solicitud y evidencia [permiso: cxc.retenciones.aprobar]; Confirmar reverso → Revierte aplicación atómicamente [permiso: cxc.retenciones.recibidas.reversar]; Consultar seguimiento → Enlaza soporte y responsable externo [permiso: cxc.retenciones.consultar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Aplicada; Aprobación pendiente; Reversada; Bloqueada; Rechazada. **Validaciones:** Validar dirección RECEIVED y aplicación única.; Comprobar periodo, soporte, aprobación y dependencias.; No permitir reverso de documento inexistente o ya revertido.; Mantener estados contable/externo separados.; Verificar restitución y asiento balanceado..

**Persistencia e impacto contable:** Revierte la aplicación de la retención, restituye la obligación y revierte el crédito tributario mediante asiento enlazado. El estado fiscal/externo queda como seguimiento separado; no se solicita anulación en una API no documentada ni se afirma resultado del emisor. El publicado original permanece intacto.

**API propia propuesta:** GET /api/v1/withholdings/{id}/reversal-impact; POST /api/v1/withholdings/{id}/reversal-preview; POST /api/v1/withholdings/{id}/reversal-requests; POST /api/v1/withholdings/{id}/reverse. **Pantallas relacionadas:** XLS-076; XLS-070. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un withholding recibido aplicado a una factura, cuando se aprueba su reverso, entonces la factura recupera el saldo, el crédito tributario se revierte y queda evidencia enlazada sin tramitar anulación como emisor.

**Prueba negativa:** Dado un comprobante emitido por un tercero que el sistema no puede anular fiscalmente, cuando el usuario intenta usar una acción de anulación automática, entonces se bloquea esa acción y se ofrece seguimiento manual sin afectar el reverso contable aprobado.

**Evidencias/pruebas exigidas:** `T-UI-XLS-077`, `T-PROC-XLS-077`, `T-NEG-XLS-077`.

### XLS-078 — Rep. Documentos Emitidos

**Ubicación original:** Contabilidad > CxC > Reportes > Rep. Documentos Emitidos. **Celda:** E117. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/reportes/rep-documentos-emitidos`.

**Objetivo y vista:** Listar documentos emitidos de CxC por tipo, fecha, cliente, responsable y estados contable/fiscal, separando cargos no fiscales de comprobantes fiscales. Reporte con filtros de empresa, intervalo, tipo, responsable, cliente, origen fiscal/no fiscal y estados separados.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); desde/hasta (rango de fechas; requerido; Intervalo explícito y válido.); tipo documento (multiselección; opcional/condicional; Factura, nota, cargo u otros configurados.); estado contable (multiselección; opcional/condicional; Borrador, publicado, reversado.); estado fiscal (multiselección; opcional/condicional; Pendiente, autorizado, no autorizado u otros.); cliente/responsable (búsqueda; opcional/condicional; Alcance de empresa.); origen fiscal/no fiscal (selector; opcional/condicional; Separación visible.); corte/exportación (fecha/formato; requerido; Mismo snapshot para pantalla y archivo.).

**Columnas visibles:** Documento; Tipo/origen; Fecha; Cliente; Responsable; Total; Estado contable; Estado fiscal; Obligación; Asiento.

**Acciones y permisos:** Consultar → Ejecuta reporte con snapshot y totales [permiso: reportes.cxc.documentos_emitidos.consultar]; Exportar → Genera archivo con mismos filtros y permisos [permiso: reportes.exportar]; Abrir origen → Navega al documento transaccional [permiso: reportes.navegar_origen]; Abrir obligación/asiento → Muestra auxiliares y mayor [permiso: reportes.navegar_contabilidad].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Preparando; Listo; Sin resultados; Exportando; Error. **Validaciones:** Exigir from/to o corte explícito.; Aplicar filtros de empresa y permisos en backend.; Usar mismos filtros/columnas en exportación.; Conciliar totales por tipo/origen con cartera.; Excluir borradores de totales publicados salvo filtro explícito..

**Persistencia e impacto contable:** Es solo consulta: no genera asientos. Incluye movimientos publicados y reversos efectivos según corte, separa estado contable de fiscal y evita sumar dos veces un cargo y la factura que lo representa. Los totales deben cuadrar con receivable_item y mayor; los enlaces respetan empresa/permisos.

**API propia propuesta:** GET /api/v1/reports/cxc/issued-documents; POST /api/v1/report-exports; GET /api/v1/sales/documents/{id}; GET /api/v1/receivables/items/{id}. **Pantallas relacionadas:** XLS-070; XLS-071; XLS-080; XLS-081. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un intervalo con una factura autorizada y un cargo no fiscal relacionado, cuando se consulta, entonces aparecen separados, el total no duplica la obligación y cada fila navega a documento, auxiliar y asiento.

**Prueba negativa:** Dado un usuario sin acceso a otra empresa, cuando intenta cambiar el parámetro de empresa o abrir un ID ajeno, entonces recibe denegación sin filtrar datos ni alterar totales.

**Evidencias/pruebas exigidas:** `T-UI-XLS-078`, `T-PROC-XLS-078`, `T-NEG-XLS-078`.

### XLS-079 — Rep. Retenciones Emitidas

**Ubicación original:** Contabilidad > CxC > Reportes > Rep. Retenciones Emitidas. **Celda:** E118. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/reportes/rep-retenciones-emitidas`.

**Objetivo y vista:** Conservar el acceso original titulado exactamente “Rep. Ruta y encabezado muestran literalmente “Rep.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); dirección (pestañas selector; requerido; Emitidas o Recibidas; no combinar resultados.); desde/hasta (rango de fechas; requerido; Corte explícito.); tercero (búsqueda; opcional/condicional; Cliente para recibidas o proveedor para emitidas.); estado (multiselección; opcional/condicional; Validada, aplicada, reversada y fiscal/contable.); tipo/clave (texto/selector; opcional/condicional; Identificador y clasificación.); exportación (formato; requerido; Mismo filtro y pestaña.); corte (fecha; requerido; Fecha de evaluación.).

**Columnas visibles:** Dirección; Retención; Tercero; Documento relacionado; Fecha; Base/valor; Aplicado; Crédito/obligación; Estado.

**Acciones y permisos:** Cambiar pestaña → Consulta dirección separada sin sustituir título [permiso: reportes.retenciones.direccion]; Consultar → Calcula filas y totales de la pestaña activa [permiso: reportes.retenciones.consultar]; Exportar → Genera archivo con dirección explícita [permiso: reportes.exportar]; Abrir origen → Navega a withholding, factura o compra [permiso: reportes.navegar_origen].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Preparando; Listo; Sin resultados; Exportando; Error. **Validaciones:** No renombrar ni ocultar el acceso original.; Hacer obligatoria la selección de dirección.; Restringir Emitidas por permisos de CxP.; Conciliar totales con maestro único y auxiliar correcto.; No permitir exportar ambas direcciones como una sola suma..

**Persistencia e impacto contable:** No publica ni revierte movimientos. Recibidas se concilian con obligaciones de CxC y crédito tributario; emitidas se consultan como dirección distinta y no se inventa una retención recibida. Los estados y totales permanecen separados para no duplicar el efecto contable.

**API propia propuesta:** GET /api/v1/reports/cxc/withholdings?direction=RECEIVED; GET /api/v1/reports/cxp/withholdings?direction=ISSUED; POST /api/v1/report-exports; GET /api/v1/withholdings/{id}. **Pantallas relacionadas:** XLS-076; XLS-077; XLS-078. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado el reporte abierto desde el menú original, cuando se mantiene la pestaña Recibidas y se consulta un periodo, entonces el encabezado conserva “Rep. Retenciones Emitidas”, la subtitulación explica la dirección y las filas enlazan a facturas de CxC.

**Prueba negativa:** Dado que el usuario intenta mezclar Emitidas y Recibidas o acceder a Emitidas sin permiso, cuando consulta, entonces el sistema separa/bloquea el resultado y no presenta totales combinados.

**Evidencias/pruebas exigidas:** `T-UI-XLS-079`, `T-PROC-XLS-079`, `T-NEG-XLS-079`.

### XLS-080 — Rep. Angitüedad de Cartera

**Ubicación original:** Contabilidad > CxC > Reportes > Rep. Angitüedad de Cartera. **Celda:** E119. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/reportes/rep-angituedad-de-cartera`.

**Objetivo y vista:** Calcular antigüedad de cartera al corte por vencimiento original, con bandas configurables y separación explícita de anticipos y saldos a favor. Reporte con fecha de corte obligatoria, bandas configurables visibles, filtros por tercero, responsable, origen y estado.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); fecha de corte (fecha; requerido; Corte no ambiguo.); bandas (array de rangos; requerido; Rangos no solapados y configuración versionada.); cliente/responsable (búsqueda; opcional/condicional; Filtro de cartera.); origen (multiselección; opcional/condicional; Factura, cargo, migración u otros.); estado (multiselección; opcional/condicional; Abierta, parcial, vencida.); incluir anticipos (booleano; requerido; Se muestran en sección separada.); formato (selector; requerido; Pantalla/exportación con snapshot.).

**Columnas visibles:** Tercero; Documento; Vencimiento original; Días al corte; Banda; Original; Aplicado; Ajustes; Saldo; Sección.

**Acciones y permisos:** Consultar → Calcula bandas y totales conciliables [permiso: reportes.cxc.aging.consultar]; Configurar bandas → Propone versión con auditoría, no altera históricos [permiso: reportes.cxc.aging.configurar]; Exportar → Genera archivo con mismos filtros [permiso: reportes.exportar]; Abrir obligación → Navega a detalle y aplicaciones [permiso: reportes.navegar_origen]; Abrir anticipo → Navega a saldo a favor separado [permiso: reportes.navegar_anticipo].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Preparando; Listo; Sin resultados; Exportando; Error de configuración. **Validaciones:** Exigir bandas ordenadas, no solapadas y vigentes.; Calcular con fecha de vencimiento original, no crear vencimientos.; Aplicar fecha efectiva de reversos y pagos al corte.; Conciliar total de detalle con resumen y auxiliar.; Separar saldo a favor/anticipo de vencido..

**Persistencia e impacto contable:** No genera asiento. El saldo se deriva de importe original, ajustes, aplicaciones y reversos efectivos al corte; se muestran anticipos/saldos a favor fuera de bandas. Las bandas predeterminadas son configurables por empresa sin codificar tasas ni alterar documentos históricos. Totales concilian con receivable_item.

**API propia propuesta:** GET /api/v1/reports/cxc/aging; POST /api/v1/report-exports; GET /api/v1/receivables/items/{id}; GET /api/v1/customer-advances. **Pantallas relacionadas:** XLS-074; XLS-081; XLS-083. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un corte con obligaciones en dos bandas y un anticipo disponible, cuando se consulta, entonces las obligaciones se agrupan por vencimiento original, el anticipo queda separado y la suma concilia con cartera.

**Prueba negativa:** Dado bandas solapadas o una obligación sin fecha requerida, cuando se intenta calcular, entonces el reporte muestra error de preparación y no asigna una banda inventada.

**Evidencias/pruebas exigidas:** `T-UI-XLS-080`, `T-PROC-XLS-080`, `T-NEG-XLS-080`.

### XLS-081 — Rep. Cartera de Clientes

**Ubicación original:** Contabilidad > CxC > Reportes > Rep. Cartera de Clientes. **Celda:** E120. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/reportes/rep-cartera-de-clientes`.

**Objetivo y vista:** Mostrar la cartera de clientes por tercero y, si existe el módulo opcional, por unidad/condominio, conciliando el total con el mayor. Reporte jerárquico tercero → obligaciones → dimensión opcional de inmueble, con selector de incluir contexto inmobiliario solo cuando esté habilitado.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); fecha de corte (fecha; requerido; Corte obligatorio.); tercero (búsqueda; opcional/condicional; Filtro opcional.); condominio/unidad (selector opcional; opcional/condicional; Visible solo con módulo habilitado.); estado cartera (multiselección; opcional/condicional; Abierta, parcial, saldada, reversada.); origen (multiselección; opcional/condicional; Fiscal/no fiscal/migración.); incluir anticipos (booleano; requerido; Sección separada.); conciliación mayor (booleano; requerido; Exige cuentas y diferencias visibles.).

**Columnas visibles:** Tercero; Unidad/condominio opcional; Documentos; Original; Aplicado; Ajustes; Saldo; Anticipo; Diferencia mayor.

**Acciones y permisos:** Consultar → Genera cartera jerárquica al corte [permiso: reportes.cxc.portfolio.consultar]; Conciliar mayor → Muestra total auxiliar, mayor y diferencias [permiso: reportes.cxc.portfolio.conciliar]; Exportar → Entrega detalle y resumen con snapshot [permiso: reportes.exportar]; Abrir origen → Navega a documento, obligación o asiento [permiso: reportes.navegar_origen]; Abrir unidad → Navega a contexto vertical si existe [permiso: reportes.navegar_property].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Preparando; Listo; Sin resultados; Diferencia detectada; Exportando. **Validaciones:** No exigir condominium_id ni property_unit_id en núcleo.; Filtrar dimensión opcional solo con autorización de módulo.; Conciliar detalle, auxiliar y mayor al mismo corte.; Separar anticipos y saldos a favor.; Bloquear exportación cruzada de empresas..

**Persistencia e impacto contable:** Es consulta. La cartera se deriva del auxiliar canónico; la dimensión de inmueble solo agrega enlace y agrupación validada por extensión, nunca saldo manual. Anticipos se presentan aparte. La conciliación muestra diferencias en vez de ocultarlas y no publica ajustes automáticamente.

**API propia propuesta:** GET /api/v1/reports/cxc/customer-portfolio; POST /api/v1/report-exports; GET /api/v1/receivables/items; GET /api/v1/reports/reconciliation/general-ledger. **Pantallas relacionadas:** XLS-059; XLS-061; XLS-080; XLS-083. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un cliente con factura, cobro parcial y anticipo, sin inmuebles habilitados, cuando se consulta, entonces la cartera funciona sin campos inmobiliarios, muestra saldo y anticipo separados y concilia con el mayor.

**Prueba negativa:** Dado un filtro de unidad con módulo deshabilitado, cuando se consulta, entonces se rechaza el filtro con mensaje de configuración y el reporte general sigue disponible sin exigir esa dimensión.

**Evidencias/pruebas exigidas:** `T-UI-XLS-081`, `T-PROC-XLS-081`, `T-NEG-XLS-081`.

### XLS-082 — Rep. Recaudaciones

**Ubicación original:** Contabilidad > CxC > Reportes > Rep. Recaudaciones. **Celda:** E121. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/reportes/rep-recaudaciones`.

**Objetivo y vista:** Mostrar recaudaciones y aplicaciones por fecha, caja/banco y estado, con totales de recibido/aplicado/anticipo y acceso al recibo. Reporte con intervalo y corte, filtros por medio, caja, banco, cliente, responsable y estado.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); desde/hasta (rango; requerido; Intervalo válido.); caja/banco (selector; opcional/condicional; Cuenta o canal del medio.); cliente (búsqueda; opcional/condicional; Filtro opcional.); medio (multiselección; opcional/condicional; Caja, transferencia, depósito, cheque.); estado (multiselección; opcional/condicional; Confirmado, parcial, anticipo, reversado.); fecha de corte (fecha; requerido; Para saldos efectivos.); formato (selector; requerido; Exportación igual a pantalla.).

**Columnas visibles:** Recibo; Fecha; Cliente; Medio; Caja/banco; Recibido; Aplicado; Anticipo; Reversos; Estado.

**Acciones y permisos:** Consultar → Calcula recaudaciones y aplicaciones [permiso: reportes.cxc.recaudaciones.consultar]; Exportar → Entrega archivo con totales conciliables [permiso: reportes.exportar]; Abrir recibo → Navega al origen y dependencias [permiso: reportes.navegar_origen]; Reimprimir → Lleva a pantalla dedicada sin contabilizar [permiso: reportes.reimpresion].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Preparando; Listo; Sin resultados; Exportando; Error de conciliación. **Validaciones:** Exigir fechas y empresa.; Separar cobro confirmado de cheque no compensado.; Aplicar reversos según fecha efectiva.; Verificar totales de medios contra recibos.; Mantener navegación con permisos y no reejecutar acciones..

**Persistencia e impacto contable:** No genera asientos. Presenta recaudación original, aplicaciones y anticipos según fecha efectiva; reversos se muestran como eventos enlazados y no como un nuevo cobro. Los totales deben conciliar con recibos confirmados y mayor/caja/banco conforme al filtro, con diferencias visibles.

**API propia propuesta:** GET /api/v1/reports/cxc/collections; POST /api/v1/report-exports; GET /api/v1/receipts/{id}; GET /api/v1/receipts/{id}/reprints. **Pantallas relacionadas:** XLS-061; XLS-062; XLS-063; XLS-064. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un periodo con cobro aplicado, anticipo y un recibo reversado, cuando se consulta, entonces se muestran sus componentes separados, los totales concilian y cada fila abre el recibo sin crear un nuevo movimiento.

**Prueba negativa:** Dado que el filtro solicita una caja de otra empresa, cuando se consulta, entonces se deniega el acceso y el reporte no revela filas ni totales parciales.

**Evidencias/pruebas exigidas:** `T-UI-XLS-082`, `T-PROC-XLS-082`, `T-NEG-XLS-082`.

### XLS-083 — Rep. Saldo Anticipo de Clientes

**Ubicación original:** Contabilidad > CxC > Reportes > Rep. Saldo Anticipo de Clientes. **Celda:** E122. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/reportes/rep-saldo-anticipo-de-clientes`.

**Objetivo y vista:** Mostrar el saldo de anticipos recibidos, aplicados y disponibles por cliente a una fecha de corte, con desglose por origen y navegación a cruces, reversos y recibos. Reporte por cliente con tarjetas recibido/aplicado/disponible y tabla de movimientos de anticipo al corte.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); fecha de corte (fecha; requerido; Corte explícito.); cliente (búsqueda; opcional/condicional; Filtro opcional.); origen (multiselección; opcional/condicional; Cobro, migración, reverso.); estado (multiselección; opcional/condicional; Disponible, aplicado, reversado.); incluir movimientos (booleano; requerido; Detalle histórico al corte.); moneda (selector; requerido; Moneda de empresa.); formato (selector; requerido; Snapshot igual a pantalla.).

**Columnas visibles:** Cliente; Recibido; Aplicado; Reversado; Disponible; Último movimiento; Origen; Estado.

**Acciones y permisos:** Consultar → Calcula saldo recibido/aplicado/disponible [permiso: reportes.cxc.advances.consultar]; Exportar → Genera archivo con detalle y totales [permiso: reportes.exportar]; Abrir recibo → Navega al origen del anticipo [permiso: reportes.navegar_origen]; Abrir cruce/reverso → Navega al proceso específico [permiso: reportes.navegar_anticipo]; Conciliar → Muestra diferencia entre derivación y cache [permiso: reportes.conciliar].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Preparando; Listo; Sin resultados; Diferencia detectada; Exportando. **Validaciones:** Calcular con fecha efectiva y snapshot al corte.; No incluir cobros anulados como disponibles.; Conciliar recibido-aplicado-reversado.; Separar clientes y empresas.; Navegar en modo consulta a operaciones con permisos..

**Persistencia e impacto contable:** No genera asiento ni saldo manual. El disponible se deriva de anticipos recibidos, cruces y reversos efectivos al corte; se separa del saldo de documentos. Si existe caché versionada, se compara y se muestra la diferencia para corrección técnica, no se edita desde el reporte.

**API propia propuesta:** GET /api/v1/reports/cxc/customer-advance-balances; POST /api/v1/report-exports; GET /api/v1/customer-advances; GET /api/v1/advance-crossings. **Pantallas relacionadas:** XLS-061; XLS-065; XLS-066; XLS-067. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un cliente con anticipo recibido 100, cruce 40 y reverso 10 efectivo al corte, cuando se consulta, entonces el reporte muestra recibido, aplicado y disponible derivados, con enlaces a cada evento y sin mezclarlo con cartera vencida.

**Prueba negativa:** Dado un saldo solicitado para una fecha anterior a un evento futuro, cuando se consulta, entonces el evento futuro se excluye y el resultado no usa el saldo actual ni inventa una aplicación.

**Evidencias/pruebas exigidas:** `T-UI-XLS-083`, `T-PROC-XLS-083`, `T-NEG-XLS-083`.

### XLS-084 — Rep. Cruce de Anticipo Clientes

**Ubicación original:** Contabilidad > CxC > Reportes > Rep. Cruce de Anticipo Clientes. **Celda:** E123. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/cxc/reportes/rep-cruce-de-anticipo-clientes`.

**Objetivo y vista:** Mostrar la trazabilidad de cruces de anticipos de clientes, documentos afectados, usuarios, fechas, importes y reversos. Reporte de auditoría con filtros por cliente, anticipo, documento, fecha, actor y estado.

**Campos y filtros:** empresa (selector; requerido; Empresa autorizada.); desde/hasta (rango; requerido; Intervalo de eventos.); cliente (búsqueda; opcional/condicional; Filtro opcional.); anticipo/documento (búsqueda; opcional/condicional; Identificador de origen o destino.); actor (selector; opcional/condicional; Usuario con eventos.); estado (multiselección; opcional/condicional; Aplicado, parcial, reversado, rechazado.); incluir reversos (booleano; requerido; Muestra cadena completa.); formato (selector; requerido; Exportación con mismos filtros.).

**Columnas visibles:** Cruce; Fecha; Cliente; Anticipo; Documento afectado; Aplicado; Actor; Aprobaciones; Reverso; Estado.

**Acciones y permisos:** Consultar → Genera trazabilidad completa al corte/intervalo [permiso: reportes.cxc.advance-crossings.consultar]; Expandir cadena → Muestra origen, aplicación y reverso [permiso: reportes.cxc.advance-crossings.consultar]; Exportar → Entrega auditoría con snapshot [permiso: reportes.exportar]; Abrir origen → Navega a anticipo/documento en consulta [permiso: reportes.navegar_origen]; Abrir reverso → Navega al proceso de anulación [permiso: reportes.navegar_reverso].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y localizar el registro, lote o documento de origen.
2. Capturar los datos propios de la operación y adjuntar soportes cuando correspondan.
3. Validar identidad, periodo, saldos, duplicidad, configuración y permisos en backend.
4. Solicitar o completar la aprobación requerida conservando versión y evidencia.
5. Aplicar el efecto de negocio de forma idempotente, atómica y trazable.
6. Consultar el resultado, estados, auditoría y navegación al origen relacionado.

**Estados:** Preparando; Listo; Sin resultados; Exportando; Error de integridad. **Validaciones:** Exigir intervalo o corte y empresa.; Verificar que cada cruce tenga origen/destino inequívocos.; Mostrar reverso enlazado sin duplicarlo como cruce nuevo.; Restringir datos por tenant/empresa y actor autorizado.; No habilitar confirmar/anular desde el reporte..

**Persistencia e impacto contable:** Es un reporte sin efecto contable. Lee settlement_application, anticipos, documentos y reversos enlazados; muestra importes y estados sin recalcular ni publicar. Permite conciliar total aplicado y restituido, y evidencia diferencias de integridad para investigación. La exportación conserva el snapshot y permisos de consulta.

**API propia propuesta:** GET /api/v1/reports/cxc/advance-crossings; POST /api/v1/report-exports; GET /api/v1/advance-crossings/{id}; GET /api/v1/advance-crossings/{id}/history. **Pantallas relacionadas:** XLS-065; XLS-067; XLS-083. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un cruce aplicado y luego revertido, cuando se consulta con incluir reversos, entonces aparece la cadena anticipo-documento-reverso, sus aprobadores y totales conciliables, con enlaces de solo lectura.

**Prueba negativa:** Dado un intento de invocar una acción de confirmación desde una URL del reporte, cuando el backend recibe la solicitud sin permiso transaccional, entonces la rechaza y conserva el reporte sin efecto contable.

**Evidencias/pruebas exigidas:** `T-UI-XLS-084`, `T-PROC-XLS-084`, `T-NEG-XLS-084`.

### Procesos integrales del grupo

**Alta de tercero e importación idempotente**. Secuencia: XLS-059; XLS-060. Registrar o importar tercero desde la bandeja de migración, detectar coincidencias por empresa e identificación, homologar filas ambiguas, confirmar perfiles y consultar historial. CxC y CxP reutilizan el mismo maestro aunque el acceso original permanezca en CxC. Resultado: No genera asiento; habilita referencias y snapshots para obligaciones, cobros y retenciones. Prueba: Dado un tercero nuevo y otro existente en un archivo, cuando se registra/importa y se confirma, entonces queda un solo registro por identidad, ambos perfiles correctos, trazabilidad de filas y ningún movimiento duplicado.

**Recaudación, cheque, reimpresión y anulación**. Secuencia: XLS-061; XLS-062; XLS-063; XLS-064. Capturar cobro con aplicaciones y posible anticipo, registrar cheque posfechado en custodia, consultar/reimprimir el recibo y, si procede, evaluar dependencias antes de reversar. La reimpresión es independiente de confirmación y el cheque no es efectivo compensado. Resultado: El cobro publica asiento balanceado y aplicaciones; cheque usa cuenta puente/no disponible según configuración; reimpresión no contabiliza; anulación revierte atómicamente y conserva el original. Prueba: Dado un cobro parcial con cheque posfechado, cuando se registra, se reimprime, se deposita y se intenta anular antes/después de conciliación, entonces cada estado y bloqueo aparece correctamente, sin duplicar ingreso ni permitir reverso dependiente incompleto.

**Anticipos, cruces y ajustes de cartera**. Secuencia: XLS-065; XLS-066; XLS-067; XLS-068. Consultar anticipo disponible, cruzarlo contra obligaciones bajo lock, registrar un ajuste independiente con evidencia/aprobación y usar pantallas separadas para anular anticipo o solo el cruce. Cada operación se enlaza a su origen. Resultado: El cruce mueve saldo entre auxiliares; anularlo restituye deuda/disponible; anular anticipo revierte su origen sujeto a dependencias; ajuste publica contrapartida aprobada. Nunca se edita un publicado. Prueba: Dado un anticipo aplicado parcialmente y un ajuste aprobado, cuando se revierte una línea y se consulta la cartera, entonces los saldos y asientos enlazados concilian, el cobro no se duplica y la trazabilidad distingue cada reverso.

**Migración de saldos de CxC**. Secuencia: XLS-069; XLS-074. Cargar plantillas de anticipos y antigüedad, validar fechas originales, homologar terceros/cuentas, conciliar filas contra asiento inicial y confirmar únicamente lotes completos; reintentar errores sin duplicar. Resultado: Publica un asiento inicial único por lote y crea auxiliares históricos con fechas, pagos y saldos; no inventa vencimientos ni ingresos actuales. Prueba: Dado un corte con anticipos y documentos abiertos con pagos previos, cuando se importa, homologa, concilia y confirma, entonces los saldos al corte y bandas posteriores coinciden con el archivo y un reintento no crea segunda deuda/asiento.

**Venta y ciclo fiscal separado**. Secuencia: XLS-070; XLS-071; XLS-072; XLS-073. Crear factura, ejecutar recurrencia por periodo sin duplicados, emitir nota de venta solo si el perfil lo permite y gestionar reverso contable/anulación fiscal en estados independientes. Los artefactos reales y respuestas se guardan; fallos externos quedan rastreables. Resultado: Cada operación crea o enlaza una obligación canónica y publica asiento según plantilla; transmisión/autorización fiscal ocurre en trabajo separado y nunca se simula en producción. Prueba: Dado un cliente con plan recurrente y perfil tributario configurado, cuando se genera factura o nota permitida y luego se solicita anulación, entonces no se duplican obligaciones, se separan estados y el reverso solo ocurre con aprobación y evidencia.

**Retenciones recibidas**. Secuencia: XLS-076; XLS-077. Registrar/importar soporte de retención recibida, validar dirección y valores configurados, aplicar una sola vez a factura y crédito tributario y, si es necesario, revertir aplicación con evidencia sin tramitar automáticamente anulación como emisor ajeno. Resultado: Reduce la obligación y reconoce crédito configurado; el reverso restituye ambos efectos mediante asiento enlazado. El maestro withholding conserva dirección RECEIVED y estados separados. Prueba: Dado un comprobante recibido válido, cuando se aplica y después se revierte con aprobación, entonces la factura, crédito y mayor quedan consistentes, el documento original no se borra y el seguimiento externo no se presenta como API pública.

**Reportes CxC conciliables**. Secuencia: XLS-078; XLS-079; XLS-080; XLS-081; XLS-082; XLS-083; XLS-084. Seleccionar empresa y corte/intervalo, aplicar filtros concretos, consultar detalle con totales, exportar el mismo snapshot y navegar a documentos, obligaciones, asientos, recibos, anticipos y reversos. El título original de retenciones se conserva con selector Emitidas/Recibidas. Resultado: No modifica datos; deriva saldos y totales de movimientos publicados, aplicaciones y reversos efectivos, separando fiscal/contable, anticipos, saldos a favor y dimensiones inmobiliarias opcionales. Prueba: Dado un conjunto de ventas, cobros, retenciones, anticipos y cruces, cuando se consultan todos los reportes al mismo corte, entonces sus totales concilian entre sí y con mayor, y cada enlace abre su origen sin habilitar acciones transaccionales.

## Contabilidad > Bancos

### XLS-085 — Cuentas Bancarias

**Ubicación original:** Contabilidad > Bancos > Cuentas Bancarias. **Celda:** D125. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/cuentas-bancarias`.

**Objetivo y vista:** Mantener las cuentas bancarias de cada empresa con banco, moneda, cuenta contable, numeración, responsables y estado sin exponer datos sensibles. Encabezado con empresa activa, estado de módulo y aviso de protección de datos; listado paginado con búsqueda y filtros; botón Nueva cuenta; panel lateral de detalle con pestañas Identificación, Contabilidad, Seguridad, Numeración e Historial.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada y activa); nombre_cuenta (texto; requerido; 1-120 caracteres, único por empresa); banco (selector; requerido; banco vigente del catálogo interno); numero_cuenta (texto_enmascarado; requerido; formato permitido por país, cifrado y no duplicado); moneda (selector; requerido; moneda soportada; conservar moneda histórica); cuenta_contable (selector; requerido; cuenta imputable, naturaleza compatible y empresa activa); estado (selector; requerido; ACTIVA o INACTIVA; inactivar exige motivo); fecha_inicio (fecha; requerido; no posterior al primer movimiento).

**Columnas visibles:** Empresa; Nombre de cuenta; Banco; Número enmascarado; Moneda; Cuenta contable; Estado; Última conciliación.

**Acciones y permisos:** Nueva cuenta → crea borrador y solicita aprobación antes de activar [permiso: banks.account.create]; Editar configuración → actualiza solo campos permitidos y conserva versiones [permiso: banks.account.update]; Activar/Inactivar → cambia estado operativo sin borrar historial [permiso: banks.account.status]; Ver historial → muestra auditoría, cambios y movimientos vinculados [permiso: banks.account.read]; Revelar datos sensibles → muestra temporalmente el dato desenmascarado y audita acceso [permiso: banks.account.sensitive_read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa y revisar duplicados, permisos y contexto de moneda.
2. Capturar banco, cuenta enmascarada, moneda, cuenta contable, numeración y responsables.
3. Validar formato, unicidad, cuenta imputable, vigencia y ausencia de movimientos incompatibles.
4. Enviar a aprobación cuando la política lo exija y activar solo con decisión registrada.
5. Aplicar configuración a futuras operaciones sin modificar documentos históricos.
6. Consultar versión, auditoría y fecha de última conciliación.

**Estados:** BORRADOR; PENDIENTE_APROBACION; ACTIVA; INACTIVA; BLOQUEADA. **Validaciones:** Aplicar tenant/company scope y RLS en toda lectura y escritura.; Cifrar número y secretos; no enviarlos completos en listados ni logs.; Impedir duplicidad por empresa, banco, número normalizado y moneda cuando la política lo defina.; Impedir inactivar si existen operaciones abiertas sin resolución, mostrando impacto.; Usar Decimal y versionado optimista para cambios concurrentes..

**Persistencia e impacto contable:** No genera asiento al crear o editar la cuenta. La cuenta contable y moneda seleccionadas se aplican a operaciones futuras; el cambio de cuenta no reescribe asientos ni extractos anteriores. Inactivar bloquea nuevas operaciones y conserva consulta, conciliación e informes históricos. Las dimensiones inmobiliarias no son obligatorias.

**API propia propuesta:** GET /api/v1/treasury/bank-accounts; POST /api/v1/treasury/bank-accounts; PATCH /api/v1/treasury/bank-accounts/{id}; POST /api/v1/treasury/bank-accounts/{id}/activate; POST /api/v1/treasury/bank-accounts/{id}/deactivate; GET /api/v1/treasury/bank-accounts/{id}/audit. **Pantallas relacionadas:** XLS-086; XLS-087; XLS-088; XLS-089; XLS-090; XLS-091; XLS-093; XLS-094; XLS-095. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: una empresa autorizada sin inmuebles y una cuenta bancaria nueva con banco, moneda y cuenta contable válidos; cuando: el usuario con permiso registra, aprueba y activa la cuenta; entonces: la cuenta queda ACTIVA, enmascarada, auditada y disponible para depósitos, egresos y conciliación sin asiento de alta

**Prueba negativa:** dado: una cuenta duplicada o una cuenta contable no imputable; cuando: el usuario intenta guardarla o activarla; entonces: la API rechaza la operación, no crea datos parciales y muestra errores por campo

**Evidencias/pruebas exigidas:** `T-UI-XLS-085`, `T-PROC-XLS-085`, `T-NEG-XLS-085`.

### XLS-086 — Ingreso de Depósito

**Ubicación original:** Contabilidad > Bancos > Depósitos > Ingreso de Depósito. **Celda:** E127. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/depositos/ingreso-de-deposito`.

**Objetivo y vista:** Agrupar recaudaciones, efectivo o cheques en tránsito seleccionados y transferirlos a una cuenta bancaria sin registrar un nuevo ingreso. Pantalla dedicada con bandeja de recaudaciones disponibles, selector de empresa y cuenta bancaria, rango de fechas, moneda y estado de custodia.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada); cuenta_bancaria (selector; requerido; cuenta ACTIVA y moneda compatible); fecha_deposito (fecha; requerido; periodo abierto y no futura según política); origenes (multiseleccion; requerido; recaudaciones disponibles y no aplicadas a otro depósito); medio (selector; requerido; EFECTIVO, CHEQUE o TRANSFERENCIA_EN_TRANSITO); referencia_bancaria (texto; opcional/condicional; máximo 120 caracteres; no duplicada en la cuenta); soportes (archivos; opcional/condicional; tipos permitidos, hash y tamaño controlados).

**Columnas visibles:** Origen; Fecha recaudación; Tercero; Documento; Medio; Valor; Estado; Referencia.

**Acciones y permisos:** Preparar depósito → crea borrador con partidas bloqueadas para doble selección [permiso: banks.deposit.create]; Validar composición → calcula total y reporta líneas incompatibles [permiso: banks.deposit.validate]; Solicitar aprobación → envía el depósito validado al flujo de aprobación [permiso: banks.deposit.submit]; Confirmar ingreso → publica transferencia a banco y marca origen depositado [permiso: banks.deposit.post]; Consultar soporte → abre documentos y auditoría sin modificar importes [permiso: banks.deposit.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, cuenta bancaria y partidas de recaudación elegibles.
2. Capturar fecha, medio, referencia, composición y soportes del depósito.
3. Validar moneda, periodo, disponibilidad, duplicados, suma y permisos.
4. Presentar vista previa contable y obtener aprobación segregada.
5. Publicar una transferencia desde efectivo/cheques en tránsito al banco con idempotencia.
6. Dejar el depósito pendiente de conciliación y permitir consulta del origen.

**Estados:** BORRADOR; VALIDANDO; PENDIENTE_APROBACION; PUBLICADO; CONCILIADO; ANULADO. **Validaciones:** Bloquear una recaudación ya incluida en otro depósito no anulado.; Exigir igualdad exacta entre total de líneas y total del depósito con Decimal.; No permitir publicar en periodo cerrado ni con cuenta inactiva.; Usar clave idempotente y lock para evitar doble publicación.; Conservar soporte, snapshot y hash de la vista previa..

**Persistencia e impacto contable:** El depósito no reconoce ingreso, cartera ni impuesto. Solo transfiere el saldo desde caja o cheques en tránsito hacia la cuenta bancaria, enlazando cada origen y generando un asiento publicado una vez. La conciliación posterior relaciona extracto y libro; cualquier diferencia se trata mediante ajuste aprobado, nunca cambiando el valor original.

**API propia propuesta:** GET /api/v1/treasury/deposits/eligible; POST /api/v1/treasury/deposits; POST /api/v1/treasury/deposits/{id}/validate; POST /api/v1/treasury/deposits/{id}/submit; POST /api/v1/treasury/deposits/{id}/post; GET /api/v1/treasury/deposits/{id}. **Pantallas relacionadas:** XLS-085; XLS-087; XLS-093; XLS-095. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: dos recaudaciones disponibles por USD 100 y USD 50 y una cuenta bancaria activa; cuando: el usuario las selecciona, aprueba y confirma el depósito; entonces: se publica una transferencia USD 150, los orígenes quedan DEPOSITADOS y no aparece un ingreso adicional

**Prueba negativa:** dado: una recaudación ya depositada o una suma de líneas inconsistente; cuando: se intenta validar o confirmar; entonces: la operación se rechaza sin asiento ni cambio de estado en las partidas

**Evidencias/pruebas exigidas:** `T-UI-XLS-086`, `T-PROC-XLS-086`, `T-NEG-XLS-086`.

### XLS-087 — Anulación de Depósito

**Ubicación original:** Contabilidad > Bancos > Depósitos > Anulación de Depósito. **Celda:** E128. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/depositos/anulacion-de-deposito`.

**Objetivo y vista:** Reversar un depósito publicado únicamente cuando la conciliación y sus dependencias permiten deshacerlo, restaurando efectivo o cheques en tránsito sin borrar el depósito original. Listado de depósitos publicados con filtros por empresa, cuenta, fecha, referencia, estado de conciliación y medio.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada); deposito (busqueda; requerido; depósito PUBLICADO y perteneciente a la empresa); motivo (texto_largo; requerido; 20-1000 caracteres y catálogo de motivo); soportes (archivos; requerido; al menos una evidencia según política); fecha_efecto (fecha; requerido; periodo abierto y no anterior a controles aprobados); confirmacion_dependencias (checkbox; requerido; revisión expresa de conciliación y partidas relacionadas).

**Columnas visibles:** Depósito; Cuenta; Fecha; Valor; Estado conciliación; Orígenes; Asiento original; Estado.

**Acciones y permisos:** Evaluar anulación → calcula dependencias y elegibilidad sin modificar datos [permiso: banks.deposit.reverse_request]; Solicitar reverso → crea solicitud con motivo y evidencia [permiso: banks.deposit.reverse_request]; Aprobar reverso → autoriza la operación segregada [permiso: banks.deposit.reverse_approve]; Ejecutar anulación → publica reverso y restaura partidas elegibles [permiso: banks.deposit.reverse_post]; Ver auditoría → consulta cadena de eventos y soportes [permiso: banks.deposit.read].

**Proceso que debe ejecutar:**

1. Seleccionar el depósito publicado y cargar su composición y conciliaciones.
2. Capturar motivo, fecha de efecto, evidencia y confirmación de dependencias.
3. Validar que periodo, permisos, conciliación y movimientos relacionados permiten reversar.
4. Solicitar y obtener aprobación independiente con snapshot del depósito.
5. Publicar asiento reverso atómico y restaurar efectivo/cheques en tránsito no comprometidos.
6. Marcar el depósito ANULADO, mantener original y notificar impactos pendientes.

**Estados:** PUBLICADO; REVERSO_SOLICITADO; REVERSO_APROBADO; ANULADO; BLOQUEADO_POR_CONCILIACION; REVERSO_RECHAZADO. **Validaciones:** Exigir motivo, evidencia, versión y segregación de funciones.; Bloquear reverso si el extracto conciliado no fue deshecho por el flujo autorizado.; Verificar periodo abierto y que todas las líneas no tengan dependencias incompatibles.; Usar reverso idempotente; una segunda ejecución devuelve el resultado existente.; Separar cualquier anulación fiscal o documental de este reverso contable..

**Persistencia e impacto contable:** No se edita ni elimina el asiento original. Se crea un asiento reverso enlazado que devuelve el saldo a efectivo o cheques en tránsito y deshace las aplicaciones bancarias que correspondan. Si existen pagos, cierres o conciliaciones dependientes, se bloquea o exige un flujo previo aprobado; nunca se fuerza el saldo mediante actualización directa.

**API propia propuesta:** GET /api/v1/treasury/deposits/{id}/reverse-impact; POST /api/v1/treasury/deposits/{id}/reverse-requests; POST /api/v1/treasury/deposit-reversals/{id}/approve; POST /api/v1/treasury/deposit-reversals/{id}/post; GET /api/v1/treasury/deposit-reversals/{id}/audit. **Pantallas relacionadas:** XLS-085; XLS-086; XLS-093; XLS-095. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: un depósito publicado no conciliado y sin pagos dependientes; cuando: se solicita, aprueba y ejecuta su anulación; entonces: se publica el reverso, se restauran los orígenes y el histórico conserva ambos asientos enlazados

**Prueba negativa:** dado: un depósito conciliado sin reversión previa del match; cuando: se intenta ejecutarlo; entonces: la API bloquea la acción, conserva el estado original y explica la dependencia

**Evidencias/pruebas exigidas:** `T-UI-XLS-087`, `T-PROC-XLS-087`, `T-NEG-XLS-087`.

### XLS-088 — Cambio de Cheque

**Ubicación original:** Contabilidad > Bancos > Cheques > Cambio de Cheque. **Celda:** E130. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/cheques/cambio-de-cheque`.

**Objetivo y vista:** Sustituir un cheque emitido por otro con cancelación controlada del anterior, secuencia nueva, vínculo y motivo, evitando reconocer un segundo gasto o duplicar la deuda pagada. Pantalla independiente con búsqueda de cheque emitido, filtros por empresa, cuenta, beneficiario, estado y fecha.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada); cheque_original (busqueda; requerido; cheque emitido elegible y no sustituido); motivo (selector_mas_texto; requerido; causa catalogada y detalle mínimo 20 caracteres); fecha_sustitucion (fecha; requerido; periodo abierto); beneficiario_confirmado (texto; requerido; coincide con beneficiario o cambio aprobado); soporte (archivo; requerido; evidencia legible y con hash).

**Columnas visibles:** Cheque original; Cuenta; Beneficiario; Egreso; Valor; Estado; Cheque sustituto; Fecha.

**Acciones y permisos:** Evaluar sustitución → muestra elegibilidad y efecto previsto [permiso: banks.check.replace_request]; Proponer cheque sustituto → reserva nueva secuencia sin publicar gasto adicional [permiso: banks.check.replace_request]; Aprobar cambio → autoriza cancelación y emisión vinculadas [permiso: banks.check.replace_approve]; Confirmar cambio → marca original SUSTITUIDO y nuevo cheque EMITIDO [permiso: banks.check.replace_post]; Ver vínculo → navega entre ambos cheques, egreso y asiento [permiso: banks.check.read].

**Proceso que debe ejecutar:**

1. Seleccionar cheque emitido elegible y revisar estado, egreso y aplicaciones.
2. Capturar causa, fecha, beneficiario confirmado, soporte y datos operativos del reemplazo.
3. Validar que no esté cobrado/anulado, que el importe y obligación sean consistentes y que la secuencia sea nueva.
4. Obtener aprobación segregada con vista previa de vínculos y reversos.
5. Cancelar lógicamente el cheque anterior y emitir el sustituto sin duplicar gasto ni deuda.
6. Consultar el encadenamiento, auditoría y eventual conciliación del nuevo cheque.

**Estados:** EMITIDO; SOLICITUD_CAMBIO; APROBADO; SUSTITUIDO; BLOQUEADO; RECHAZADO. **Validaciones:** No permitir cambio de cheque COBRADO, ANULADO o ya SUSTITUIDO.; Generar la secuencia en backend con lock y no reutilizar números.; Conservar saldo, tercero, aplicaciones y asiento de origen.; Exigir soporte y segregación de funciones según política.; Recalcular conciliación y alertar si el cheque original estaba en extracto..

**Persistencia e impacto contable:** El gasto y la obligación CxP permanecen únicos. Según el estado del cheque, se registra la cancelación/reverso necesario y se crea el nuevo instrumento enlazado; no se vuelve a debitar gasto ni se aplica dos veces la deuda. El cheque original queda histórico como SUSTITUIDO y el nuevo conserva la misma referencia de pago lógico.

**API propia propuesta:** GET /api/v1/treasury/checks/{id}/replace-impact; POST /api/v1/treasury/check-replacements; POST /api/v1/treasury/check-replacements/{id}/approve; POST /api/v1/treasury/check-replacements/{id}/post; GET /api/v1/treasury/checks/{id}/links. **Pantallas relacionadas:** XLS-085; XLS-089; XLS-090; XLS-091; XLS-092. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: un cheque emitido por USD 500 aún no cobrado y un soporte de reemplazo válido; cuando: se aprueba y confirma el cambio; entonces: el original queda SUSTITUIDO, se genera una nueva secuencia y el gasto/CxP siguen siendo USD 500 una sola vez

**Prueba negativa:** dado: un cheque COBRADO; cuando: se intenta sustituirlo; entonces: la operación se bloquea y no crea cheque nuevo ni asiento

**Evidencias/pruebas exigidas:** `T-UI-XLS-088`, `T-PROC-XLS-088`, `T-NEG-XLS-088`.

### XLS-089 — Reimpresión de Cheque

**Ubicación original:** Contabilidad > Bancos > Cheques > Reimpresión de Cheque. **Celda:** E131. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/cheques/reimpresion-de-cheque`.

**Objetivo y vista:** Permitir reimprimir la representación de un cheque existente con control de permiso, motivo, versión documental y auditoría, sin crear pago, asiento, número ni aplicación nuevos. Pantalla separada del cambio de cheque, con buscador por número, egreso, beneficiario, fecha y estado.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada); cheque (busqueda; requerido; cheque existente y visible al usuario); motivo (texto_largo; requerido; 10-500 caracteres); formato (selector; requerido; plantilla vigente autorizada); destino (selector; requerido; impresora o descarga permitida); confirmacion_no_contable (checkbox; requerido; acepta que no genera contabilización).

**Columnas visibles:** Cheque; Egreso; Beneficiario; Valor; Fecha; Estado; Última impresión; Impresiones.

**Acciones y permisos:** Previsualizar → renderiza copia fiel con marca de control [permiso: banks.check.read]; Reimprimir → genera nueva copia documental y auditoría, sin mutación contable [permiso: banks.check.reprint]; Descargar evidencia → descarga la representación autorizada con registro [permiso: banks.check.reprint]; Consultar historial → muestra todas las impresiones y usuarios [permiso: banks.check.read].

**Proceso que debe ejecutar:**

1. Seleccionar el cheque existente y verificar empresa, estado y permisos.
2. Capturar motivo, formato y destino de la copia.
3. Validar que los datos del cheque no hayan sido alterados y que la plantilla sea vigente.
4. Mostrar vista previa idéntica al documento fuente con marca de reimpresión.
5. Confirmar y generar solo un artefacto documental con idempotencia de solicitud.
6. Registrar auditoría y permitir consulta sin nuevo asiento, pago o número.

**Estados:** EMITIDO; ENTREGADO; COBRADO; SUSTITUIDO; ANULADO; REIMPRESION_SOLICITADA. **Validaciones:** No aceptar campos contables ni número nuevo en el comando.; Exigir permiso específico y motivo; auditar descarga e impresión.; Verificar versión de plantilla, hash del cheque y acceso por empresa.; Usar idempotency key para doble clic, devolviendo el mismo artefacto.; No permitir reimpresión de un borrador que nunca fue emitido..

**Persistencia e impacto contable:** Cero impacto contable. Reimprimir no cambia estado de pago, no consume numeración, no vuelve a aplicar CxP y no genera asiento. Solo crea un artefacto o evento de impresión vinculado al cheque original, con hash de plantilla y auditoría. Si el contenido es incorrecto, la navegación dirige a cambio, anulación o reverso según corresponda.

**API propia propuesta:** GET /api/v1/treasury/checks/{id}/print-preview; POST /api/v1/treasury/checks/{id}/reprints; GET /api/v1/treasury/checks/{id}/reprints; GET /api/v1/treasury/check-reprints/{id}/artifact. **Pantallas relacionadas:** XLS-085; XLS-088; XLS-090; XLS-092. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: un cheque emitido y un usuario con permiso de reimpresión; cuando: confirma una copia con motivo; entonces: se genera el documento marcado, se registra auditoría y permanecen idénticos número, estado y asiento

**Prueba negativa:** dado: un usuario sin permiso o un intento de cambiar el importe durante la reimpresión; cuando: envía la solicitud; entonces: la API rechaza la operación y no crea artefacto ni movimiento contable

**Evidencias/pruebas exigidas:** `T-UI-XLS-089`, `T-PROC-XLS-089`, `T-NEG-XLS-089`.

### XLS-090 — Emisión de Egreso

**Ubicación original:** Contabilidad > Bancos > Egresos > Emisión de Egreso. **Celda:** E133. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/egresos/emision-de-egreso`.

**Objetivo y vista:** Emitir un egreso aprobado para pagar obligaciones o anticipos, con beneficiario, medio, cuenta bancaria, soportes y aplicación a CxP, bloqueando pagos duplicados y separando estados de negocio, contable y tributario. Formulario transaccional con selector de empresa, beneficiario y deuda CxP; cabecera de fecha, moneda, medio y cuenta; detalle de aplicaciones, retenciones/anticipos disponibles, soporte y observaciones.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada y periodo abierto); beneficiario (tercero; requerido; tercero activo con cuenta/datos validados); fecha_egreso (fecha; requerido; periodo abierto); medio_pago (selector; requerido; TRANSFERENCIA, CHEQUE, EFECTIVO u otro configurado); cuenta_origen (selector; requerido; cuenta activa y moneda compatible); aplicaciones_cxp (tabla_decimal; requerido; saldo disponible, tercero coincidente y suma positiva); soportes (archivos; requerido; evidencia requerida por política).

**Columnas visibles:** Egreso; Beneficiario; Fecha; Medio; Cuenta; Valor; Aplicado CxP; Estado.

**Acciones y permisos:** Crear egreso → guarda borrador sin afectar saldos [permiso: banks.disbursement.create]; Validar duplicidad → calcula conflictos y saldo aplicable [permiso: banks.disbursement.validate]; Solicitar aprobación → envía snapshot al aprobador [permiso: banks.disbursement.submit]; Emitir egreso → publica pago, aplicaciones y cheque/transferencia una vez [permiso: banks.disbursement.post]; Consultar resultado → muestra estados, soportes y asiento [permiso: banks.disbursement.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, beneficiario, obligación CxP y medio de pago.
2. Capturar importe, aplicaciones, cuenta, fecha, soporte y referencias.
3. Validar saldo, tercero, duplicidad, moneda, periodo, retenciones y numeración.
4. Presentar vista previa y obtener aprobación conforme umbral y segregación.
5. Publicar asiento, reducir CxP y emitir cheque/transferencia con idempotencia.
6. Consultar confirmación, estado bancario, documento y auditoría.

**Estados:** BORRADOR; VALIDANDO; PENDIENTE_APROBACION; EMITIDO; PENDIENTE_CONFIRMACION; ANULADO; RECHAZADO. **Validaciones:** Bloquear importe mayor al saldo disponible salvo anticipo explícito y autorizado.; Detectar duplicados por empresa, tercero, obligación, importe y referencia sin ocultar falsos positivos.; No publicar en periodo cerrado ni con cuenta o numerador inactivo.; Aplicar locks sobre saldo CxP y clave idempotente.; Mantener estados contable y tributario separados; no fijar tasas en código..

**Persistencia e impacto contable:** Al emitir, se reduce la obligación CxP mediante aplicaciones y se acredita banco, caja o cuenta puente; retenciones y anticipos se contabilizan según configuración versionada. No se permite pagar dos veces el mismo saldo. Un timeout externo conserva resultado incierto y exige conciliación, no reenvío ciego. Reversos posteriores usan la pantalla de anulación.

**API propia propuesta:** GET /api/v1/payables/items/available-for-payment; POST /api/v1/treasury/disbursements; POST /api/v1/treasury/disbursements/{id}/validate; POST /api/v1/treasury/disbursements/{id}/submit; POST /api/v1/treasury/disbursements/{id}/post; GET /api/v1/treasury/disbursements/{id}. **Pantallas relacionadas:** XLS-085; XLS-088; XLS-089; XLS-091; XLS-094; XLS-095. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: una factura CxP abierta por USD 800 y cuenta bancaria activa; cuando: se crea, aprueba y emite un egreso de USD 800; entonces: la deuda queda pagada, el banco se acredita una vez, el asiento y soporte quedan enlazados

**Prueba negativa:** dado: un pago ya emitido para la misma obligación y saldo cero; cuando: se intenta emitir otro egreso; entonces: la validación bloquea la publicación y no duplica deuda ni asiento

**Evidencias/pruebas exigidas:** `T-UI-XLS-090`, `T-PROC-XLS-090`, `T-NEG-XLS-090`.

### XLS-091 — Anulación de Egreso

**Ubicación original:** Contabilidad > Bancos > Egresos > Anulación de Egreso. **Celda:** E134. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/egresos/anulacion-de-egreso`.

**Objetivo y vista:** Reversar un egreso emitido y restituir la deuda o anticipo, resolviendo cheque, transferencia y conciliación relacionadas con evidencia y aprobación. Listado de egresos emitidos con filtros por empresa, beneficiario, fecha, medio, estado de cheque, conciliación y obligación.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada); egreso (busqueda; requerido; egreso EMITIDO elegible); motivo (selector_mas_texto; requerido; motivo y explicación mínima); fecha_efecto (fecha; requerido; periodo abierto y calendario válido); soportes (archivos; requerido; evidencia y hash obligatorios); plan_dependencias (texto_largo; requerido; describe cheque/conciliación y resolución).

**Columnas visibles:** Egreso; Beneficiario; Fecha; Valor; Medio; CxP aplicada; Conciliación; Estado.

**Acciones y permisos:** Evaluar impacto → muestra dependencias y asiento reverso previsto [permiso: banks.disbursement.reverse_request]; Solicitar anulación → crea solicitud con evidencia y snapshot [permiso: banks.disbursement.reverse_request]; Aprobar anulación → autoriza reverso segregado [permiso: banks.disbursement.reverse_approve]; Ejecutar anulación → publica reverso y restituye deuda o anticipo [permiso: banks.disbursement.reverse_post]; Ver tareas fiscales → consulta el estado fiscal separado sin asumir API pública [permiso: tax.read].

**Proceso que debe ejecutar:**

1. Seleccionar egreso y revisar obligación, instrumento, conciliación y estados separados.
2. Capturar motivo, fecha, evidencia y plan para dependencias.
3. Validar periodo, saldo, cheque/transferencia, conciliación y permisos.
4. Obtener aprobación con vista previa de reversos y restauración.
5. Resolver o enlazar la dependencia bancaria y publicar reverso contable atómico.
6. Marcar egreso ANULADO, restituir deuda/anticipo y dejar auditoría consultable.

**Estados:** EMITIDO; ANULACION_SOLICITADA; ANULACION_APROBADA; ANULADO; BLOQUEADO; RECHAZADO. **Validaciones:** Impedir borrar o editar el egreso publicado.; Bloquear si el instrumento cobrado o la conciliación no tienen ruta de resolución aprobada.; Aplicar locks a saldo CxP, cheque y estado de conciliación.; No ejecutar anulación fiscal desde este comando ni asumir servicio público.; Hacer reverso idempotente y auditar actor, motivo, fechas y soportes..

**Persistencia e impacto contable:** Se conserva el egreso y su asiento original; se publica un reverso enlazado que acredita nuevamente la obligación CxP o devuelve el anticipo, y revierte el crédito bancario según plantilla. Si el cheque fue sustituido o cobrado, se obliga a resolver la cadena. La anulación fiscal, cuando aplique, queda separada y pendiente de canal autorizado, sin crear un endpoint SRI ficticio.

**API propia propuesta:** GET /api/v1/treasury/disbursements/{id}/reverse-impact; POST /api/v1/treasury/disbursement-reversals; POST /api/v1/treasury/disbursement-reversals/{id}/approve; POST /api/v1/treasury/disbursement-reversals/{id}/post; GET /api/v1/treasury/disbursement-reversals/{id}. **Pantallas relacionadas:** XLS-085; XLS-088; XLS-090; XLS-092; XLS-093; XLS-094. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: un egreso emitido no conciliado y una CxP pagada por USD 300; cuando: se aprueba y ejecuta la anulación; entonces: se publica reverso por USD 300, la deuda vuelve a abierta y el egreso original queda histórico

**Prueba negativa:** dado: un egreso con cheque cobrado sin procedimiento de resolución; cuando: se intenta anular directamente; entonces: se bloquea, no se toca saldo ni se publica reverso parcial

**Evidencias/pruebas exigidas:** `T-UI-XLS-091`, `T-PROC-XLS-091`, `T-NEG-XLS-091`.

### XLS-092 — Rep. Cheques Emitidos

**Ubicación original:** Contabilidad > Bancos > Reportes > Rep. Cheques Emitidos. **Celda:** E136. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/reportes/rep-cheques-emitidos`.

**Objetivo y vista:** Listar cheques emitidos al corte o en un intervalo, filtrando estado, vencimiento, cuenta y beneficiario, e identificando sustituidos y anulados con totales conciliables y navegación al origen. Reporte dedicado con filtros de empresa, cuenta, fecha de emisión, fecha de corte, beneficiario, número, estado y rango de valor.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada); cuenta_bancaria (multiseleccion; opcional/condicional; cuentas visibles); desde_hasta (rango_fecha; requerido; rango válido y corte explícito); estado_cheque (multiseleccion; opcional/condicional; estados emitido/entregado/cobrado/anulado/sustituido); beneficiario (texto; opcional/condicional; búsqueda normalizada); vencimiento (rango_fecha; opcional/condicional; rango opcional consistente); formato (selector; requerido; pantalla, CSV o XLSX permitido).

**Columnas visibles:** Número; Sustituye a; Beneficiario; Egreso; Fecha emisión; Vencimiento; Valor; Estado cheque; Estado conciliación.

**Acciones y permisos:** Consultar reporte → calcula filas y totales al corte con snapshot [permiso: reports.banks.checks.read]; Exportar → genera archivo con mismos filtros, columnas y totales [permiso: reports.banks.checks.export]; Abrir cheque → navega al origen y conserva filtros de retorno [permiso: banks.check.read]; Abrir egreso/asiento → navega a documentos y libro publicados [permiso: accounting.journal.read]; Ver auditoría → muestra cambios, sustituciones y anulaciones [permiso: audit.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, corte/intervalo y filtros de cuenta, estado o beneficiario.
2. Validar permisos, fechas, periodo y consistencia del corte solicitado.
3. Consultar cheques y estados derivados de eventos publicados, sin editar datos.
4. Calcular totales por estado, vencimiento y valor con la misma semántica de exportación.
5. Revisar excepciones y navegar a cheque, egreso, asiento o conciliación.
6. Exportar un snapshot autorizado y registrar filtros, usuario y fecha.

**Estados:** BORRADOR; EMITIDO; ENTREGADO; COBRADO; ANULADO; SUSTITUIDO. **Validaciones:** Exigir as_of o from/to explícito y empresa autorizada.; Usar estados de negocio, contable y conciliación separados.; No mostrar ni exportar datos de otra empresa.; Totalizar con Decimal y reproducir el mismo resultado en pantalla y archivo.; Neutralizar fórmulas en CSV/XLSX y auditar exportaciones..

**Persistencia e impacto contable:** Es de solo consulta y no publica movimientos. Incluye únicamente documentos y reversos efectivos al corte; muestra el valor del cheque y su estado sin confundir disponibilidad bancaria con efectivo conciliado. Sustituciones y anulaciones se exponen como relaciones históricas, no se ocultan ni se cuentan como un segundo gasto.

**API propia propuesta:** GET /api/v1/reports/banks/issued-checks; POST /api/v1/report-exports; GET /api/v1/treasury/checks/{id}; GET /api/v1/accounting/journals/{id}. **Pantallas relacionadas:** XLS-085; XLS-088; XLS-089; XLS-090; XLS-091; XLS-093. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: tres cheques emitidos, uno sustituido y uno anulado dentro del corte; cuando: un usuario consulta por estado y exporta; entonces: la tabla y el archivo muestran las nueve columnas pactadas, totales por estado y enlaces correctos sin duplicar gasto

**Prueba negativa:** dado: un rango sin fecha de corte o una empresa no autorizada; cuando: se solicita el reporte; entonces: la API rechaza la consulta y no devuelve filas ni totales

**Evidencias/pruebas exigidas:** `T-UI-XLS-092`, `T-PROC-XLS-092`, `T-NEG-XLS-092`.

### XLS-093 — Rep. Saldo en Bancos

**Ubicación original:** Contabilidad > Bancos > Reportes > Rep. Saldo en Bancos. **Celda:** E137. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/reportes/rep-saldo-en-bancos`.

**Objetivo y vista:** Mostrar por cuenta y corte el saldo contable, saldo conciliado, saldo de extracto y diferencias explicadas, distinguiendo claramente efectivo disponible, partidas en tránsito y pendientes. Reporte con selector de empresa, fecha de corte y cuenta, tarjeta de saldos separados y panel de conciliación.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada); fecha_corte (fecha; requerido; fecha comercial válida); cuentas (multiseleccion; opcional/condicional; cuentas bancarias autorizadas); incluir_pendientes (checkbox; requerido; define si se detallan partidas abiertas); estado_conciliacion (multiseleccion; opcional/condicional; SUGERIDO/CONFIRMADO/DESCARTADO/EXCEPCION); formato (selector; requerido; pantalla, CSV o XLSX permitido).

**Columnas visibles:** Cuenta; Saldo contable; Saldo conciliado; Saldo extracto; Depósitos tránsito; Cheques pendientes; Ajustes aprobados; Diferencia; Última conciliación.

**Acciones y permisos:** Consultar saldo → calcula saldos al corte y resumen por cuenta [permiso: reports.banks.balance.read]; Ver pendientes → abre partidas de extracto/libro y su estado [permiso: banks.reconciliation.read]; Abrir conciliación → navega al grupo o cierre de conciliación [permiso: banks.reconciliation.read]; Exportar → descarga snapshot con columnas y totales idénticos [permiso: reports.banks.balance.export]; Abrir mayor → navega a movimientos publicados de la cuenta [permiso: accounting.journal.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, fecha de corte, cuentas y detalle de pendientes.
2. Validar acceso, fecha y existencia de extractos/conciliaciones aplicables.
3. Leer únicamente movimientos publicados, reversos efectivos y líneas de extracto versionadas.
4. Separar saldo contable, conciliado, extracto, tránsito y diferencia explicada.
5. Presentar totales y permitir navegación a partidas, ajustes aprobados y mayor.
6. Exportar snapshot con los mismos filtros, fórmulas y auditoría.

**Estados:** SIN_EXTRACTO; IMPORTADO; EN_CONCILIACION; CONCILIADO; CON_DIFERENCIAS; CERRADO. **Validaciones:** Exigir corte explícito y bloquear acceso entre empresas.; Conciliar totales con el mayor de la misma cuenta y fecha.; No inferir signos de extracto; usar importe firmado normalizado.; Marcar diferencia no explicada en vez de ocultarla o redondearla.; Usar la misma precisión y semántica para pantalla y exportación..

**Persistencia e impacto contable:** No contabiliza. El saldo contable proviene del libro publicado; conciliado y extracto son vistas de control independientes. Depósitos y cheques en tránsito se muestran como partidas explicativas, no como incremento artificial del banco. Los ajustes solo afectan el informe cuando tienen aprobación y asiento asociado.

**API propia propuesta:** GET /api/v1/reports/banks/balances; GET /api/v1/treasury/bank-accounts/{id}/reconciliation-summary; GET /api/v1/treasury/reconciliations/{id}/items; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-085; XLS-086; XLS-087; XLS-090; XLS-091; XLS-094; XLS-095. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: una cuenta con saldo contable USD 1000, extracto USD 950 y cheque pendiente USD 50; cuando: se consulta el corte; entonces: el reporte separa los tres saldos, muestra la partida pendiente y no etiqueta USD 1000 como efectivo disponible conciliado

**Prueba negativa:** dado: un corte omitido o un extracto con signos ambiguos sin normalización; cuando: se intenta generar el reporte; entonces: la API solicita datos explícitos y no calcula una diferencia engañosa

**Evidencias/pruebas exigidas:** `T-UI-XLS-093`, `T-PROC-XLS-093`, `T-NEG-XLS-093`.

### XLS-094 — Rep. Mayor de Cuentas

**Ubicación original:** Contabilidad > Bancos > Reportes > Rep. Mayor de Cuentas. **Celda:** E138. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/reportes/rep-mayor-de-cuentas`.

**Objetivo y vista:** Generar el mayor de cada cuenta bancaria desde asientos publicados y reversos efectivos, con referencias de depósito, cheque, egreso, conciliación y saldo acumulado al corte. Reporte de mayor con empresa, cuenta bancaria, fecha inicial/final, fecha de corte y filtros de tipo de movimiento, documento, beneficiario y estado de conciliación.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada); cuenta_bancaria (selector; requerido; cuenta activa o histórica visible); desde_hasta (rango_fecha; requerido; desde no mayor que hasta); fecha_corte (fecha; requerido; igual o posterior a hasta); tipos_movimiento (multiseleccion; opcional/condicional; catálogo de movimientos bancarios); estado_conciliacion (multiseleccion; opcional/condicional; estados de conciliación válidos); formato (selector; requerido; pantalla, CSV o XLSX permitido).

**Columnas visibles:** Fecha; Asiento; Documento origen; Referencia; Descripción; Débito; Crédito; Saldo acumulado; Conciliación.

**Acciones y permisos:** Generar mayor → consulta asientos publicados y calcula saldo al corte [permiso: reports.banks.ledger.read]; Exportar → crea archivo con igual snapshot, columnas y totales [permiso: reports.banks.ledger.export]; Abrir asiento → navega al asiento inmutable y su auditoría [permiso: accounting.journal.read]; Abrir origen → navega a depósito, egreso, cheque o ajuste [permiso: banks.transaction.read]; Ver conciliación → muestra match de extracto relacionado [permiso: banks.reconciliation.read].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, cuenta, intervalo, corte y filtros opcionales.
2. Validar permisos, periodo y que la cuenta pertenezca a la empresa.
3. Leer asientos publicados y reversos efectivos con referencias de origen.
4. Calcular saldo inicial, movimientos, débitos, créditos y saldo acumulado con Decimal.
5. Presentar totales, estados de conciliación y navegación a documentos fuente.
6. Generar exportación autorizada con el snapshot exacto y registrar auditoría.

**Estados:** GENERANDO; LISTO; SIN_MOVIMIENTOS; CON_EXCEPCIONES; EXPORTADO. **Validaciones:** Usar from/to y as_of explícitos, con zona comercial definida.; Filtrar exclusivamente por empresa y cuenta autorizadas.; Excluir asientos no publicados y explicar cualquier referencia huérfana.; Reconciliar saldo final con balance de comprobación de la cuenta.; Escapar valores peligrosos al exportar sin alterar importes..

**Persistencia e impacto contable:** Solo consulta el libro canónico. No incluye borradores ni cambia asientos. Un reverso aparece como movimiento separado y conserva la referencia al original. Las referencias de conciliación enriquecen la vista pero no sustituyen el saldo contable ni permiten editarlo desde el reporte.

**API propia propuesta:** GET /api/v1/reports/banks/ledger; GET /api/v1/accounting/journals/{id}; GET /api/v1/treasury/reconciliations/matches; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-085; XLS-086; XLS-087; XLS-090; XLS-091; XLS-093; XLS-095. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: una cuenta con asientos de depósito, egreso y un reverso publicado; cuando: se genera el mayor del mes; entonces: la tabla muestra cada movimiento y el saldo final coincide con el libro, con enlaces a sus orígenes

**Prueba negativa:** dado: un asiento en BORRADOR; cuando: se solicita el mayor; entonces: no aparece en filas ni totales y la API no permite incluirlo mediante un filtro arbitrario

**Evidencias/pruebas exigidas:** `T-UI-XLS-094`, `T-PROC-XLS-094`, `T-NEG-XLS-094`.

### XLS-095 — Rep. Movimientos Bancarios

**Ubicación original:** Contabilidad > Bancos > Reportes > Rep. Movimientos Bancarios. **Celda:** E139. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/contabilidad/bancos/reportes/rep-movimientos-bancarios`.

**Objetivo y vista:** Listar movimientos bancarios con fecha, valor, medio, referencia y documento, distinguiendo extracto de libro y mostrando el estado de emparejamiento sin confundir fuentes. Reporte dedicado con pestañas Libro, Extracto y Comparación; filtros por empresa, cuenta, periodo, origen, medio, estado de conciliación, referencia, importe y tercero.

**Campos y filtros:** empresa (selector; requerido; empresa autorizada); cuenta_bancaria (selector; requerido; cuenta visible y activa/histórica); desde_hasta (rango_fecha; requerido; rango comercial válido); fuente (selector; requerido; LIBRO, EXTRACTO o COMPARACION); medio (multiseleccion; opcional/condicional; catálogo de medios bancarios); estado_conciliacion (multiseleccion; opcional/condicional; SUGERIDO/CONFIRMADO/DESCARTADO/EXCEPCION); referencia_importe (texto_y_decimal; opcional/condicional; búsqueda exacta o normalizada); formato (selector; requerido; pantalla, CSV o XLSX permitido).

**Columnas visibles:** Fuente; Fecha; Valor firmado; Medio; Referencia; Documento/Asiento; Tercero; Grupo match; Estado; Diferencia.

**Acciones y permisos:** Consultar movimientos → lista líneas según fuente y corte [permiso: reports.banks.movements.read]; Abrir línea de extracto → muestra archivo, hash y datos originales [permiso: banks.statement.read]; Abrir movimiento de libro → navega al documento y asiento publicados [permiso: accounting.journal.read]; Abrir grupo de conciliación → muestra miembros, total y decisión [permiso: banks.reconciliation.read]; Exportar → genera snapshot con fuentes y columnas separadas [permiso: reports.banks.movements.export].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, cuenta, intervalo, fuente y filtros de medio/estado.
2. Validar acceso, existencia de extracto y normalización de importes firmados.
3. Consultar líneas originales del extracto o movimientos publicados del libro.
4. Comparar solo mediante grupos de conciliación aprobados, mostrando diferencia y tolerancia.
5. Permitir navegación a origen sin modificar ni aprobar desde el reporte.
6. Exportar resultados separados por fuente, con totales, hash y auditoría.

**Estados:** IMPORTADO; SUGERIDO; CONFIRMADO; DESCARTADO; EXCEPCION; PUBLICADO. **Validaciones:** Separar fuente y no mezclar extracto con libro en una única columna ambigua.; Conservar saldo y referencia originales del archivo importado junto a normalizados.; No inferir cargo/abono desde texto libre; exigir importe firmado.; Calcular totales y diferencias con Decimal y snapshot estable.; Aplicar control de exportación y navegación por empresa..

**Persistencia e impacto contable:** Es un reporte de consulta. El extracto no modifica el libro y una coincidencia no publica por sí misma. Los movimientos de libro provienen de asientos publicados; las diferencias, comisiones o intereses requieren operación y aprobación aparte. La exportación conserva el signo normalizado y la línea original para trazabilidad.

**API propia propuesta:** GET /api/v1/reports/banks/movements; GET /api/v1/treasury/statements/{id}/lines; GET /api/v1/treasury/reconciliations/{id}/matches; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-085; XLS-086; XLS-087; XLS-090; XLS-091; XLS-093; XLS-094. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: un extracto con dos líneas, un movimiento de libro y un match confirmado; cuando: se consulta la pestaña Comparación; entonces: se muestran columnas paralelas, grupo confirmado, diferencia explicada y totales separados por fuente

**Prueba negativa:** dado: una línea con descripción 'cargo' pero sin importe firmado; cuando: se intenta incluirla en movimientos comparables; entonces: queda EXCEPCION y el reporte no inventa su signo ni la empareja automáticamente

**Evidencias/pruebas exigidas:** `T-UI-XLS-095`, `T-PROC-XLS-095`, `T-NEG-XLS-095`.

### Procesos integrales del grupo

**Alta y control de cuenta bancaria**. Secuencia: XLS-085; XLS-093; XLS-094. Crear una cuenta por empresa con banco, moneda y cuenta contable; aprobar y activar; ejecutar operaciones de bancos; cargar extractos y cerrar conciliaciones; consultar saldo y mayor con corte. La empresa opera completamente sin condominio, inmueble ni alícuota. Resultado: La configuración no genera asiento. Las operaciones posteriores usan la cuenta activa; los reportes concilian el libro publicado con el extracto y conservan diferencias explicadas. Prueba: dado: empresa sin módulo inmobiliario, cuenta nueva y extracto válido; cuando: se aprueba el alta, se publica un movimiento y se genera saldo y mayor al corte; entonces: la cuenta opera, el asiento aparece una sola vez, el saldo final coincide con el mayor y ningún campo inmobiliario fue requerido

**Recaudación, depósito y reverso controlado**. Secuencia: XLS-086; XLS-087; XLS-093; XLS-095. Seleccionar recaudaciones en efectivo/cheques en tránsito; preparar y aprobar ingreso de depósito; publicar transferencia a banco; importar extracto y emparejar; si existe una causa aprobada, deshacer conciliación y anular el depósito desde su pantalla dedicada. Resultado: El depósito mueve fondos entre cuentas puente y banco, sin nuevo ingreso. La anulación conserva el asiento original y publica un reverso que restaura los orígenes, con conciliación y auditoría actualizadas. Prueba: dado: recaudaciones disponibles por USD 150 y una cuenta bancaria activa; cuando: se deposita, se concilia y luego se revierte con evidencia y aprobación; entonces: el primer asiento transfiere USD 150 sin nuevo ingreso, el match se deshace, el reverso restaura tránsito y el histórico queda íntegro

**Egreso, cheque, sustitución y reimpresión**. Secuencia: XLS-090; XLS-088; XLS-089; XLS-092. Crear egreso aplicado a CxP, aprobarlo y emitirlo por cheque; si el cheque no se cobra, sustituirlo mediante la pantalla de cambio; reimprimir cualquiera de los documentos desde su pantalla independiente; consultar el reporte de cheques con relación original/sustituto. Resultado: El pago reduce la CxP una sola vez. La sustitución cancela lógicamente el instrumento anterior y conserva el mismo gasto/deuda; la reimpresión solo crea un artefacto auditado y no contabiliza. Prueba: dado: CxP abierta por USD 500 y cheque emitido no cobrado; cuando: se sustituye el cheque, se reimprime el nuevo y se consulta el reporte; entonces: solo existe una aplicación de USD 500, el original figura SUSTITUIDO, el nuevo tiene secuencia única y la reimpresión no crea pago adicional

**Anulación de egreso y restitución de deuda**. Secuencia: XLS-090; XLS-091; XLS-093; XLS-094. Localizar un egreso emitido, revisar cheque/transferencia, conciliación y CxP; solicitar anulación con evidencia; resolver dependencias; aprobar y publicar reverso; revisar saldo bancario y mayor. Resultado: El egreso publicado queda inmutable y se crea un reverso enlazado que restituye la deuda o anticipo y revierte banco según plantilla. Los reportes muestran original y reverso al corte. Prueba: dado: egreso de USD 300 aún no conciliado y obligación pagada; cuando: se aprueba y ejecuta su anulación y se consultan saldo y mayor; entonces: la obligación vuelve a abierta, el banco se revierte una vez y ambos asientos aparecen relacionados sin borrar el original

**Control y navegación de reportes bancarios**. Secuencia: XLS-092; XLS-093; XLS-094; XLS-095. Seleccionar empresa, cuenta, corte, intervalo y filtros; revisar cheques, saldo, mayor y movimientos en pestañas dedicadas; abrir origen, conciliación o extracto; exportar los mismos filtros y columnas. Resultado: No se generan asientos. Cada reporte usa publicados y reversos efectivos, separa extracto/libro y presenta totales conciliables sin convertir saldo contable en efectivo disponible. Prueba: dado: un periodo con depósitos, egresos, cheque sustituido, extracto y diferencia pendiente; cuando: se consultan los cuatro reportes al mismo corte y se exportan; entonces: los saldos y totales son consistentes, la diferencia queda visible, las filas navegan a sus orígenes y las exportaciones coinciden con la pantalla

## Tributación

### XLS-096 — Generación de Conciliación

**Ubicación original:** Tributación > Conciliación Compras > Generación de Conciliación. **Celda:** D142. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/tributacion/conciliacion-compras/generacion-de-conciliacion`.

**Objetivo y vista:** Conciliar, para una empresa y corte fiscal, compras registradas, documentos XML o soportes, retenciones y movimientos publicados del mayor. Encabezado con empresa, periodo y versión de corte; tarjetas de totales de compras, XML, retenciones, mayor y diferencias.

**Campos y filtros:** empresa (selector_empresa; requerido; Empresa autorizada y activa en el contexto del usuario.); periodo_desde (date; requerido; Fecha válida y no posterior a periodo_hasta; periodo existente.); periodo_hasta (date; requerido; Corte permitido y coherente con el ejercicio fiscal.); estado_diferencia (multiselect; opcional/condicional; Valores permitidos: pendiente, explicada, ajustable, aprobada, excluida_con_motivo.); soporte (select; opcional/condicional; Filtra con_xml, sin_xml, soporte_no_electronico o inválido.); tercero_o_clave (text; opcional/condicional; Búsqueda acotada a empresa; clave y RUC con formato permitido.).

**Columnas visibles:** fecha_documento; proveedor; tipo_documento; serie_secuencial; clave_acceso; base_imponible; tributos; retencion; total; mayor_publicado; diferencia; clasificacion; estado_contable; estado_fiscal; soporte.

**Acciones y permisos:** Crear corte de conciliación → Genera snapshot versionado e idempotente del periodo; no contabiliza. [permiso: tax.reconciliation.create]; Validar diferencias → Clasifica filas con motivo, evidencia y versión; conserva importes originales. [permiso: tax.reconciliation.validate]; Solicitar aprobación → Envía el snapshot inmutable al flujo de aprobación. [permiso: tax.reconciliation.submit]; Aprobar conciliación → Cierra el corte y deja ajustes pendientes dirigidos al documento de origen. [permiso: tax.reconciliation.approve]; Exportar detalle → Descarga el mismo snapshot y filtros visibles; no crea asiento ni documento fiscal. [permiso: tax.reconciliation.export].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, rango fiscal y fuentes habilitadas; el backend verifica permisos y toma una versión de corte.
2. Capturar criterios opcionales de soporte, tercero y clasificación, y cargar o vincular XML/soportes ya recibidos.
3. Validar identidad, duplicados, bases, tributos, retenciones, clave y correspondencia con compras y mayor publicado.
4. Revisar cada diferencia, registrar clasificación, motivo, evidencia y propuesta de corrección sin modificar el origen.
5. Enviar el snapshot a aprobación segregada; el aprobador acepta, devuelve o solicita corrección con bitácora.
6. Aplicar, si corresponde, una operación aprobada en el origen mediante reverso o ajuste; cerrar el corte y consultar resultados.

**Estados:** borrador; validando; con_diferencias; pendiente_aprobacion; aprobada; cerrada; devuelta; cancelada. **Validaciones:** Empresa y periodo pertenecen al usuario y no cruzan tenant.; La clave de acceso se valida con formato y unicidad contextual sin sustituir verificación fiscal.; XML, hash, XSD y respuesta conservan versión; ZIP/XML malicioso o inválido queda rechazado con motivo.; La suma de compras, retenciones y mayor muestra tolerancia explícita y diferencia explicada; nunca se redondea silenciosamente.; Toda exclusión requiere motivo y evidencia; una nueva ejecución del mismo snapshot es idempotente.; Correcciones contables solo se ejecutan desde el origen con aprobación y reverso relacionado..

**Persistencia e impacto contable:** La conciliación es una vista y snapshot de control: no duplica compras, retenciones ni asientos. Una diferencia aprobada genera una tarea o ajuste en el documento fuente y, si se publica, un asiento relacionado y reversible. El mayor consultado solo incluye movimientos publicados al corte. El estado de negocio de la compra, el estado contable del asiento y el estado fiscal del comprobante permanecen separados. No se modifican ni eliminan publicados.

**API propia propuesta:** POST /api/v1/tax/reconciliations; GET /api/v1/tax/reconciliations/{id}; POST /api/v1/tax/reconciliations/{id}/validate; POST /api/v1/tax/reconciliations/{id}/submit-approval; POST /api/v1/tax/reconciliations/{id}/approve; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-097; XLS-099. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Una empresa tiene compras registradas, XML válidos, retenciones y mayor publicado del mes, con una diferencia documentada.; cuando: El usuario valida la diferencia, adjunta soporte, solicita aprobación y el aprobador cierra el snapshot.; entonces: La conciliación queda cerrada con totales reproducibles, diferencia explicada, auditoría y navegación al origen, sin asiento duplicado.

**Prueba negativa:** dado: El usuario intenta incluir una compra de otra empresa o un XML duplicado y modificar un asiento publicado.; cuando: Ejecuta la validación o intenta guardar el cambio.; entonces: La API rechaza por alcance o duplicidad, conserva evidencia del intento y obliga a usar el flujo de reverso/origen.

**Evidencias/pruebas exigidas:** `T-UI-XLS-096`, `T-PROC-XLS-096`, `T-NEG-XLS-096`.

### XLS-097 — Compras Mensuales

**Ubicación original:** Tributación > Conciliación Compras > Compras Mensuales. **Celda:** D143. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/tributacion/conciliacion-compras/compras-mensuales`.

**Objetivo y vista:** Mostrar el universo mensual de compras de una empresa con bases, tributos, retenciones, documentos incluidos o excluidos y rectificaciones justificadas. Barra de filtros con empresa, mes fiscal, fechas, proveedor, código tributario, estado y motivo de exclusión.

**Campos y filtros:** empresa (selector_empresa; requerido; Empresa autorizada y con perfil tributario vigente para el corte.); mes_fiscal (month; requerido; Mes válido dentro de un ejercicio abierto o consultable.); proveedor (autocomplete_tercero; opcional/condicional; Tercero activo o histórico de la empresa seleccionada.); codigo_tributario (multiselect; opcional/condicional; Códigos existentes en el catálogo versionado del periodo.); estado_documento (multiselect; opcional/condicional; Estados de negocio, contable y fiscal independientes.); incluir_excluidos (boolean; opcional/condicional; Si es verdadero exige mostrar motivo y usuario de exclusión.).

**Columnas visibles:** fecha; proveedor; identificacion; tipo; serie_secuencial; clave_acceso; base; tributo_por_codigo; retencion; total; estado_negocio; estado_contable; estado_fiscal; rectificacion; motivo_exclusion; asiento.

**Acciones y permisos:** Consultar detalle → Abre origen, soportes, aplicaciones y asiento; no permite editar publicados. [permiso: tax.purchases.read]; Registrar rectificación → Crea una propuesta versionada vinculada al documento; requiere aprobación antes de efecto. [permiso: tax.purchases.rectify]; Marcar exclusión justificada → Excluye solo del snapshot indicado con motivo, soporte y auditoría. [permiso: tax.purchases.exclude]; Exportar reporte → Genera archivo con filtros, columnas, totales y snapshot; no contabiliza. [permiso: tax.purchases.export].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, mes fiscal y filtros; el backend fija corte, perfil tributario y versión de catálogos.
2. Capturar, si aplica, proveedor, códigos y criterio de inclusión de excluidos; mostrar advertencia sobre rectificaciones.
3. Validar que cada fila provenga de una compra o soporte trazable y calcular bases, tributos y retenciones con configuración vigente.
4. Revisar totales y abrir navegación al documento, soporte, retención, asiento y conciliación relacionada.
5. Solicitar aprobación para una rectificación o exclusión con motivo y evidencia; no aplicar cambios silenciosos.
6. Consultar o exportar el snapshot final y, si se aprobó una corrección, mostrar su efecto contable/fiscal separado.

**Estados:** consultable; snapshot_generado; con_rectificaciones; pendiente_aprobacion; rectificado; excluido_con_motivo; error_validacion. **Validaciones:** El rango pertenece a una única empresa y usa fecha fiscal explícita.; Bases y tributos se calculan desde matriz versionada por vigencia, concepto, régimen y operación; no desde constantes de interfaz.; Cada excluido tiene motivo, usuario, fecha y soporte; una compra anulada o rectificada mantiene su historial.; Los totales de pantalla y exportación usan el mismo snapshot y precisión decimal.; No se permite editar o borrar documentos o asientos publicados; se redirige a reverso, ajuste o documento relacionado.; La exportación bloquea fórmulas peligrosas y respeta permisos, tenant y filtros..

**Persistencia e impacto contable:** La pantalla lee compras, retenciones y asientos publicados y no genera un segundo gasto, impuesto o pasivo. Una rectificación aprobada se ejecuta en el documento de origen mediante documento relacionado, ajuste o reverso según corresponda; el reporte conserva ambas versiones y su fecha efectiva. El total contable no se altera por exportar o reconsultar. La clasificación fiscal se muestra con vigencia; no se hardcodean tarifas o porcentajes.

**API propia propuesta:** GET /api/v1/tax/purchases-monthly; GET /api/v1/tax/purchases-monthly/{snapshot_id}; POST /api/v1/tax/purchases/{purchase_id}/rectifications; POST /api/v1/tax/purchases/{purchase_id}/exclusions; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-096; XLS-098; XLS-099. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Existe un mes con compras gravadas, tarifa cero, retenciones y una rectificación aprobada.; cuando: El usuario filtra el mes, incluye excluidos justificados y exporta el reporte.; entonces: El reporte muestra bases, tributos, retenciones, rectificación, motivo y totales conciliables, con enlaces al origen y sin duplicar asientos.

**Prueba negativa:** dado: El usuario selecciona un código inexistente, un periodo de otra empresa o intenta cambiar una compra publicada desde la tabla.; cuando: Solicita consulta o guardado.; entonces: La API rechaza el filtro/cambio, no expone datos y ofrece únicamente el flujo autorizado de rectificación o reverso.

**Evidencias/pruebas exigidas:** `T-UI-XLS-097`, `T-PROC-XLS-097`, `T-NEG-XLS-097`.

### XLS-098 — Anexo Transaccional RDEP

**Ubicación original:** Tributación > Generación de Archivos XML > Anexo Transaccional RDEP. **Celda:** D145. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/tributacion/generacion-de-archivos-xml/anexo-transaccional-rdep`.

**Objetivo y vista:** Conservar el título original y ofrecer una pantalla dedicada con dos pestañas separadas: ATS para transacciones y RDEP para relación de dependencia. Encabezado con empresa, ambiente interno, periodo/año y versión de esquema.

**Campos y filtros:** empresa (selector_empresa; requerido; Empresa autorizada y perfil tributario visible.); pestana (tabs_enum; requerido; Solo ATS o RDEP; cada uno activa esquema y campos propios.); periodo_o_anio (period_or_year; requerido; ATS usa periodo permitido; RDEP usa año fiscal válido.); version_esquema (select_version; requerido; Versión compatible con periodo, catálogo y ficha aprobada.); archivo_laboral (file; opcional/condicional; Obligatorio para RDEP si no existe fuente laboral integrada; plantilla y tamaño permitidos.); snapshot_origen (selector_snapshot; requerido; Snapshot reconciliado, vigente, de la empresa y pestaña seleccionada.).

**Columnas visibles:** tipo_anexo; periodo_anio; fuente; identificador; base_o_rubro; tributo_o_valor; estado_validacion; error_fila; version_esquema; hash_xml; estado_presentacion.

**Acciones y permisos:** Descargar plantilla → Entrega plantilla versionada ATS o RDEP con instrucciones y columnas permitidas. [permiso: tax.annex.template]; Importar detalle laboral → Crea lote RDEP con filas válidas, errores por fila y reintento selectivo; no calcula nómina. [permiso: tax.rdep.import]; Generar vista previa XML → Valida snapshot, esquema, catálogos, totales y estructura; no presenta al SRI. [permiso: tax.annex.generate]; Descargar XML → Entrega artefacto con hash, versión y auditoría, sujeto a permiso. [permiso: tax.annex.download]; Registrar presentación → Registra canal, comprobante, fecha, respuesta y evidencia aportados por operador; no simula aceptación. [permiso: tax.annex.record_submission].

**Proceso que debe ejecutar:**

1. Seleccionar la pestaña ATS o RDEP, empresa, periodo/año, versión de esquema y snapshot; el backend verifica compatibilidad.
2. Capturar fuentes y exclusiones ATS o cargar plantilla laboral RDEP, mostrando errores por fila y permitiendo corregir y reintentar sin duplicar lote.
3. Validar identidad, duplicados, catálogos, campos obligatorios, totales, permisos de datos laborales y consistencia con el snapshot.
4. Revisar la vista previa, errores bloqueantes, hash, versión y separación entre estado del anexo y estado contable/fiscal de origen.
5. Aprobar la generación y crear el XML real firmado o artefacto requerido según configuración aprobada; conservar intentos y respuestas, sin mock de producción.
6. Descargar o registrar presentación por canal permitido, adjuntar talón/evidencia y consultar estado sin asumir una API pública de anulación o envío.

**Estados:** borrador; importando; errores_por_fila; validado; pendiente_aprobacion; xml_generado; presentacion_registrada; rechazado; resultado_desconocido. **Validaciones:** ATS y RDEP tienen modelos, campos, catálogos y esquemas separados aunque compartan pantalla.; La versión de XSD/ficha/catálogo se guarda con hash, fecha y usuario; se rechazan combinaciones incompatibles.; La importación reporta error por fila, conserva archivo original y permite reintento idempotente sin duplicar empleados o lotes.; Los datos laborales requieren permiso específico, cifrado y trazabilidad; no se derivan de compras.; El XML se valida estructuralmente y, cuando corresponda, firma/certificado se manejan en backend cifrado; no se expone secreto al navegador.; No se afirma aceptación fiscal por generar archivo; resultado desconocido queda pendiente de conciliación y no se reenvía a ciegas..

**Persistencia e impacto contable:** ATS y RDEP leen snapshots y fuentes existentes; generar, descargar o reintentar no crea compras, ventas, retenciones, nómina ni asientos. Una corrección de origen se realiza en su módulo y queda enlazada a una nueva versión. RDEP almacena datos laborales protegidos y no habilita nómina completa. El estado contable del origen, el estado fiscal del comprobante y el estado del archivo/presentación se mantienen independientes. La transmisión o presentación externa requiere canal real, evidencia y aprobación separada.

**API propia propuesta:** POST /api/v1/tax/returns/ats; POST /api/v1/tax/returns/rdep; POST /api/v1/tax/rdep/imports; GET /api/v1/tax/returns/{id}; POST /api/v1/tax/returns/{id}/approve; POST /api/v1/tax/returns/{id}/record-submission. **Pantallas relacionadas:** XLS-096; XLS-097; XLS-099. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Existe un snapshot ATS conciliado y un archivo laboral RDEP con una fila corregida antes de confirmar.; cuando: El usuario valida cada pestaña, corrige el error, genera los XML y registra evidencia de presentación por canal permitido.; entonces: Se producen dos artefactos separados, con hashes, versiones, auditoría y estados independientes, sin generar asientos ni presentar un mock.

**Prueba negativa:** dado: El usuario intenta generar RDEP con esquema ATS, datos laborales incompletos o volver a enviar tras un timeout sin consultar estado.; cuando: Confirma la generación o presentación.; entonces: La operación se bloquea con errores por campo o estado incierto, no duplica lote ni envío y exige corregir o conciliar la respuesta.

**Evidencias/pruebas exigidas:** `T-UI-XLS-098`, `T-PROC-XLS-098`, `T-NEG-XLS-098`.

### XLS-099 — Rep. Compras y Retenciones General

**Ubicación original:** Tributación > Reportes > Rep. Compras y Retenciones General. **Celda:** D147. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/tributacion/reportes/rep-compras-y-retenciones-general`.

**Objetivo y vista:** Generar un reporte general de compras y retenciones con código, base y valor, conciliable con ATS y contabilidad. Panel de filtros con empresa y corte explícito; tarjetas para compras, bases, tributos, retenciones emitidas/recibidas según dirección configurada, total y diferencias ATS-contabilidad.

**Campos y filtros:** empresa (selector_empresa; requerido; Empresa autorizada, activa y aislada por tenant.); desde (date; requerido; Fecha válida y no posterior a hasta.); hasta (date; requerido; Corte permitido, con semántica explícita de fecha de documento y fecha contable.); direccion_retencion (select; requerido; Emitida, recibida o ambas; conserva dirección en el maestro único.); codigo (multiselect; opcional/condicional; Código vigente para el periodo; no admite texto libre para alterar catálogo.); tercero (autocomplete_tercero; opcional/condicional; Tercero de la empresa seleccionada.); comparar_con (multiselect; opcional/condicional; Solo ATS y/o mayor publicado; muestra diferencia y fuente.).

**Columnas visibles:** fecha; tercero; direccion; tipo_documento; codigo; base; valor_retencion; tributo; total_documento; clave_o_referencia; estado_negocio; estado_contable; estado_fiscal; ats; asiento; diferencia.

**Acciones y permisos:** Ejecutar reporte → Crea snapshot con filtros, columnas y totales conciliables. [permiso: tax.reports.read]; Navegar a origen → Abre documento, retención, aplicación, asiento o anexo sin permitir edición publicada. [permiso: tax.reports.drilldown]; Exportar → Genera archivo con el mismo resultado y URL temporal autorizada; no contabiliza. [permiso: tax.reports.export]; Solicitar corrección → Crea incidencia enlazada al origen y no cambia el reporte histórico. [permiso: tax.reports.request_correction].

**Proceso que debe ejecutar:**

1. Seleccionar empresa, intervalo, dirección de retención y comparación ATS/mayor; el backend verifica alcance y corte.
2. Capturar códigos y tercero opcionales, y elegir columnas permitidas; mostrar advertencia sobre fechas y estados separados.
3. Validar fuentes, códigos vigentes, dirección, duplicados, documentos excluidos y consistencia de bases/valores.
4. Calcular detalle, subtotales y totales con Decimal, comparar con ATS y mayor publicado y marcar diferencias explicadas.
5. Revisar filas y navegar al origen; registrar una solicitud de corrección si el dato no concilia, sin editar publicado.
6. Exportar el snapshot o consultar el resultado, preservando filtros, columnas, totales, versión y auditoría.

**Estados:** solicitado; calculando; disponible; con_diferencias; exportando; exportado; error. **Validaciones:** Empresa, fechas y fuentes quedan en el snapshot y no pueden cambiarse durante la exportación.; Dirección emitida/recibida se filtra desde el maestro único; no se duplican retenciones por tener varias aplicaciones.; Códigos, bases y valores se leen de configuración versionada y se muestran con vigencia; no se hardcodean tasas.; La comparación ATS/mayor identifica faltantes, diferencias de importe y diferencias de estado con navegación a cada origen.; Totales de pantalla y archivo son idénticos; importes monetarios usan precisión decimal y formato de presentación separado.; El endpoint no acepta SQL, columnas arbitrarias ni acceso cruzado entre empresas..

**Persistencia e impacto contable:** Es un reporte de lectura y conciliación; no registra retenciones, no crea deuda y no publica asientos. Los importes provienen del maestro único de retenciones y de compras/asientos según el origen elegido. Si una diferencia exige corrección, se deriva al documento o retención de origen y cualquier efecto se realiza mediante operación aprobada, reverso o reemplazo trazable. Exportar y reimprimir no contabilizan otra vez. El informe conserva dirección emitida/recibida y estados independientes.

**API propia propuesta:** GET /api/v1/reports/purchases-withholdings; GET /api/v1/reports/purchases-withholdings/{snapshot_id}; POST /api/v1/reports/purchases-withholdings/correction-requests; POST /api/v1/report-exports. **Pantallas relacionadas:** XLS-096; XLS-097; XLS-098. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** dado: Una empresa tiene compras y retenciones emitidas y recibidas con un ATS generado y mayor publicado.; cuando: El usuario consulta el mes, selecciona ambas direcciones y compara ATS y mayor.; entonces: Obtiene columnas de código, base y valor, subtotales, diferencias y enlaces a cada origen, con exportación reproducible y sin asiento nuevo.

**Prueba negativa:** dado: El usuario intenta consultar otra empresa, inventar un código o editar una retención desde el reporte.; cuando: Ejecuta el filtro o guarda la modificación.; entonces: La API rechaza el acceso o código y la interfaz deriva a corrección/reverso autorizado, sin exponer ni cambiar datos.

**Evidencias/pruebas exigidas:** `T-UI-XLS-099`, `T-PROC-XLS-099`, `T-NEG-XLS-099`.

### Procesos integrales del grupo

**Conciliación mensual de compras, retenciones y mayor con salida para reporte y ATS**. Secuencia: XLS-097; XLS-096; XLS-099; XLS-098. El usuario fija empresa y periodo en Compras Mensuales, revisa compras y retenciones, crea el snapshot en Generación de Conciliación, clasifica y aprueba diferencias, consulta el Reporte de Compras y Retenciones General y genera el snapshot ATS desde la pestaña correspondiente. Cada paso conserva versiones, soportes, navegación al origen y estados de negocio, contable y fiscal separados. Resultado: La consulta, conciliación, reporte y generación de archivo no duplican asientos ni obligaciones. Solo una operación aprobada en el módulo de origen puede producir ajuste o reverso relacionado; publicados no se editan ni eliminan. Prueba: dado: Una compra con retención y XML válido concilia con el mayor, y otra fila requiere explicación.; cuando: Se genera el snapshot, se aprueba la diferencia, se consulta el reporte y se genera ATS.; entonces: El reporte y ATS reflejan el snapshot aprobado, la diferencia queda auditada y no existe segundo gasto, retención o asiento.

**Importación laboral y generación RDEP sin nómina integrada**. Secuencia: XLS-098; XLS-099. En la misma pantalla original se elige la pestaña RDEP, se descarga plantilla, se importa el detalle anual, se corrigen errores por fila, se valida el snapshot y se genera el XML. El reporte general solo consulta fuentes contables y tributarias; no transforma compras en rubros laborales. La presentación se registra únicamente con evidencia de un canal permitido. Resultado: La importación y XML no crean nómina ni asientos. Los datos laborales se almacenan protegidos, con lote y hash, y una corrección de origen genera una nueva versión; el resultado externo queda separado del estado contable. Prueba: dado: El archivo laboral contiene una fila inválida y el resto es consistente con el año seleccionado.; cuando: Se corrige la fila, se reintenta el lote y se genera RDEP aprobado.; entonces: Solo las filas válidas forman el snapshot, el XML tiene esquema/hash/auditoría y no se marca presentación aceptada sin evidencia real.

## Configuración General

### XLS-100 — Configuración Empresa

**Ubicación original:** Configuración General > Configuración Empresa. **Celda:** C149. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/configuracion-general/configuracion-empresa`.

**Objetivo y vista:** Registrar empresa, RUC o identificación, perfil fiscal, ejercicio, políticas y módulos por empresa. Pantalla propia desde el menú original y URL derivada por el padre, sin fusionarla.

**Campos y filtros:** empresa activa (selector; requerido; Empresa del tenant y alcance del usuario.); razón social (texto; requerido; No vacío; conserva versiones.); RUC o identificación (texto; requerido; Único por tenant; admite identificación extranjera.); nombre comercial (texto; opcional/condicional; No reemplaza razón social histórica.); dirección fiscal (objeto; requerido; Dirección estructurada y país requerido.); moneda base (selector ISO; requerido; Una moneda; cambio con aprobación.); perfil fiscal (selector versionado; requerido; Vigencia sin solapamiento; sin tasas hardcodeadas.); calidades tributarias (multi-selector; opcional/condicional; Cada calidad lleva vigencia y evidencia.); inicio del ejercicio (fecha; requerido; No reabre períodos cerrados.); políticas contables (parámetros; requerido; Versionadas y aprobables.); módulo inmobiliario (estado; requerido; Solo ENABLED, READ_ONLY o DISABLED.); fecha y motivo del cambio (fecha y texto; requerido; Requeridos para cambio de módulo.).

**Columnas visibles:** Empresa; RUC; Perfil fiscal; Ejercicio; Módulo inmobiliario; Versión; Última modificación.

**Acciones y permisos:** Editar borrador → Crea versión no publicada. [permiso: configuration.company.edit]; Previsualizar impacto → Muestra diferencias y tareas. [permiso: configuration.company.view_impact]; Aprobar y publicar → Activa versión y auditoría. [permiso: configuration.company.approve]; Activar/desactivar módulo → Cambia estado sin borrar historia. [permiso: configuration.modules.manage]; Ver historial → Consulta versiones en solo lectura. [permiso: configuration.audit.read].

**Proceso que debe ejecutar:**

1. 1. Seleccionar empresa autorizada y cargar versión vigente.
2. 2. Capturar identidad, perfil, ejercicio, políticas y módulos.
3. 3. Validar vigencias, permisos, períodos y vista previa.
4. 4. Aprobar con segregación cuando la política lo exija.
5. 5. Publicar versión, auditoría y evento de cambio.
6. 6. Consultar resultado; históricos conservan su snapshot.

**Estados:** business_status: DRAFT/PENDING_APPROVAL/ACTIVE; module_status: ENABLED/READ_ONLY/DISABLED; accounting_status: NOT_APPLICABLE; tax_status: NOT_APPLICABLE; historical_access: READ_ONLY cuando corresponda. **Validaciones:** RLS, tenant, empresa, rol y permiso se validan en backend.; Vigencias sin solapamiento; tasas nunca constantes en código.; Desactivación exige impacto, motivo y versión esperada.; Núcleo operable sin campos inmobiliarios obligatorios.; Publicación registra actor, hash, motivo y request_id..

**Persistencia e impacto contable:** No crea asientos. Cambios fiscales/políticas son versionados y no alteran comprobantes históricos. Desactivar inmuebles bloquea nuevas escrituras verticales, pero conserva cargos, cobros, enlaces y auditoría; cartera, bancos, cierres y reportes generales no requieren dimensiones inmobiliarias.

**API propia propuesta:** GET /api/v1/companies/{company_id}/configuration; PUT /api/v1/companies/{company_id}/configuration/drafts; POST /api/v1/companies/{company_id}/configuration/impact-preview; POST /api/v1/companies/{company_id}/configuration/approve; PATCH /api/v1/companies/{company_id}/modules/{code}; GET /api/v1/companies/{company_id}/configuration/audit. **Pantallas relacionadas:** Ninguna opción relacionada adicional. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un administrador autorizado, cuando publica una nueva vigencia fiscal con módulo inmobiliario opcional, entonces la versión queda auditable y los históricos no cambian.

**Prueba negativa:** Dado un usuario sin permiso, cuando intenta desactivar o activar el módulo sin motivo, entonces recibe rechazo y no se modifican datos.

**Evidencias/pruebas exigidas:** `T-UI-XLS-100`, `T-PROC-XLS-100`, `T-NEG-XLS-100`.

### XLS-101 — Certificado Digital

**Ubicación original:** Configuración General > Certificado Digital. **Celda:** C150. **Paquete:** `ACCOUNTING_CORE`.

**Ruta React:** `/configuracion-general/certificado-digital`.

**Objetivo y vista:** Cargar, probar y custodiar la referencia cifrada de un certificado digital, controlar acceso y alertar caducidad sin exponer archivo ni contraseña. Pantalla propia desde el menú original y URL derivada por el padre.

**Campos y filtros:** empresa activa (selector; requerido; Empresa autorizada y permiso específico.); archivo del certificado (multipart cifrado; requerido; Formato, tamaño, hash y objeto cifrado.); contraseña (secreto; requerido; Nunca se devuelve ni registra.); ambiente (selector; requerido; TEST o PRODUCTION según autorización.); alias (texto; opcional/condicional; Solo identificación humana; sin secretos.); vencimiento (fecha solo lectura; opcional/condicional; Extraído tras validar metadatos.); umbral de alerta (entero configurable; requerido; Positivo y sujeto a política.); motivo (texto largo; requerido; Requerido para carga, rotación o baja.).

**Columnas visibles:** Empresa; Alias; Ambiente; Estado; Vencimiento; Última prueba; Último error.

**Acciones y permisos:** Cargar/rotar → Crea referencia cifrada y conserva historial. [permiso: security.certificate.manage]; Probar firma → Prueba controlada sin emisión real. [permiso: security.certificate.test]; Revalidar → Comprueba integridad y vigencia. [permiso: security.certificate.read]; Deshabilitar uso → Bloquea nuevas firmas y conserva evidencia. [permiso: security.certificate.manage]; Ver auditoría → Consulta eventos con secretos redactados. [permiso: security.audit.read].

**Proceso que debe ejecutar:**

1. 1. Confirmar empresa, permiso y reautenticación.
2. 2. Cargar archivo, secreto, ambiente y motivo.
3. 3. Validar formato, cadena, metadatos y vigencia.
4. 4. Ejecutar prueba de firma no productiva.
5. 5. Aprobar y activar referencia cifrada si aplica.
6. 6. Rotar o deshabilitar conservando intentos e historial.

**Estados:** business_status: UNCONFIGURED/VALIDATING/VALID; business_status: EXPIRING/EXPIRED/REVOKED/ERROR; accounting_status: NOT_APPLICABLE; tax_status: NOT_APPLICABLE para configuración; document_tax_status: SIGNED/SUBMITTED/AUTHORIZED/REJECTED separado. **Validaciones:** Cifrado, secreto gestionado y logs redactados.; Permiso, empresa, MFA y auditoría para acciones sensibles.; Hash, cadena, metadatos y vencimiento antes de VALID.; Idempotencia evita certificados activos o efectos duplicados.; Prueba no productiva separada de XML, transmisión y autorización..

**Persistencia e impacto contable:** Carga, rotación, prueba y baja no crean asientos ni reimprimen documentos. Un certificado inválido bloquea firma tributaria nueva, pero no borra ni revierte contabilidad previa. XML y respuestas autorizadas se conservan como artefactos versionados; la prueba no es emisión y la anulación fiscal no se presume API pública.

**API propia propuesta:** GET /api/v1/companies/{company_id}/digital-certificate; POST /api/v1/companies/{company_id}/digital-certificate/validate; POST /api/v1/companies/{company_id}/digital-certificate/sign-test; POST /api/v1/companies/{company_id}/digital-certificate/rotate; POST /api/v1/companies/{company_id}/digital-certificate/disable; GET /api/v1/companies/{company_id}/digital-certificate/audit. **Pantallas relacionadas:** XLS-100. Los enlaces funcionales no representan un orden obligatorio de construcción.

**Prueba positiva:** Dado un administrador autorizado con certificado válido, cuando carga y prueba el archivo, entonces queda VALID, cifrado, auditable y sin asiento ni secreto expuesto.

**Prueba negativa:** Dado archivo vencido, secreto incorrecto o usuario no autorizado, cuando intenta activarlo, entonces queda ERROR/EXPIRED o es rechazado sin envío real.

**Evidencias/pruebas exigidas:** `T-UI-XLS-101`, `T-PROC-XLS-101`, `T-NEG-XLS-101`.

### Procesos integrales del grupo

**Alta de empresa sin inmuebles**. Secuencia: XLS-100. Capturar identidad, perfil, ejercicio y políticas; mantener PROPERTY_MANAGEMENT deshabilitado; previsualizar, aprobar y publicar. Resultado: Sin asiento; compras, ventas, cartera, tesorería y cierres operan sin inmueble. Prueba: Una operación general sin condominium_id funciona y una escritura vertical recibe MODULE_DISABLED.

**Activación segura del certificado**. Secuencia: XLS-100; XLS-101. Confirmar empresa y permisos; cargar secreto, validar, probar firma, aprobar y activar referencia cifrada; rotaciones mantienen historial. Resultado: No contabiliza; estados contable y fiscal de documentos permanecen separados. Prueba: Una prueba correcta deja VALID sin revelar secreto; repetir la solicitud no duplica el recurso.

**Desactivación inmobiliaria preservando historia**. Secuencia: XLS-100. Calcular impacto, exigir motivo/aprobación, publicar DISABLED, ocultar nuevas escrituras y conservar consultas históricas y cartera. Resultado: No elimina ni modifica asientos, obligaciones o cobros históricos. Prueba: Una deuda histórica sigue cobrable desde el núcleo y una nueva expensa es rechazada.

## Catorce pantallas complementarias para cerrar procesos

Estos accesos concretos completan funciones ya incluidas en el alcance anterior, como emitir retenciones, generar expensas y consultar libros faltantes. Se agregan después de los hijos originales del padre indicado; no sustituyen las 101 pantallas. Los asistentes y bandejas de la siguiente sección son capacidades internas, no excusa para omitir estos accesos.

### CMP-001 — Emitir Retención

**Ubicación:** Contabilidad > CxP > Retenciones. **Ruta:** `/contabilidad/cxp/retenciones/emitir-retencion`. **Control:** ADD-007.

**Campos:** Documento de compra; Proveedor; Fecha de retención; Conceptos renta/IVA; Bases; Códigos por vigencia; Certificado de firma. **Acciones:** Guardar borrador; Validar y aprobar; Emitir; Consultar SRI; Consultar XML/RIDE. **Permiso:** `payable.withholding.issue`.

**Proceso:** Registrar retención vinculada a compra con conceptos y bases aprobados; preparar, firmar, transmitir y consultar autorización; conservar XML/RIDE y estado remoto.

**Impacto:** Reduce obligación al proveedor y reconoce retenciones por pagar una vez; autorización fiscal y contabilización tienen estados separados.

**API propia:** GET /api/v1/payables/withholdings; POST /api/v1/payables/withholdings.

**Aceptación:** Abrir /contabilidad/cxp/retenciones/emitir-retencion desde Contabilidad > CxP > Retenciones; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Reduce obligación al proveedor y reconoce retenciones por pagar una vez; autorización fiscal y contabilización tienen estados separados.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-002 — Notas de Crédito de Venta

**Ubicación:** Contabilidad > CxC > Comprobantes de Venta. **Ruta:** `/contabilidad/cxc/comprobantes-de-venta/notas-de-credito`. **Control:** ADD-007.

**Campos:** Factura original; Cliente; Fecha; Motivo; Líneas afectadas; Base e impuestos; Saldo a favor. **Acciones:** Guardar borrador; Validar y aprobar; Emitir; Consultar SRI; Consultar XML/RIDE. **Permiso:** `receivable.credit_note.issue`.

**Proceso:** Seleccionar factura original y motivo legal habilitado; calcular reversión parcial/total; aprobar y emitir NC con firma, autorización y seguimiento.

**Impacto:** Disminuye ingreso/impuesto/CxC conforme plantilla; si factura pagada genera saldo a favor, no rechaza por saldo impago cero. Evitar anulación y NC duplicadas.

**API propia:** GET /api/v1/receivables/credit-notes; POST /api/v1/receivables/credit-notes.

**Aceptación:** Abrir /contabilidad/cxc/comprobantes-de-venta/notas-de-credito desde Contabilidad > CxC > Comprobantes de Venta; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Disminuye ingreso/impuesto/CxC conforme plantilla; si factura pagada genera saldo a favor, no rechaza por saldo impago cero. Evitar anulación y NC duplicadas.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-003 — Notas de Débito de Venta

**Ubicación:** Contabilidad > CxC > Comprobantes de Venta. **Ruta:** `/contabilidad/cxc/comprobantes-de-venta/notas-de-debito`. **Control:** ADD-007.

**Campos:** Factura original; Cliente; Fecha; Motivo; Conceptos adicionales; Base e impuestos. **Acciones:** Guardar borrador; Validar y aprobar; Emitir; Consultar SRI; Consultar XML/RIDE. **Permiso:** `receivable.debit_note.issue`.

**Proceso:** Seleccionar documento original y supuesto permitido; capturar valores adicionales; validar y aprobar; emitir ND y consultar autorización.

**Impacto:** Reconoce cargo adicional e impuestos según plantilla; enlaza obligación y documento sin modificar factura original.

**API propia:** GET /api/v1/receivables/debit-notes; POST /api/v1/receivables/debit-notes.

**Aceptación:** Abrir /contabilidad/cxc/comprobantes-de-venta/notas-de-debito desde Contabilidad > CxC > Comprobantes de Venta; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Reconoce cargo adicional e impuestos según plantilla; enlaza obligación y documento sin modificar factura original.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-004 — Presupuesto y Fondos

**Ubicación:** Administración Inmuebles > Inmuebles. **Ruta:** `/administracion-inmuebles/inmuebles/presupuesto-y-fondos`. **Control:** ADD-005.

**Campos:** Condominio; Ejercicio; Versión; Acta; Rubros; Centros de costo; Fondo; Montos aprobados. **Acciones:** Guardar borrador; Validar; Aprobar presupuesto; Comparar ejecución. **Permiso:** `property.budget.approve`.

**Proceso:** Preparar presupuesto por rubro/fondo, validar reglas y alícuotas, someter a aprobación, publicar versión y comparar aprobado/comprometido/devengado/pagado.

**Impacto:** Aprobar presupuesto no genera por sí solo una deuda ni un asiento; ejecución se deriva de operaciones del núcleo y fondos se clasifican según marco aprobado.

**API propia:** GET /api/v1/property/budgets; POST /api/v1/property/budgets.

**Aceptación:** Abrir /administracion-inmuebles/inmuebles/presupuesto-y-fondos desde Administración Inmuebles > Inmuebles; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Aprobar presupuesto no genera por sí solo una deuda ni un asiento; ejecución se deriva de operaciones del núcleo y fondos se clasifican según marco aprobado.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-005 — Expensas Ordinarias

**Ubicación:** Administración Inmuebles > Inmuebles. **Ruta:** `/administracion-inmuebles/inmuebles/expensas-ordinarias`. **Control:** ADD-005.

**Campos:** Condominio; Periodo; Presupuesto aprobado; Rubros; Padrón y alícuotas vigentes; Vencimiento; Tratamiento fiscal. **Acciones:** Calcular vista previa; Aprobar; Finalizar; Consultar cargos y cobros. **Permiso:** `property.expense.finalize`.

**Proceso:** Crear ciclo ordinario único, calcular distribución exacta de centavos, presentar vista previa, aprobar y finalizar cargos; generar comprobante fiscal solo si corresponde y notificar.

**Impacto:** Crea una obligación canónica por cargo y asientos balanceados; un documento fiscal ligado no vuelve a crear ingreso o cartera. Reintentar el ciclo devuelve lo generado.

**API propia:** GET /api/v1/property/expense-cycles; POST /api/v1/property/expense-cycles.

**Aceptación:** Abrir /administracion-inmuebles/inmuebles/expensas-ordinarias desde Administración Inmuebles > Inmuebles; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Crea una obligación canónica por cargo y asientos balanceados; un documento fiscal ligado no vuelve a crear ingreso o cartera. Reintentar el ciclo devuelve lo generado.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-006 — Expensas Extraordinarias

**Ubicación:** Administración Inmuebles > Inmuebles. **Ruta:** `/administracion-inmuebles/inmuebles/expensas-extraordinarias`. **Control:** ADD-005.

**Campos:** Condominio; Periodo; Código de ciclo; Resolución de asamblea; Proyecto/Fondo; Total aprobado; Distribución; Vencimiento. **Acciones:** Calcular vista previa; Aprobar; Finalizar; Consultar cargos y cobros. **Permiso:** `property.expense.extraordinary.finalize`.

**Proceso:** Registrar resolución y ciclo extraordinario, distribuir por regla aprobada, presentar y aprobar cálculo, finalizar cargos, notificar y dar seguimiento.

**Impacto:** Permite ciclos extraordinarios distintos en un mes; los fondos/destinos aprobados no se mezclan silenciosamente con operación ordinaria. Cada ciclo genera deuda una sola vez.

**API propia:** GET /api/v1/property/extraordinary-expense-cycles; POST /api/v1/property/extraordinary-expense-cycles.

**Aceptación:** Abrir /administracion-inmuebles/inmuebles/expensas-extraordinarias desde Administración Inmuebles > Inmuebles; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Permite ciclos extraordinarios distintos en un mes; los fondos/destinos aprobados no se mezclan silenciosamente con operación ordinaria. Cada ciclo genera deuda una sola vez.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-007 — Usuarios, Roles y Permisos

**Ubicación:** Configuración General > Seguridad. **Ruta:** `/configuracion-general/seguridad/usuarios-roles-permisos`. **Control:** ADD-001.

**Campos:** Usuario; Empresas autorizadas; Rol; Permisos; Estado; MFA; Restricciones de aprobación. **Acciones:** Guardar borrador; Validar; Aprobar y activar; Historial. **Permiso:** `identity.manage`.

**Proceso:** Invitar o registrar usuario, asignar empresas y permisos, configurar MFA y segregación, validar alcance efectivo, guardar y probar acceso/denegación.

**Impacto:** No genera asientos; los cambios quedan auditados. Desactivar usuario revoca acceso sin borrar documentos que creó.

**API propia:** GET /api/v1/identity/users; POST /api/v1/identity/users.

**Aceptación:** Abrir /configuracion-general/seguridad/usuarios-roles-permisos desde Configuración General > Seguridad; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: No genera asientos; los cambios quedan auditados. Desactivar usuario revoca acceso sin borrar documentos que creó.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-008 — Plantillas de Contabilización

**Ubicación:** Contabilidad > Financiero > Configuración. **Ruta:** `/contabilidad/financiero/configuracion/plantillas-contabilizacion`. **Control:** ADD-003.

**Campos:** Evento de negocio; Vigencia; Versión; Cuentas por rol; Dimensiones; Regla de redondeo; Reverso. **Acciones:** Guardar borrador; Validar; Aprobar y activar; Historial. **Permiso:** `accounting.template.approve`.

**Proceso:** Definir plantilla por evento, validar cuentas imputables y balance, simular con documento de prueba, aprobar y activar vigencia para operaciones futuras.

**Impacto:** La activación no reescribe asientos previos. Todas las operaciones guardan versión utilizada; plantilla inválida bloquea publicación.

**API propia:** GET /api/v1/accounting/posting-templates; POST /api/v1/accounting/posting-templates.

**Aceptación:** Abrir /contabilidad/financiero/configuracion/plantillas-contabilizacion desde Contabilidad > Financiero > Configuración; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: La activación no reescribe asientos previos. Todas las operaciones guardan versión utilizada; plantilla inválida bloquea publicación.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-009 — Libro Diario

**Ubicación:** Contabilidad > Financiero > Libros Contables. **Ruta:** `/contabilidad/financiero/libros-contables/libro-diario`. **Control:** ADD-004.

**Campos:** Periodo o intervalo; Cuenta; Tipo de comprobante; Tercero; Centro de costo; Estado publicado. **Acciones:** Consultar; Navegar a origen; Exportar. **Permiso:** `report.journal.read`.

**Proceso:** Seleccionar filtros, obtener snapshot de asientos publicados, mostrar secuencia y líneas, totalizar débitos/créditos y navegar al comprobante; exportar mismos datos.

**Impacto:** Consulta reproducible sin crear asientos; incluye reversos por fecha efectiva y conserva mismo total en PDF/XLSX.

**API propia:** GET /api/v1/reports/journal; POST /api/v1/report-exports.

**Aceptación:** Abrir /contabilidad/financiero/libros-contables/libro-diario desde Contabilidad > Financiero > Libros Contables; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Consulta reproducible sin crear asientos; incluye reversos por fecha efectiva y conserva mismo total en PDF/XLSX.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-010 — Balance de Comprobación

**Ubicación:** Contabilidad > Financiero > Libros Contables. **Ruta:** `/contabilidad/financiero/libros-contables/balance-comprobacion`. **Control:** ADD-004.

**Campos:** Periodo o fecha de corte; Nivel de cuentas; Centro de costo; Cuenta; Tercero; Incluir saldos cero. **Acciones:** Consultar; Navegar a origen; Exportar. **Permiso:** `report.trial_balance.read`.

**Proceso:** Calcular saldo inicial, débitos, créditos y saldo final por cuenta; verificar igualdad; navegar al mayor y exportar snapshot.

**Impacto:** Se deriva del libro publicado, no de saldos en React. Diferencias o cuentas sin clasificación se muestran, no se ocultan.

**API propia:** GET /api/v1/reports/trial-balance; POST /api/v1/report-exports.

**Aceptación:** Abrir /contabilidad/financiero/libros-contables/balance-comprobacion desde Contabilidad > Financiero > Libros Contables; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Se deriva del libro publicado, no de saldos en React. Diferencias o cuentas sin clasificación se muestran, no se ocultan.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-011 — Registro de Activos Fijos

**Ubicación:** Contabilidad > Financiero > Activos Fijos. **Ruta:** `/contabilidad/financiero/activos-fijos/registro`. **Control:** ADD-013.

**Campos:** Código; Clase; Documento de adquisición; Costo; Residual; Vida útil; Fecha disponible; Cuentas; Centro de costo. **Acciones:** Registrar; Aprobar alta; Consultar historial; Solicitar baja. **Permiso:** `asset.manage`.

**Proceso:** Registrar activo y soporte, validar política/costo/vida útil, aprobar alta y clasificación, consultar historial y gestionar baja documentada con aprobación.

**Impacto:** Vincula reconocimiento a compra/asiento de origen sin duplicar costo; bajas/ventas usan eventos y asientos propios.

**API propia:** GET /api/v1/assets; POST /api/v1/assets.

**Aceptación:** Abrir /contabilidad/financiero/activos-fijos/registro desde Contabilidad > Financiero > Activos Fijos; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Vincula reconocimiento a compra/asiento de origen sin duplicar costo; bajas/ventas usan eventos y asientos propios.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-012 — Depreciación de Activos Fijos

**Ubicación:** Contabilidad > Financiero > Activos Fijos. **Ruta:** `/contabilidad/financiero/activos-fijos/depreciacion`. **Control:** ADD-013.

**Campos:** Periodo; Activos elegibles; Método aprobado; Base depreciable; Vida remanente; Fecha contable. **Acciones:** Calcular vista previa; Aprobar; Publicar corrida; Ver asiento. **Permiso:** `asset.depreciation.post`.

**Proceso:** Seleccionar periodo, calcular vista previa por activo, revisar límites y periodos cerrados, aprobar y publicar corrida; consultar asientos e historial.

**Impacto:** Genera gasto y depreciación acumulada por plantilla; ejecución publicada única por activo/periodo, corrección por reverso enlazado.

**API propia:** GET /api/v1/assets/depreciation-runs; POST /api/v1/assets/depreciation-runs.

**Aceptación:** Abrir /contabilidad/financiero/activos-fijos/depreciacion desde Contabilidad > Financiero > Activos Fijos; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: Genera gasto y depreciación acumulada por plantilla; ejecución publicada única por activo/periodo, corrección por reverso enlazado.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-013 — Estado de Flujo de Efectivo

**Ubicación:** Contabilidad > Financiero > Libros Contables. **Ruta:** `/contabilidad/financiero/libros-contables/flujo-efectivo`. **Control:** ADD-014.

**Campos:** Periodo; Método aprobado; Mapeo de cuentas; Saldo inicial/final; Clasificación de flujos. **Acciones:** Consultar; Navegar a origen; Exportar. **Permiso:** `report.cash_flow.read`.

**Proceso:** Generar estado con clasificación operación/inversión/financiación, mostrar conciliación de variación de efectivo, detectar partidas sin mapear y exportar snapshot.

**Impacto:** No genera asientos; elimina transferencias internas del total de flujos conforme método aprobado y concilia efectivo inicial/final.

**API propia:** GET /api/v1/reports/cash-flow; POST /api/v1/report-exports.

**Aceptación:** Abrir /contabilidad/financiero/libros-contables/flujo-efectivo desde Contabilidad > Financiero > Libros Contables; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: No genera asientos; elimina transferencias internas del total de flujos conforme método aprobado y concilia efectivo inicial/final.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

### CMP-014 — Migración de Saldos Iniciales

**Ubicación:** Contabilidad > Financiero > Migración. **Ruta:** `/contabilidad/financiero/migracion/saldos-iniciales`. **Control:** ADD-016.

**Campos:** Fecha de corte; Archivo; Versión de plantilla; Cuentas; Terceros; Documentos abiertos; Anticipos; Contrapartidas aprobadas. **Acciones:** Descargar plantilla; Prevalidar archivo; Ver errores por fila; Conciliar; Confirmar importación. **Permiso:** `migration.opening.execute`.

**Proceso:** Descargar plantilla, cargar y prevalidar, informar errores y diferencias, conciliar auxiliares contra mayor, aprobar e importar apertura una sola vez.

**Impacto:** No vuelve a contabilizar auxiliares importados por pantallas originales. Mantiene fechas/documentos históricos y bloquea salida si apertura no concilia.

**API propia:** GET /api/v1/migrations/opening-balances; POST /api/v1/migrations/opening-balances.

**Aceptación:** Abrir /contabilidad/financiero/migracion/saldos-iniciales desde Contabilidad > Financiero > Migración; ejecutar el proceso permitido, recargar y consultar el resultado. Verificar: No vuelve a contabilizar auxiliares importados por pantallas originales. Mantiene fechas/documentos históricos y bloquea salida si apertura no concilia.

**Negativa:** Rechazar empresa/permiso inválidos, dependencia no aprobada o versión/saldo cambiado sin efecto parcial. Si es importación o ejecución monetaria, un reintento no duplica resultados.

## Asistentes y capacidades complementarias dentro de las vistas

Las adiciones no reemplazan títulos, accesos ni rutas originales. Los controles generales sin pantalla propia siguen siendo obligatorios. Portal, nómina completa y pagos en línea quedan fuera del alcance base. Un asistente anidado no cuenta como una pantalla original adicional.

### SUP-001 — Control de estado del módulo y consulta histórica

**Ubicación propuesta:** Administración Inmuebles > General, transversal a las rutas originales. **Motivo:** La extensión es opcional por empresa y necesita distinguir ENABLED, READ_ONLY y DISABLED sin ocultar indebidamente la historia ni permitir escrituras directas por URL.

**Proceso:** Resolver GET /api/v1/me/context, verificar empresa, módulo y permiso en backend, mostrar banner de estado, permitir lectura histórica cuando corresponda y devolver 403 MODULE_DISABLED en altas/cambios verticales. **Aceptación:** Una empresa sin inmuebles opera el núcleo sin condominium_id obligatorio; una empresa desactivada conserva consultas históricas y rechaza nuevas escrituras.

### SUP-002 — Presupuesto, fondos y ciclo de expensas

**Ubicación propuesta:** Administración Inmuebles > General > Rubros, con acceso de consulta desde Administración Inmuebles > Inmuebles > Resumen General. **Motivo:** Rubros y resumen no completan por sí solos el proceso requerido de presupuesto/expensas; se agrega la función mínima sin quitar ni desplazar las opciones originales.

**Proceso:** Preparar presupuesto y resolución, seleccionar ejercicio/fondo/rubros, determinar padrón vigente, previsualizar distribución y residuos, aprobar, finalizar cargos y asientos, notificar y conciliar con cartera. **Aceptación:** La suma de cargos coincide exactamente con el total aprobado, hay snapshot por cargo, no existe saldo manual paralelo y una falla de correo no revierte cargos válidos.

### SUP-003 — Bandeja de trabajos, errores y reintentos

**Ubicación propuesta:** Administración Inmuebles > Inmuebles > Carga Masiva de Inmuebles y Administración Inmuebles > Notificaciones > Envío Email. **Motivo:** Las importaciones y envíos son asíncronos y requieren seguimiento, errores por fila/destinatario, idempotencia y recuperación visible.

**Proceso:** Crear job tras commit, mostrar 202 y progreso, consultar resumen y errores, corregir o conciliar, reintentar únicamente elementos elegibles y conservar hashes, referencias y auditoría. **Aceptación:** Un reintento de lote o correo no duplica unidades ni entregas confirmadas; un timeout queda conciliable y nunca se resuelve reenviando a ciegas.

### SUP-004 — Aprobación y auditoría de cambios sensibles

**Ubicación propuesta:** Administración Inmuebles > General y Administración Inmuebles > Notificaciones, dentro de cada pantalla dedicada. **Motivo:** Catálogos, responsables, reglas de distribución y boletines necesitan segregación, evidencia, versión y trazabilidad sin inventar políticas legales.

**Proceso:** Capturar borrador, validar contenido, calcular hash, solicitar aprobador distinto cuando corresponda, aprobar/rechazar con motivo y bloquear cambios que invaliden la aprobación. **Aceptación:** Cada transición registra actor, fecha UTC, empresa, versión, valores afectados y decisión; una publicación contable nunca se edita ni elimina desde estas pantallas.

### SUP-005 — Bandeja de envíos, entregas y contactos de Email

**Ubicación propuesta:** Email > Historial de envíos. **Motivo:** Las cuatro opciones originales necesitan consultar el resultado real del correo de prueba o productivo, rebotes, timeout, correlación outbox, destinatario autorizado y registro de contactos sin fusionar las pantallas de modificación. También permite reintento controlado y conciliación sin crear efectos contables.

**Proceso:** Filtrar por empresa, tipo de plantilla, periodo, estado, versión y correlación de origen; abrir mensaje y eventos; verificar snapshot, destinatario enmascarado, adjuntos autorizados y respuesta del proveedor; solicitar reintento solo si la política lo permite y con idempotencia; registrar contacto/promesa cuando aplique; exportar evidencia con permisos. Nunca reenvía automáticamente tras restauración o timeout incierto. **Aceptación:** Existe una pantalla accesible bajo el menú Email original, con filtros y columnas de mensaje, versión, origen, destinatario autorizado, estado, intentos, proveedor, timestamps y error; enlaza a recaudación/cartera/ciclo sin exponer otras empresas; permite consulta y reintento con permiso; una prueba duplicada devuelve el mismo resultado o queda conciliada y no crea segundo correo, recibo, asiento, deuda ni contacto.

### SUP-006 — Asistente de reverso/reemplazo y anulación contable

**Ubicación propuesta:** Contabilidad > Financiero > Comprobantes Contables > Modificación Comp. Contable / Anulación Comp. Contable. **Motivo:** Completa el proceso operativo exigido para corregir publicados sin editar/borrar y mantiene separadas las acciones de modificación y anulación.

**Proceso:** Seleccionar comprobante → mostrar estados y dependencias → capturar motivo/evidencia → previsualizar reverso/reemplazo → aprobar → publicar operación vinculada → consultar cadena y reportes. **Aceptación:** Un publicado no admite edición destructiva; la corrección genera reverso y reemplazo o reversa única, con permisos, idempotencia, periodo abierto y auditoría.

### SUP-007 — Bandeja de importación, errores por fila y reconciliación del plan

**Ubicación propuesta:** Contabilidad > Financiero > Plan Contable > Migrar Plan Contable. **Motivo:** Completa la carga sin convertir el menú original en un catálogo de títulos: requiere plantilla, prevalidación, confirmación y reintento seguro.

**Proceso:** Descargar plantilla → cargar archivo → validar padres/ciclos/códigos/naturaleza → corregir filas → confirmar válidas → consultar mapa y reintentar pendientes. **Aceptación:** Cada fila conserva número original, error y resultado; confirmar o reintentar no duplica cuentas ni altera asientos históricos.

### SUP-008 — Checklist de cierre, bloqueo y reapertura auditada

**Ubicación propuesta:** Contabilidad > Financiero > Libros Contables > Cierres > Registro de Cierres. **Motivo:** Completa el ciclo de cierre con controles visibles, aprobación y concurrencia, sin añadir un menú paralelo ni operaciones destructivas.

**Proceso:** Seleccionar periodo → ejecutar conciliaciones → resolver diferencias → aprobar → bloquear → generar cierre anual si aplica → solicitar reapertura limitada → segunda aprobación → auditar. **Aceptación:** El cierre bloquea posting nuevo, conserva trazabilidad y ordena carreras con publicación; reapertura exige motivo, alcance y aprobación dual.

### SUP-009 — Capacidad presupuestaria y expensas opcional con puente al núcleo

**Ubicación propuesta:** Contabilidad > Financiero > Configuración > Secuencia de Documentos > Expensas. **Motivo:** Completa la función necesaria para el requisito de expensas sin imponer campos inmobiliarios al núcleo; solo se habilita por empresa cuando PROPERTY_MANAGEMENT está activo.

**Proceso:** Comprobar módulo → configurar serie → preparar presupuesto/rubros en extensión → previsualizar cargos → aprobar → generar cargo y obligación canónica → consultar conciliación con cartera; si está apagado, solo lectura histórica. **Aceptación:** Las escrituras verticales deshabilitadas devuelven MODULE_DISABLED; una expensa no crea deuda o ingreso duplicado y la numeración interna no se presenta como autorización fiscal.

### SUP-010 — Arqueo y cierre de caja chica

**Ubicación propuesta:** Contabilidad > Caja Chica > Registro de Caja Chica > Arqueo y cierre. **Motivo:** Completa el control del fondo fijo y el tratamiento de diferencias previsto para caja chica, sin quitar, renombrar ni desplazar Registro de Caja Chica o Documentos Pendientes.

**Proceso:** Seleccionar fondo y fecha de corte; capturar efectivo y soportes físicamente verificados; comparar con saldo contable; explicar diferencia; enviar a aprobación; cerrar el arqueo y, solo con política aprobada, generar ajuste o reverso con soporte. **Aceptación:** El arqueo muestra saldo teórico, efectivo contado, documentos pendientes, diferencia y responsable; no permite cierre sin explicación/aprobación de diferencia, no modifica asientos publicados y deja evidencia consultable desde el fondo.

### SUP-011 — Bandeja de homologación y aprobación CxP

**Ubicación propuesta:** Contabilidad > CxP > Documentos de Soporte y opciones de importación originales. **Motivo:** Completa la revisión de duplicados, cuentas, impuestos, soportes y aprobaciones sin sustituir las opciones XLS existentes.

**Proceso:** Recibir lote/documento, validar por fila, homologar tercero/cuenta, mostrar vista previa, aprobar, confirmar o reintentar errores con idempotencia. **Aceptación:** Cada documento o fila tiene estado, error accionable, responsable, hash, resultado de confirmación y navegación a su origen; ninguna repetición crea doble deuda.

### SUP-012 — Bandeja de trabajos y evidencia fiscal

**Ubicación propuesta:** Contabilidad > CxP > Liquidación de Compras y Retenciones, conservando ambos accesos originales. **Motivo:** Completa seguimiento de firma, recepción, autorización y anulación sin inventar servicios externos ni mezclar estados fiscales con contables.

**Proceso:** Crear trabajo, validar artefactos, ejecutar adaptador solo si está documentado o asignar tarea manual, registrar respuesta/evidencia y habilitar reverso local separado. **Aceptación:** El usuario ve trabajo, intentos, responsable, fechas, XML/hash y respuesta real; no puede marcar autorización o anulación sin evidencia.

### SUP-013 — Trazabilidad y conciliación de reportes CxP

**Ubicación propuesta:** Contabilidad > CxP > Reportes, manteniendo cada reporte original como acceso independiente. **Motivo:** Completa filtros de corte, totales conciliables, exportación y navegación a documento, auxiliar, asiento y banco.

**Proceso:** Seleccionar empresa y corte, consultar snapshot, revisar totales/diferencias, navegar al origen, exportar idénticos filtros y registrar excepción explicada. **Aceptación:** Los seis reportes entregan filtros/columnas/totales concretos, excluyen o separan anulados según corresponda y no permiten editar desde el reporte.

### SUP-014 — Bandeja única de importación y homologación de terceros, anticipos y antigüedad

**Ubicación propuesta:** Contabilidad > CxC > Clientes > Importación Masiva de Proveedores/Clientes y accesos originales de migración. **Motivo:** Completa plantilla, prevalidación, errores por fila, homologación, conciliación, confirmación y reintento sin quitar ni desplazar las opciones originales.

**Proceso:** Descargar plantilla → cargar lote → validar y mostrar errores por fila → homologar → conciliar → confirmar válidas → reintentar pendientes con idempotencia. **Aceptación:** Cada lote conserva hash, filas y mapa de IDs; una segunda confirmación no crea duplicados ni asientos adicionales.

### SUP-015 — Bandeja de dependencias y reversos separados

**Ubicación propuesta:** Contabilidad > CxC > Recaudaciones, Ajustes, Comprobantes de Venta y Retenciones. **Motivo:** Completa anulación/reverso con evaluación de depósitos, conciliaciones, aplicaciones, evidencia, aprobación y estados contable/fiscal independientes.

**Proceso:** Seleccionar origen → evaluar dependencias → capturar motivo/evidencia → previsualizar → aprobar → publicar reverso atómico → consultar resultado y tareas externas. **Aceptación:** Ningún publicado se edita/borrar; reimpresión no contabiliza; dependencia bloqueada impide reverso parcial.

### SUP-016 — Centro de reportes CxC con snapshot y navegación al origen

**Ubicación propuesta:** Contabilidad > CxC > Reportes. **Motivo:** Completa filtros, columnas, totales conciliables, exportación y enlaces exigidos sin convertir reportes en catálogo vacío ni permitir acciones transaccionales desde consulta.

**Proceso:** Definir empresa y corte/intervalo → seleccionar filtros → calcular detalle y totales → revisar conciliación → exportar snapshot → navegar en modo consulta. **Aceptación:** Cada reporte tiene columnas/totales concretos, exportación con mismos filtros, estados separados y navegación a documento, obligación, asiento o proceso.

### SUP-017 — Selector visible de dirección para “Rep. Retenciones Emitidas”

**Ubicación propuesta:** Contabilidad > CxC > Reportes > Rep. Retenciones Emitidas. **Motivo:** Conserva exactamente el título y acceso original, mientras evita confundir retenciones recibidas de CxC con emitidas de CxP.

**Proceso:** Abrir título original → elegir pestaña Emitidas o Recibidas → aplicar filtros independientes → consultar/exportar → navegar al origen autorizado. **Aceptación:** El encabezado original permanece; las pestañas no mezclan totales y Recibidas es la vista operativa de CxC.

### SUP-018 — Conciliación Bancaria

**Ubicación propuesta:** Contabilidad > Bancos > Conciliación. **Motivo:** Completa el ciclo exigido por depósitos, egresos y reportes sin desplazar ni renombrar las opciones originales; el documento previo exige separar extracto y libro, emparejar movimientos y aprobar el cierre.

**Proceso:** Descargar plantilla; importar CSV/XLSX con cuenta, periodo, saldos y filas; prevalidar errores por fila y permitir corrección/reintento; sugerir matches uno a uno, uno a varios o varios a uno; revisar diferencia y aprobar grupos; registrar ajustes aprobados; cerrar con saldo explicado y pendientes; permitir deshacer conservando historial. **Aceptación:** Existe pantalla accesible desde el menú original con plantilla descargable, importación 202/seguimiento, errores por fila, reintento idempotente, estados SUGERIDO/CONFIRMADO/DESCARTADO/EXCEPCION, permisos separados, cierre aprobado y navegación a línea de extracto, movimiento de libro y reportes XLS-093/XLS-095. No cambia valores originales ni exige inmuebles.

### SUP-019 — Bandeja de aprobación y reversos de Bancos

**Ubicación propuesta:** Contabilidad > Bancos > Aprobaciones. **Motivo:** Hace ejecutables los flujos de emisión, anulación y cambio de cheque sin fusionar pantallas ni permitir edición/borrado de publicados; centraliza tareas sin sustituir el acceso dedicado de cada opción.

**Proceso:** Listar solicitudes por empresa, tipo, monto, estado y antigüedad; abrir snapshot y soportes; validar segregación y conflictos; aprobar o rechazar con motivo; ejecutar únicamente desde la pantalla de origen; mostrar resultado, idempotencia y auditoría; escalar pendientes sin alterar el documento. **Aceptación:** Cada acción conserva su permiso específico, no permite autoaprobación cuando la política lo prohíbe, invalida aprobación si cambia el contenido, registra actor/fecha/motivo y enlaza el resultado a XLS-087, XLS-088, XLS-090 o XLS-091. No crea catálogo independiente ni doble asiento.

### SUP-020 — Importación de extractos bancarios

**Ubicación propuesta:** Contabilidad > Bancos > Conciliación > Importación de extractos. **Motivo:** Completa la operación de conciliación y reportes con una entrada controlada de datos, respetando el contrato de plantilla, hash, saldo inicial/final, errores por fila y reintentos.

**Proceso:** Seleccionar empresa, cuenta, periodo y versión de plantilla; descargar o confirmar plantilla; cargar archivo; validar encabezados, signos, fechas, duplicados y totales; mostrar errores por fila y permitir corrección/reintento; confirmar filas válidas; generar extracto versionado y enviarlo a conciliación; consultar historial y hash. **Aceptación:** El importador no contabiliza, no infiere signos por descripción, conserva archivo original y hash, devuelve job_id para procesamiento largo, permite descargar errores y reintentar sin duplicar líneas, y alimenta XLS-093/XLS-095 con estado y trazabilidad. Empresa sin inmuebles puede completar todo el proceso.

### SUP-021 — Bandeja de validación y diferencias tributarias

**Ubicación propuesta:** Tributación > Conciliación Compras. **Motivo:** Completa la revisión por fila, soporte, snapshot, clasificación y aprobación que requieren XLS-096 y XLS-097 sin sustituir ni desplazar sus accesos originales.

**Proceso:** Recibir lotes y vínculos de origen, prevalidar duplicados y catálogos, mostrar errores por fila, permitir evidencia y clasificación, solicitar aprobación y dirigir correcciones al documento fuente. **Aceptación:** Una conciliación puede pasar de borrador a aprobada con diferencias explicadas, totales reproducibles y enlaces al origen; no crea un asiento por consultar o exportar.

### SUP-022 — Importación laboral anual para RDEP

**Ubicación propuesta:** Tributación > Generación de Archivos XML > Anexo Transaccional RDEP, pestaña RDEP. **Motivo:** Completa el requisito de importar detalle laboral cuando no existe nómina integrada, sin crear el módulo de payroll completo.

**Proceso:** Descargar plantilla, cargar lote, mostrar errores por fila, corregir y reintentar filas, confirmar snapshot, validar esquema y generar el XML RDEP separado de ATS. **Aceptación:** El lote conserva archivo original, hash, versión, errores y permiso de datos; un reintento no duplica registros y generar XML no registra presentación ni asiento.

### SUP-023 — Trazabilidad y exportación de reportes tributarios

**Ubicación propuesta:** Tributación > Reportes. **Motivo:** Permite que XLS-099 y sus comparaciones con ATS naveguen a compra, retención, asiento y snapshot con filtros y totales concretos.

**Proceso:** Fijar empresa y corte, calcular detalle, comparar fuentes, mostrar diferencias, abrir origen, registrar incidencia y exportar el mismo snapshot mediante trabajo autorizado. **Aceptación:** El archivo exportado coincide con pantalla en filtros, columnas y totales, respeta empresa/permisos y la navegación no permite editar publicados ni contabiliza de nuevo.

### SUP-024 — Historial de cambios de configuración

**Ubicación propuesta:** Configuración General > Configuración Empresa > Historial de cambios. **Motivo:** Completa versiones, aprobaciones y preservación histórica sin mover el menú original.

**Proceso:** Filtrar empresa, actor y fecha; abrir antes/después; consultar hash y exportar evidencia autorizada. **Aceptación:** Cada cambio muestra actor, motivo, versión, request_id, diferencias y resultado; no es editable ni borrable.

### SUP-025 — Auditoría y alertas del certificado

**Ubicación propuesta:** Configuración General > Certificado Digital > Auditoría y alertas. **Motivo:** Completa carga, prueba, rotación y caducidad sin exponer secretos.

**Proceso:** Filtrar estado y vencimiento; consultar errores redactados; reconocer alerta e iniciar rotación desde la pantalla dedicada. **Aceptación:** Toda carga, prueba, alerta y baja queda trazable; nunca se muestra archivo ni contraseña.

## Puerta de entrega

No presentar la aplicación como completa hasta que las 101 pantallas originales estén aceptadas, los complementos que cierran procesos estén operativos, los 20 controles incluidos se cumplan y los dos modos —núcleo general y módulo inmobiliario— pasen pruebas. Un módulo existe cuando su proceso termina correctamente en UI, API, base y reportes, no cuando se crea un directorio o un componente vacío.

