# Plan general de reconstrucción v2 — SAGA

**Autor:** Manus AI  
**Versión:** 2.0  
**Estado:** pendiente de aprobación; no se construye ni se despliega la aplicación con este documento.  
**Stack objetivo:** React, FastAPI y PostgreSQL.  
**Cobertura:** 101 hojas terminales del Excel, con rutas, pantallas, procesos y controles verificables.

## 1. Propósito y límites de esta versión

Este plan sustituye como guía de trabajo al plan anterior y corrige el riesgo principal indicado por el usuario: disponer de módulos o scaffolds sin pantallas operativas, navegación, procesos persistentes ni evidencia de aceptación. El objetivo no es producir otro catálogo abstracto, sino establecer cómo se reconstruirá un sistema funcional, trazable y comprobable cuando exista autorización para comenzar.

No se ha auditado la aplicación anterior, su repositorio, sus ambientes ni sus módulos. Por tanto, este documento no afirma diagnósticos sobre código existente ni promete reutilización. La **Fase A** solo se ejecutará si se suministra una URL de repositorio o una URL de aplicación con acceso autorizado. Sin esos insumos, se trabajará desde los mapas entregados y se registrará explícitamente qué evidencia no pudo ser examinada.

La solución tendrá un núcleo contable independiente, operable sin condominio, inmueble, unidad ni alícuota. La administración de inmuebles será una extensión opcional denominada `PROPERTY_MANAGEMENT`; el núcleo `ACCOUNTING_CORE` no dependerá de ella. Una empresa sin la extensión podrá configurar terceros, compras, ventas, cartera, bancos, caja chica, cierres, reportes y tributación aplicable. Cuando la extensión esté desactivada, el backend bloqueará escrituras verticales con `MODULE_DISABLED`, sin borrar historia, asientos, cobros ni documentos; la consulta histórica se mantendrá según permisos.

La construcción no se inicia durante esta revisión. La aprobación expresa del plan habilitará el primer hito que el usuario autorice —auditoría o preparación contractual— y su secuencia de trabajo acordada. No autoriza automáticamente producción, uso de certificados reales, pagos, envíos tributarios ni contratación de servicios externos.

## 2. Alcance estructural que debe conservarse

Se conservarán exactamente estas cinco raíces del menú original, en este orden estructural: **Administración Inmuebles**, **Email**, **Contabilidad**, **Tributación** y **Configuración General**. En **Contabilidad** se conservarán como grupos de primer nivel **Financiero**, **Caja Chica**, **CxP**, **CxC** y **Bancos**. Las etiquetas, padres y orden originales son parte del requisito, no sugerencias visuales. El Excel no define URL: esta versión asigna una ruta React única a cada hoja siguiendo esa jerarquía, sin inventar una distribución distinta.

El árbol contiene 101 terminales, desde `XLS-001` hasta `XLS-101`, y cada terminal tendrá una página específica y una URL única. El mapa estructural queda distribuido así:

- **Administración Inmuebles:** 11 pantallas, `XLS-001` a `XLS-011`.
- **Email:** 4 pantallas, `XLS-012` a `XLS-015`.
- **Contabilidad > Financiero:** 23 pantallas, `XLS-016` a `XLS-038`.
- **Contabilidad > Caja Chica:** 2 pantallas, `XLS-039` a `XLS-040`.
- **Contabilidad > CxP:** 18 pantallas, `XLS-041` a `XLS-058`.
- **Contabilidad > CxC:** 26 pantallas, `XLS-059` a `XLS-084`.
- **Contabilidad > Bancos:** 11 pantallas, `XLS-085` a `XLS-095`.
- **Tributación:** 4 pantallas, `XLS-096` a `XLS-099`.
- **Configuración General:** 2 pantallas, `XLS-100` a `XLS-101`.

La suma es 101 y las rutas del árbol son únicas. Compartir componentes, hooks, servicios internos o modelos no autoriza fusionar opciones visibles. Registro, reimpresión, modificación y anulación deben conservar accesos, URLs y permisos separados, aunque reutilicen un servicio de dominio común. La separación es necesaria para que cada acción tenga su propio formulario, estado, auditoría, prueba y evidencia; no se aceptará una pantalla genérica que solamente cambie un título.

Los reportes serán procesos reales de consulta, snapshot, filtros, totales, navegación a origen y exportación reproducible. Los importadores serán procesos reales con plantilla versionada, prevalidación, errores por fila, homologación, confirmación selectiva, reintento idempotente y resultado persistido. Un botón de “importar”, “reportar”, “reimprimir” o “anular” que no produce ese recorrido no cumple la hoja correspondiente.

Se conservará el título literal **“Anexo Transaccional RDEP”** de `XLS-098` y se mostrarán simultáneamente las pestañas independientes **ATS** y **RDEP**. Cada pestaña tendrá modelo, esquema, fuentes, permisos, validaciones, lote y estado propios. Generar un XML no equivale a presentarlo ni a obtener aceptación fiscal. En `E118` se conservará el selector y el título requerido para distinguir **Emitidas/Recibidas**; no se sustituirá por una pantalla ambigua ni se duplicará contabilidad por la dirección elegida.

## 3. Dos mapas que no deben confundirse

El **mapa estructural** es el árbol de navegación: raíces, grupos, etiquetas, padres, orden, `screen_id` y `ruta_original`. Su función es demostrar que las 101 hojas pueden abrirse desde el menú conservado. No decide qué se construye primero.

El **orden técnico** se definirá por dependencias y riesgo. Primero deben existir identidad, empresa, permisos, aislamiento de tenant, auditoría, configuración, contrato de API y motor contable; después los auxiliares y tesorería; luego tributación, reportes, cierre y piloto. Una hoja puede aparecer temprano en el árbol y construirse más tarde si depende de un asiento, un tercero, una secuencia o un snapshot que aún no existe. Nunca se moverá una opción para ocultar una dependencia ni se declarará completada por tener una entrada de menú.

Cada mapa de módulo conserva la fila, celda, texto original, ruta original, objetivo, campos, columnas, acciones, pasos, estados, impacto contable, APIs propuestas, validaciones, pruebas y dependencias. Esos mapas son la fuente de los contratos de pantalla. La matriz de trazabilidad vinculará cada `XLS-*` con página, endpoint, migración, permiso, prueba Playwright, pruebas de dominio, evidencia y acta de aceptación.

## 4. Arquitectura y reglas de operación

El frontend React será responsable de navegación, presentación, accesibilidad, formularios y estados visibles; no será la fuente canónica de saldos, permisos, tasas, numeración ni reglas fiscales. FastAPI expondrá contratos versionados, validará tenant, empresa, rol, permiso, versión esperada e idempotencia, y dirigirá comandos a servicios de dominio. PostgreSQL conservará entidades, snapshots, estados, relaciones, auditoría append-only, claves de idempotencia, asientos inmutables, lotes de importación y resultados de reportes.

La empresa activa no se confiará a un campo enviado desde React. Todas las consultas y escrituras deberán estar aisladas por tenant y empresa, con controles de servidor y restricciones de base de datos. Las operaciones monetarias usarán `numeric` y `Decimal`; las fechas comerciales tendrán semántica explícita; la concurrencia se manejará con locks o versionado optimista. Los comandos repetidos devolverán el resultado existente o un estado incierto conciliable, no una segunda operación.

Los estados de negocio, contable y fiscal se mantendrán separados. Un asiento publicado no se editará ni eliminará: la corrección usará reverso enlazado y, cuando proceda, documento de reemplazo. Una anulación fiscal no se asumirá equivalente a reverso contable ni se inventarán endpoints externos. Las tasas, códigos, catálogos y esquemas se guardarán con vigencia, fuente, versión, hash y aprobador; no se hardcodearán porcentajes tributarios.

La extensión inmobiliaria podrá estar `ENABLED`, `READ_ONLY` o `DISABLED`. La pantalla de configuración de empresa (`XLS-100`) controlará el cambio con impacto, motivo, versión y aprobación. La pantalla de certificado (`XLS-101`) custodiará referencias cifradas y secretos no exportables por la interfaz, descifrables únicamente por el proceso de firma autorizado; una prueba de firma no equivale a emisión ni autorización.

## 5. Fases, tareas e hitos de salida

### Fase A — Auditoría de la aplicación, solo si se suministra acceso

Se recibirá una URL de repositorio o de aplicación, credenciales autorizadas y alcance de revisión. Se levantarán inventario de rutas existentes, pantallas reales, contratos FastAPI, migraciones PostgreSQL, workers, autenticación, permisos, datos de prueba, cobertura y capacidad de persistir tras recarga. Se compararán hallazgos con los 101 IDs, sin declarar que un módulo existe por nombre de carpeta.

**Hito A:** informe de evidencia con lo observado, lo no accesible, riesgos de reutilización y diferencias contra el árbol. Si no se entrega URL o repo, la fase queda pendiente, no se simula y no se usa para afirmar diagnóstico. Esta fase no cambia los conteos del alcance.

### Fase B — Contrato de las 101 pantallas y navegación

Se congelará el registro de cada ID, etiqueta, ruta única, padre, permiso, paquete, campos, columnas, acciones y estados. Se implementará el shell de menú con las cinco raíces exactas y sus grupos, pero cada terminal deberá resolver a una página identificable. Se definirán contratos OpenAPI, errores, permisos, `Idempotency-Key`, auditoría y formato de snapshots. También se fijará el contrato de importadores, exportaciones asíncronas y navegación de origen.

El hito no es “ver el menú”. Es ejecutar, para cada ID, un recorrido que llegue a la URL correcta, muestre la página dedicada y falle de forma controlada cuando una dependencia aún no esté lista. Las adiciones se ubicarán debajo del menú original sin reemplazar ninguna hoja: bandejas, auditoría, conciliación, arqueo, historial y exportaciones serán extensiones identificadas.

### Fase C — Núcleo, configuración y Contabilidad > Financiero

Se construirán identidad, empresas, roles, permisos, MFA cuando corresponda, auditoría, configuración general, establecimientos, secuencias, catálogos versionados, plan contable, centros de costo, tipos de comprobante, periodos, asientos, reversos, libros y cierres. El grupo Financiero cubre `XLS-016` a `XLS-038` y debe terminar con registro, reimpresión, modificación y anulación de comprobantes como páginas distintas; reportes como mayor, balances, resultados y gastos por centro navegarán a sus orígenes.

`XLS-100` demostrará que una empresa puede operar sin inmuebles. `XLS-101` demostrará carga cifrada, validación, prueba controlada, rotación y baja sin secreto en logs. El motor de asientos debe rechazar desequilibrios en base de datos, respetar periodos cerrados y conservar el vínculo original-reverso.

**Hito C:** una empresa sin `PROPERTY_MANAGEMENT` registra un asiento balanceado, consulta mayor y cierre, reimprime sin segundo asiento, modifica mediante flujo permitido y anula mediante reverso auditado. La recarga del navegador conserva los datos.

### Fase D — CxP, CxC, Bancos y Caja Chica

Se implementarán los 18 IDs `XLS-041`–`XLS-058` de CxP, incluyendo proveedores, importación compartida, documentos de soporte, anticipos, notas de crédito, liquidaciones, retenciones y reportes. CxP debe producir obligación y auxiliar una sola vez; pagos, reimpresiones, modificaciones y anulaciones conservarán páginas y permisos propios.

CxC cubrirá sus 26 IDs `XLS-059`–`XLS-084`: clientes, importación, recaudaciones, reimpresión y anulación, cheques recibidos, anticipos, ajustes, facturación recurrente, campañas y reportes del mapa. Debe permitir cobros parciales, excedentes como anticipos, conciliación de dependencias y reversos; un reintento no duplica recibo, aplicación, deuda ni asiento. La dirección de retención de `E118` se probará con el selector **Emitidas/Recibidas** conservando su título y navegación.

Bancos comprende `XLS-085`–`XLS-095`: cuentas, depósitos, anulación de depósitos, cambio y reimpresión de cheques, egresos, anulación de egresos, reportes, extractos y conciliación. Un depósito transfiere origen a banco sin crear ingreso nuevo; una reimpresión es documental; un pago duplicado se bloquea por saldo, obligación y clave idempotente.

Caja Chica comprende `XLS-039` y `XLS-040`, con registro de fondo, soportes, rendición, aprobación, reposición, bandeja de pendientes y adición de arqueo/cierre. Un soporte duplicado, rechazado o sin evidencia no puede habilitar reposición. La contabilización de gasto y reposición debe quedar separada y enlazada.

**Hito D:** ejecutar de extremo a extremo compra–obligación–pago, cobro–aplicación–depósito, soporte–rendición–reposición y conciliación bancaria, comprobando auxiliares, asientos, locks, reversos y persistencia tras recarga.

### Fase E — Administración Inmuebles y Email

Se construirán las 11 pantallas `XLS-001`–`XLS-011` bajo Administración Inmuebles, respetando General, Inmuebles y Notificaciones. Tipo de Inmueble, Niveles de Piso, Sección y Rubros serán mantenimientos operativos; Detalle Inmuebles tendrá unidades, vínculos y vigencias; Resumen General mostrará totales conciliables; Carga Masiva tendrá prevalidación y errores por fila; Reporte Histórico de Propietarios conservará copropiedad e historia. Configuración Destinatarios, Envío Email y Boletín tendrán sus vistas y procesos independientes.

Se incorporarán, sin sustituir esas hojas, los complementos de presupuesto/fondos y generación/aprobación de expensas que permitan completar el ciclo: padrón y alícuotas vigentes → presupuesto o resolución → vista previa → aprobación → cargos y obligación única del núcleo → asiento → notificación → cobro → conciliación → reporte. No se considerará funcional el módulo si solo permite dar de alta inmuebles. Un cambio de propietario no altera cargos previos; reenviar o regenerar un ciclo no duplica deuda. Probar el módulo activo y desactivado, con continuidad del núcleo en ambos modos.

Se entregarán `XLS-012`–`XLS-015` como cuatro pantallas independientes: plantillas de expensas ordinarias, extraordinarias, recaudaciones y gestión de cobranza. Se conservará el funcionamiento del núcleo para recaudaciones y cobranza sin inmuebles; las dos plantillas de expensas respetarán `PROPERTY_MANAGEMENT` y `MODULE_DISABLED`.

El proceso real será versionar, validar variables, previsualizar, enviar prueba, solicitar aprobación, publicar, encolar por outbox y consultar entregas en una bandeja adicional. La bandeja no fusiona las pantallas de modificación. Un timeout externo no provoca reenvío ciego; el contacto, recibo, adjunto autorizado y campaña quedan correlacionados. El correo no crea cargos, cobros ni asientos.

**Hito E:** un condominio completa un ciclo de expensas hasta cartera, asiento, cobro y reporte, conservando padrón histórico. Publicar una plantilla aprobada, ejecutar un evento posterior al commit y revisar entrega o resultado incierto. Repetir la generación o el envío no duplica obligaciones, asientos ni efectos financieros; la empresa sin inmuebles sigue operando.

### Fase F — Reportes, Tributación y cierre funcional

Tributación cubre `XLS-096`–`XLS-099`: conciliación de compras, compras mensuales, **Anexo Transaccional RDEP** con pestañas ATS/RDEP y reporte general de compras y retenciones. Las conciliaciones serán snapshots reproducibles con diferencias por fila, soporte, clasificación, aprobación y navegación al documento fuente. Los reportes tendrán filtros explícitos, totales con precisión decimal, exportación idéntica a pantalla y enlaces a compra, retención, aplicación, asiento y anexo.

ATS leerá transacciones; RDEP aceptará importación laboral anual con errores por fila cuando no exista nómina integrada. No se construirá implícitamente un módulo payroll. No se afirmará presentación fiscal por generar XML, y un estado externo desconocido exigirá conciliación antes de reintentar.

Se completarán las adiciones de trazabilidad, exportación, bandejas de diferencias, cierre mensual/anual, reapertura con doble control, comparación de auxiliares contra mayor y documentación operativa. Los reportes no serán tarjetas decorativas ni totales calculados únicamente en React.

Se construirán también los accesos complementarios de diario, balance de comprobación, activos fijos/depreciación, flujo de efectivo y migración de saldos iniciales. Emisión de retenciones y notas de crédito/débito de venta se completan en Fase D; presupuesto y expensas en Fase E; usuarios/roles y plantillas de contabilización en Fase C. No relegar estas funciones a una lista de pruebas si todavía no existe su pantalla o proceso.

**Hito F:** una compra con retención concilia contra mayor, se visualiza en el reporte, produce snapshots ATS y RDEP separados cuando aplique, y todo se puede rastrear sin duplicar asiento ni marcar aceptación externa ficticia.

### Fase G — Regresión integral y piloto

Se ejecutará una matriz de regresión de los 101 IDs y de las 20 mejoras conservadas del plan previo: roles y MFA; auditoría; motor de asientos automáticos; diario y balance de comprobación; presupuestos y generación de expensas; importación XML de compras; emisión de retenciones y notas de crédito/débito de venta; impuestos por vigencia; conciliación bancaria; aprobaciones; ATS separado de RDEP; importador laboral anual; activos fijos; flujo de efectivo; continuidad y monitoreo; migración integral; privacidad; exportaciones; integración SRI resiliente; y accesibilidad. La referencia mantiene 20 mejoras mediante consolidación de “diario y balance” como una mejora y “emisión de retenciones/notas” como otra; la matriz final conservará IDs `ADD-001` a `ADD-020`.

Los opcionales de nómina completa/payroll, portal de propietarios y pagos o conexiones bancarias en línea quedan fuera del alcance base. Podrán ser objeto de cambio posterior; no se incluyen tácitamente ni sustituyen las pruebas del núcleo.

El piloto tendrá dos escenarios: empresa general sin inmuebles y empresa con `PROPERTY_MANAGEMENT` habilitado. Se probará activación, desactivación, lectura histórica, migración, permisos, recuperación, carga, concurrencia, fallas de proveedor y accesibilidad. **Hito G:** acta de aceptación, matriz completa, evidencia reproducible, capacitación y autorización específica de puesta en marcha. Ningún scaffold marca una fase terminada.

## 6. Contrato obligatorio por pantalla

Cada una de las 101 hojas se aceptará con cuatro capas inseparables:

1. **UI:** página dedicada en la ruta del árbol, título y breadcrumb correctos, filtros, campos, columnas, acciones, estados de carga/vacío/error, permisos visibles, accesibilidad y separación de registro/reimpresión/modificación/anulación.
2. **API:** endpoint o conjunto de endpoints documentado, autorización por tenant/empresa/rol, validaciones de dominio, errores explícitos, idempotencia, paginación, versión esperada, auditoría y trabajo asíncrono cuando corresponda.
3. **DB:** migraciones aplicadas, relaciones y restricciones, persistencia real, snapshots, estados separados, asientos o auxiliares enlazados, inmutabilidad de publicados, locks y recuperación tras recarga.
4. **Pruebas:** pruebas unitarias/de dominio, API positiva y negativa, integración y Playwright con datos controlados. La matriz debe enlazar requisito, evidencia, fecha, versión y resultado.

La aceptación Playwright mínima seguirá el recorrido **clic en menú → URL exacta → formulario/listado → operación → persistencia tras recarga → auxiliar, asiento u origen/reportes**. Para cada pantalla habrá al menos un caso positivo y uno negativo. Los reportes demostrarán filtros, total, navegación y exportación; los importadores demostrarán plantilla, errores por fila, confirmación selectiva y reintento; reimpresiones demostrarán cero efecto contable; anulaciones demostrarán dependencia, aprobación y reverso enlazado.

Una captura de pantalla no es evidencia suficiente. La evidencia debe incluir video o trazas Playwright cuando sea necesario, URL, request/response sanitizados, identificador de operación, consulta posterior, asiento o auxiliar resultante, estado después de recargar y registro de error para el caso negativo. Los secretos, certificados y datos personales deben aparecer redactados. Un botón que cambia solo estado en memoria, una tabla de ejemplo, un endpoint sin UI, una UI sin persistencia o un menú sin proceso se clasificará como incompleto.

## 7. Medidas contra entregas incompletas

Cada entrega tendrá una lista de IDs cerrada y no podrá declarar “terminado” un grupo por haber generado rutas o componentes. El estado de cada hoja será `no auditada`, `faltante`, `existente incompleta`, `en desarrollo`, `en pruebas`, `aceptada` o `bloqueada`, con motivo y evidencia. El avance de cobertura será pantallas originales aceptadas sobre 101; las cuatro capas tendrán controles separados. Una pantalla con solo UI no suma como aceptada, y los complementos se reportarán por separado, sin inflar el conteo del Excel.

Se aplicará una definición de terminado que exige ruta única, operación real, permisos, persistencia, auditoría, prueba positiva, prueba negativa y navegación al resultado. Se bloqueará el avance si hay datos falsos en producción, endpoints SRI inventados, tasas hardcodeadas, efectos contables duplicados, secretos en logs, reportes sin origen, importadores sin errores por fila o dependencia inmobiliaria obligatoria en el núcleo.

Cada hito tendrá demostración en ambiente reproducible, revisión funcional y técnica, migraciones aplicables desde cero, datos de prueba identificados y registro de defectos. Los cambios al alcance conservarán la hoja original y crearán una decisión con motivo, impacto, dependencias, pruebas y aprobación. El plan anterior de 24 semanas con reserva hasta 28 semanas queda únicamente como referencia histórica: no se reestimará ni se convertirá en compromiso sin auditoría, repositorio, volumen, proveedores y responsables confirmados.

## 8. Decisión solicitada

Se solicita aprobar este plan v2 como marco de reconstrucción, confirmar que las cinco raíces y los 101 IDs son obligatorios, designar responsable funcional y contador revisor, y suministrar URL de repositorio o aplicación si se desea ejecutar la Fase A. Por ahora el estado permanece **pendiente de aprobación** y no se ejecuta construcción. La falta de acceso bloquea la auditoría de la aplicación existente, pero no impide aprobar los contratos ni convierte los elementos no auditados en faltantes confirmados.

La aprobación propuesta debe entenderse así: se autoriza iniciar el levantamiento contractual y, si se proporciona acceso, la auditoría; no se autoriza todavía producción, certificados reales, pagos ni presentación tributaria. Solo después de que cada fase cumpla sus hitos y la regresión integral produzca evidencias podrá emitirse un acta separada de aceptación y una decisión de piloto.

## 9. Distribución completa de pantallas del Excel

Este árbol reproduce los 144 nodos del archivo: 43 agrupadores y 101 pantallas. Los grupos no cuentan como pantallas operativas. Las columnas B–F determinan la jerarquía; las filas determinan el orden. Una empresa sin inmuebles oculta únicamente las opciones verticales aplicables, sin trasladar las demás funciones a otras raíces.

```text
- Administración Inmuebles [B4]
  - General [C5]
    - Tipo de Inmueble [XLS-001 / D6]
    - Niveles de Piso [XLS-002 / D7]
    - Sección [XLS-003 / D8]
    - Rubros [XLS-004 / D9]
  - Inmuebles [C10]
    - Detalle Inmuebles [XLS-005 / D11]
    - Resumen General [XLS-006 / D12]
    - Carga Masiva de Inmuebles [XLS-007 / D13]
    - Reporte Histórico de Propietarios [XLS-008 / D14]
  - Notificaciones [C15]
    - Configuración Destinatarios [XLS-009 / D16]
    - Envío Email [XLS-010 / D17]
    - Boletín [XLS-011 / D18]
- Email [B19]
  - Modificar Email Exp. Ordinarias [XLS-012 / C20]
  - Modificar Email Exp. Extraordinarias [XLS-013 / C21]
  - Modificar Email Recaudaciones [XLS-014 / C22]
  - Modificar Email Gestión Cobranza [XLS-015 / C23]
- Contabilidad [B24]
  - Financiero [C25]
    - Configuración [D26]
      - Tipo Comp. Contables [XLS-016 / E27]
      - Establecimientos [XLS-017 / E28]
      - Centro de Costos [E29]
        - Tipos de C. Costos [XLS-018 / F30]
        - Ingreso C. Costos [XLS-019 / F31]
      - Retenciones [E32]
        - Tipos Imp. Renta [XLS-020 / F33]
        - Tipos Ret. IVA [XLS-021 / F34]
      - Secuencia de Documentos [E35]
        - Expensas [XLS-022 / F36]
        - Secuencia Terminales [XLS-023 / F37]
        - Comprobantes Contables [XLS-024 / F38]
    - Plan Contable [D39]
      - Plan Contable [XLS-025 / E40]
      - Migrar Plan Contable [XLS-026 / E41]
    - Comprobantes Contables [D42]
      - Registro Comp. Contable [XLS-027 / E43]
      - Reimpresión Comp. Contable [XLS-028 / E44]
      - Modificación Comp. Contable [XLS-029 / E45]
      - Anulación Comp. Contable [XLS-030 / E46]
    - Libros Contables [D47]
      - Libro Mayor [XLS-031 / E48]
      - Balance General [E49]
        - Balance General Vertical [XLS-032 / F50]
        - Análisis de Saldos [XLS-033 / F51]
        - Balance Horizontal Acumulado [XLS-034 / F52]
      - Estado de Resultados [XLS-035 / E53]
      - Gastos x C.C. [E56]
        - Saldos Mensuales [XLS-036 / F57]
        - Acumulados [XLS-037 / F58]
      - Cierres [E59]
        - Registro de Cierres [XLS-038 / F60]
  - Caja Chica [C62]
    - Registro de Caja Chica [XLS-039 / D63]
    - Documentos Pendientes [XLS-040 / D64]
  - CxP [C65]
    - Proveedores [D66]
      - Grupo de Proveedores [XLS-041 / E67]
      - Registro Proveedores [XLS-042 / E68]
      - Importación Masiva de Proveedores/Clientes [XLS-043 / E69]
    - Documentos de Soporte [XLS-044 / D70]
    - Anticipos [D71]
      - Ingreso de Anticipos [XLS-045 / E72]
      - Cruce de Anticipos Proveedores [XLS-046 / E73]
      - Anulación de Anticipos Proveedores [XLS-047 / E74]
      - Migración Anticipos Proveedores [XLS-048 / E75]
    - Notas de Crédito [D76]
      - Ingreso Nota de Crédito [XLS-049 / E77]
      - Anulación Nota de Crédito [XLS-050 / E78]
    - Liquidación de Compras [D79]
      - Ingreso Liq. De Compras [XLS-051 / E80]
      - Anulación Liq. De Compras [XLS-052 / E81]
    - Retenciones [D82]
      - Anular Retención [XLS-053 / E83]
    - Reportes [D84]
      - Rep. Documentos Ingresados [XLS-054 / E85]
      - Rep. Retenciones Emitidas [XLS-055 / E86]
      - Rep. de Anticipos [XLS-056 / E87]
      - Rep. Saldo de Proveedores [XLS-057 / E88]
      - Rep. Pagos Realizados [XLS-058 / E89]
  - CxC [C90]
    - Clientes [D91]
      - Registro Clientes [XLS-059 / E92]
      - Importación Masiva de Proveedores/Clientes [XLS-060 / E93]
    - Recaudaciones [D94]
      - Ingreso de Recaudación [XLS-061 / E95]
      - Reimpresión de Recuadación [XLS-062 / E96]
      - Anulación de de Recuadación [XLS-063 / E97]
      - Registro de Cheques a Fecha [XLS-064 / E98]
    - Ajustes [D99]
      - Cruce de Anticipos Clientes [XLS-065 / E100]
      - Anulación de Anticipos Clientes [XLS-066 / E101]
      - Anulación Cruce de Anticipos Clientes [XLS-067 / E102]
      - Ajuste de Cartera [XLS-068 / E103]
      - Migración Anticipos Clientes [XLS-069 / E104]
    - Comprobantes de Venta [D105]
      - Facturación [XLS-070 / E106]
      - Facturación Recurrente [XLS-071 / E107]
      - Notas de Venta [XLS-072 / E108]
      - Anulación Comp. Venta [XLS-073 / E109]
      - Migrar Antigüedad de Cartera [XLS-074 / E110]
    - Gestión de Cobranza [D111]
      - Campañas [XLS-075 / E112]
    - Retenciones [D113]
      - Ingreso de Retenciones [XLS-076 / E114]
      - Anulación de Retenciones [XLS-077 / E115]
    - Reportes [D116]
      - Rep. Documentos Emitidos [XLS-078 / E117]
      - Rep. Retenciones Emitidas [XLS-079 / E118]
      - Rep. Angitüedad de Cartera [XLS-080 / E119]
      - Rep. Cartera de Clientes [XLS-081 / E120]
      - Rep. Recaudaciones [XLS-082 / E121]
      - Rep. Saldo Anticipo de Clientes [XLS-083 / E122]
      - Rep. Cruce de Anticipo Clientes [XLS-084 / E123]
  - Bancos [C124]
    - Cuentas Bancarias [XLS-085 / D125]
    - Depósitos [D126]
      - Ingreso de Depósito [XLS-086 / E127]
      - Anulación de Depósito [XLS-087 / E128]
    - Cheques [D129]
      - Cambio de Cheque [XLS-088 / E130]
      - Reimpresión de Cheque [XLS-089 / E131]
    - Egresos [D132]
      - Emisión de Egreso [XLS-090 / E133]
      - Anulación de Egreso [XLS-091 / E134]
    - Reportes [D135]
      - Rep. Cheques Emitidos [XLS-092 / E136]
      - Rep. Saldo en Bancos [XLS-093 / E137]
      - Rep. Mayor de Cuentas [XLS-094 / E138]
      - Rep. Movimientos Bancarios [XLS-095 / E139]
- Tributación [B140]
  - Conciliación Compras [C141]
    - Generación de Conciliación [XLS-096 / D142]
    - Compras Mensuales [XLS-097 / D143]
  - Generación de Archivos XML [C144]
    - Anexo Transaccional RDEP [XLS-098 / D145]
  - Reportes [C146]
    - Rep. Compras y Retenciones General [XLS-099 / D147]
- Configuración General [B148]
  - Configuración Empresa [XLS-100 / C149]
  - Certificado Digital [XLS-101 / C150]
```

## 10. Accesos complementarios que cierran los procesos

Se agregan catorce pantallas de procesos ya incluidos en el alcance base. Se insertan después de los hijos originales del padre indicado; no sustituyen ni cambian las 101 hojas. Los asistentes, selectores y bandejas de apoyo se documentan aparte y no inflan el conteo del Excel.

- **CMP-001 — Emitir Retención**. Ubicación: Contabilidad > CxP > Retenciones. Control incluido: ADD-007.
- **CMP-002 — Notas de Crédito de Venta**. Ubicación: Contabilidad > CxC > Comprobantes de Venta. Control incluido: ADD-007.
- **CMP-003 — Notas de Débito de Venta**. Ubicación: Contabilidad > CxC > Comprobantes de Venta. Control incluido: ADD-007.
- **CMP-004 — Presupuesto y Fondos**. Ubicación: Administración Inmuebles > Inmuebles. Control incluido: ADD-005.
- **CMP-005 — Expensas Ordinarias**. Ubicación: Administración Inmuebles > Inmuebles. Control incluido: ADD-005.
- **CMP-006 — Expensas Extraordinarias**. Ubicación: Administración Inmuebles > Inmuebles. Control incluido: ADD-005.
- **CMP-007 — Usuarios, Roles y Permisos**. Ubicación: Configuración General > Seguridad. Control incluido: ADD-001.
- **CMP-008 — Plantillas de Contabilización**. Ubicación: Contabilidad > Financiero > Configuración. Control incluido: ADD-003.
- **CMP-009 — Libro Diario**. Ubicación: Contabilidad > Financiero > Libros Contables. Control incluido: ADD-004.
- **CMP-010 — Balance de Comprobación**. Ubicación: Contabilidad > Financiero > Libros Contables. Control incluido: ADD-004.
- **CMP-011 — Registro de Activos Fijos**. Ubicación: Contabilidad > Financiero > Activos Fijos. Control incluido: ADD-013.
- **CMP-012 — Depreciación de Activos Fijos**. Ubicación: Contabilidad > Financiero > Activos Fijos. Control incluido: ADD-013.
- **CMP-013 — Estado de Flujo de Efectivo**. Ubicación: Contabilidad > Financiero > Libros Contables. Control incluido: ADD-014.
- **CMP-014 — Migración de Saldos Iniciales**. Ubicación: Contabilidad > Financiero > Migración. Control incluido: ADD-016.

## 11. Archivos contractuales y uso por la siguiente IA

`02_Catalogo_pantallas_procesos_v2.md` define las 101 fichas con campos, columnas, acciones, proceso, persistencia y pruebas. `03_Manifiesto_pantallas_v2.json` contiene el detalle estructurado completo y las URL asignadas; `03_Menu_original_v2.json` conserva el árbol literal. `03_Matriz_pantallas_procesos_v2.xlsx` permite revisar menú, fichas, procesos integrales, 303 casos propuestos para las pantallas originales, complementos y avance. `04_Base_tecnica_v2.md` mantiene arquitectura, integridad, seguridad y fuentes de Ecuador, con navegación corregida a esta distribución.

Para evitar cargar todo el catálogo en un único contexto, el paquete incluye fichas JSON por módulo en `pantallas_por_modulo/`. La IA puede trabajar por grupo, pero no omitir los demás. El manifiesto conserva el detalle completo; la ficha documental abrevia únicamente algunas explicaciones de objetivo/vista, no sus campos ni acciones.

Cada entrega deberá indicar IDs aceptados y pendientes. No se ha auditado ni modificado la aplicación anterior. Se espera aprobación del usuario antes de ejecutar el plan.
