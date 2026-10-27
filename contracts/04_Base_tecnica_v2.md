# Base técnica v2 — Sistema contable con distribución original de pantallas

**Proyecto:** SAGA. **Versión:** 2.0. **Fecha de referencia:** 25 de octubre de 2026. **Autor:** Manus AI. **Estado:** pendiente de aprobación; no autoriza construcción, despliegue ni operaciones reales.

Construir un sistema contable general para Ecuador con React/TypeScript, FastAPI/Python y PostgreSQL. La administración de inmuebles y condominios será una extensión opcional por empresa que opera sobre el núcleo contable. Una empresa de servicios, comercio sin inventario o consultoría debe poder registrar compras, ventas, cartera, pagos, impuestos, bancos y cierres sin crear una sola unidad inmobiliaria.

Este documento se lee junto con `01_Plan_reconstruccion_v2.md`, `02_Catalogo_pantallas_procesos_v2.md` y `03_Manifiesto_pantallas_v2.json`. El manifiesto registra las 101 pantallas originales y sus contratos. Los 20 controles/mejoras incluidos previamente se mantienen; portal, nómina completa y pagos en línea requieren alcance adicional. Prevalecen la distribución exacta del Excel y las fichas v2; esta base aporta integridad, arquitectura y fuentes sin autorizar mover pantallas.

## 1. Contrato de trabajo para la IA

Antes de ejecutar cualquier construcción, verificar que el usuario haya aprobado explícitamente el alcance base. Hasta entonces, limitarse a revisar o modificar documentos. La aprobación de planificación habilita el primer hito de ejecución, no producción, envíos de impuestos, pagos ni uso de certificados reales.

Después de la aprobación, realizar una entrega vertical por iteración: migración, modelos, servicio de dominio, API, permisos, interfaz conectada, pruebas, evidencia y documentación. No avanzar creando primero todas las pantallas ficticias. No considerar terminado un requisito porque exista un menú o una ruta con respuesta 200.

La IA deberá conservar una lista de cumplimiento por `XLS-*` y `ADD-*`: pendiente, en desarrollo, pruebas, aceptado o bloqueado. Cada aceptación debe referenciar una prueba y una demostración. Los bloqueos deben expresar dato/decisión faltante y responsable, sin inventar políticas legales, reglas de mora ni tarifas.

**Precedencia:** una decisión del usuario aprobada y registrada tiene prioridad; después, las reglas de modularidad e integridad de este documento, los criterios de la matriz y el contrato técnico. Si existe contradicción material, detener la función afectada y solicitar decisión. La configuración tributaria aprobada puede cambiar por vigencia sin alterar documentos históricos.

## 2. Producto modular y configuración por cliente

### 2.1 Paquetes y dependencias

`ACCOUNTING_CORE` contiene identidad, empresa, auditoría, terceros, configuración, contabilidad, CxP, CxC, ventas/compras, tesorería, caja chica, reportes, notificaciones generales y tributación configurada según aplicabilidad. Debe arrancar y operar solo. Presupuestos generales, activos y anexos pueden habilitarse como capacidades del núcleo según el perfil, pero no depender de inmuebles.

`PROPERTY_MANAGEMENT` añade condominios, unidades, pisos, secciones, alícuotas, titularidad, rubros inmobiliarios, presupuesto/fondos y ciclos de expensas, notificaciones de expensas y reportes por unidad. Depende del núcleo. Se construirá para cumplir el Excel, pero su contratación/uso será opcional. Los requisitos inmobiliarios mínimos son `XLS-001` a `XLS-013` y `XLS-022`; los demás pueden funcionar en el núcleo, aunque admitan enlaces opcionales con inmuebles. `ADD-005` es la ampliación de presupuesto/expensas del vertical.

`RESIDENT_PORTAL`, `PAYROLL` y `ONLINE_PAYMENTS` son extensiones futuras correspondientes a `ADD-021`, `ADD-022` y `ADD-023`. No implementarlas sin cambio de alcance. El núcleo sí incluirá importación anual de datos laborales y exportación RDEP cuando corresponda.

Registrar `company_module`: empresa, código de módulo, estado `ENABLED/READ_ONLY/DISABLED`, versión de habilitación, fecha efectiva, actor, motivo y configuración. La autorización efectiva será intersección de módulo habilitado, permiso del usuario y alcance de empresa/condominio. No confiar en una bandera enviada por el navegador.

### 2.2 Apagado, reactivación y datos históricos

Con inmuebles desactivado, ocultar menús y campos de la extensión en la operación habitual y rechazar nuevas escrituras verticales con `403 MODULE_DISABLED`. El núcleo no exigirá `condominium_id`, `property_unit_id`, propietario, rubro de expensa o alícuota para ninguna compra, venta, asiento, cobro, pago, banco o cierre general. Los reportes generales no requerirán unir tablas verticales.

Al desactivar una empresa que ya utilizó la extensión, mostrar un asistente de impacto: ciclos en curso, tareas recurrentes, cobros relacionados y trabajos pendientes. Suspender generación futura; preservar lectura histórica y contabilizaciones ya emitidas. Cobrar una deuda existente, aplicar un anticipo, corregir un asiento o reportar un saldo seguirá siendo una operación del núcleo permitida según permisos. No borrar datos por baja comercial.

Reactivar restaura configuración validada, pero no genera automáticamente ciclos pendientes: primero presentar vista previa, periodos omitidos y aprobaciones. La desactivación de un módulo no altera libros, anexos ni auditores históricos.

### 2.3 Contrato de extensión sin acoplamiento inverso

Los módulos generales no importarán servicios ORM de inmuebles ni tendrán FKs obligatorias hacia sus tablas. La extensión guardará los enlaces en sus propias tablas: `property_receivable_link`, `property_document_link` y `property_journal_dimension`, con FKs compuestas hacia núcleo y unidad/condominio. La API del núcleo recibirá un identificador de correlación de origen; el vertical validará sus dimensiones antes de invocar casos de uso generales.

La contabilidad resolverá cuentas y centros de costo mediante plantillas genéricas. La extensión traducirá un ciclo de expensas a cargos del núcleo; no tendrá un libro mayor paralelo. El núcleo publica eventos internos versionados de cargo creado, cobro aplicado, documento emitido, asiento publicado y reversado. La extensión los consume idempotentemente para sus vistas, sin modificar el saldo canónico por su cuenta.

La base PostgreSQL puede usar esquemas `core`, `property`, `tax` y `ops` dentro de una misma base. Las migraciones verticales deben poder instalarse sin afectar la operabilidad de núcleo. Las pruebas deberán cubrir tanto instalación solo núcleo como instalación completa con módulo desactivado/activado.

## 3. Navegación y experiencia React

El menú reproduce exactamente las cinco raíces Administración Inmuebles, Email, Contabilidad, Tributación y Configuración General. Contabilidad conserva Financiero, Caja Chica, CxP, CxC y Bancos bajo sus padres originales, con todo el orden y profundidad del Excel. No crear raíces sustitutivas Compras, Ventas, Tesorería o Comunicaciones para mover funciones. Cada una de las 101 opciones originales posee su propia ruta y vista configurada; compartir un componente no permite fusionar accesos. La visibilidad inmobiliaria depende del módulo, sin mover el resto. Las adiciones van después de hijos originales en el padre aprobado.

Usar React con TypeScript estricto y Vite; enrutamiento con React Router o TanStack Router, seleccionado en el hito de plataforma; TanStack Query para estado remoto; React Hook Form y Zod para validación de formularios; un sistema de componentes accesible consistente. No almacenar importes canónicos como `number` JavaScript. Usar cadenas/decimal para cálculo de presentación y volver a calcular todo en backend.

Cada pantalla de mantenimiento tendrá listado paginado, filtros, formulario, validación, permisos y activación/inactivación. Cada pantalla transaccional tendrá estados separados, vista previa contable, soportes, historial y acciones disponibles según estado. Cada reporte tendrá fecha de corte o intervalo, empresa, filtros, totales conciliables, exportación y navegación a documentos/asientos.

Patrones obligatorios: estados de carga/error/vacío, confirmación informativa para operaciones internas sensibles, prevención de doble clic con idempotencia en servidor, ayudas de campo, búsqueda de terceros/cuentas, teclado, foco y contraste. Mostrar fecha local e importes en español Ecuador; almacenar eventos UTC y fechas comerciales como `date`. Importaciones deben permitir descargar plantilla, cargar, prevalidar, corregir errores por fila y confirmar.

La configuración de módulos provendrá de `GET /api/v1/me/context`; ninguna ruta oculta debe quedar accesible por URL directa sin verificación backend. Las llamadas externas largas devolverán trabajo con `202` y pantalla de seguimiento, nunca un spinner indefinido.

## 4. Reglas funcionales del núcleo general

### 4.1 Empresa, terceros y configuración

Modelar tenant como cliente/organización contratante, empresa como entidad contable/tributaria y condominio como agrupación vertical. Si un condominio tiene personalidad/RUC/libros independientes, representarlo como otra empresa; no tratarlo solo como centro de costo de una administradora. Registrar quién emite y quién administra. No compartir efectivo o cartera entre entidades jurídicas mediante un simple filtro.

La empresa guarda RUC/identificación, razón social, nombre comercial, moneda base USD propuesta, dirección, perfil tributario con vigencia, condición de agente de retención/contribuyente especial cuando corresponda, ejercicio, políticas y responsables. Datos fiscales de emisor/receptor se congelan en cada documento. Pasaporte e identificación extranjera deben admitirse sin forzar dígito verificador ecuatoriano.

Tercero es una persona/organización con perfiles cliente y proveedor reutilizables por empresa. No duplicar un tercero al importarlo desde dos menús. Sus saldos pertenecen a empresa y moneda. Cambiar cuenta bancaria de proveedor requiere evidencia y aprobación; no actualizar pagos históricos. Mantener catálogo simple de productos/servicios, unidades, descripción, precio orientativo, cuentas y tratamiento fiscal para facturación general; no implementar inventario o costeo de bodegas sin alcance adicional.

### 4.2 Contabilidad y periodos

Permitir plan jerárquico con naturaleza, cuentas imputables, reportes de clasificación y centros de costo. No imponer un plan único a todo Ecuador. Cada plantilla versionada resolverá eventos y cuentas: ventas, compras, anticipos, retenciones, cobros, pagos, cheques, depósitos, comisiones, caja chica, depreciación y ajustes.

Un asiento publicado no se edita ni elimina. La opción modificación del Excel edita solo borradores o abre el flujo reverso/reemplazo. Los asientos generados por módulos solo se corrigen desde su operación de origen para mantener auxiliares; el contador no debe alterar directamente la cuenta de control sin conciliación específica. Los números consumidos no se reutilizan; los huecos se justifican, no se “compactan”.

Por defecto, cerrar mensualmente bloquea nuevos movimientos y no cancela cuentas de resultados. El cierre anual genera las cancelaciones/resultados según política aprobada. Reapertura requiere segundo aprobador, motivo, periodo limitado y evaluación del impacto en reportes/anexos exportados. Una operación que intente publicar al mismo tiempo que un cierre debe quedar ordenada por locks y terminar publicada antes del cierre o rechazada después, nunca en estado intermedio.

### 4.3 Libro auxiliar único y documentos

Implementar `receivable_item` como obligación canónica: empresa, tercero, origen/tipo, emisión, vencimiento, moneda, importe original, ajustes válidos y estado. Puede originarse en factura general o cargo de expensa no fiscal. Una factura fiscal que representa un cargo existente se enlaza a esa misma obligación y no crea una segunda deuda ni segundo ingreso. Las aplicaciones de cobros, anticipos y retenciones apuntan al ítem de cartera, no exclusivamente a `sales_document`.

El saldo al corte se deriva de importe original, ajustes, notas, aplicaciones y reversos con sus fechas efectivas. Un campo `remaining_amount` puede ser caché bloqueada/versionada, no fuente única de verdad. Mantener equivalente para CxP con `payable_item`. Las notas de crédito pueden superar el saldo impago de una factura ya pagada y generar saldo a favor del tercero; validar contra el importe/documento y no rechazar solo por saldo cero. Devoluciones y compensaciones requieren operación explícita.

### 4.4 Compras y cuentas por pagar

Registrar factura recibida, documentos no electrónicos permitidos y XML individual/ZIP. Validar proveedor/identificación, clave de acceso, serie, fecha, bases, impuestos, total y autorización cuando sea verificable. La clave de duplicado incluirá empresa, proveedor, tipo y número completo; dos proveedores distintos pueden tener el mismo número. Conservar original y hash.

Un lote tiene filas recibidas, validadas, pendientes de homologación, rechazadas y confirmadas. La importación no contabiliza antes de homologar proveedor, cuenta, centro y tratamiento del impuesto. Detectar XML malicioso, entidades externas y ZIP bombs. Un lote reintentado no crea una segunda compra.

Registrar anticipos a proveedor, cruces y anulaciones con locks y saldo disponible; anticipar no equivale a gastar. Gestionar NC recibidas, liquidaciones emitidas en supuestos habilitados y retenciones emitidas. La compra genera deuda bruta; retención reduce deuda al proveedor y crea obligación tributaria; pago reduce saldo restante. Los pagos parciales/múltiples soportes conservan aplicaciones trazables.

### 4.5 Ventas, cobranza y cuentas por cobrar

Crear factura de producto/servicio general, NC/ND cuando corresponda y nota de venta solo si el perfil lo permite. Facturación recurrente general no depende de inmueble. La unicidad natural será empresa, plan y periodo comercial; cambiar una plantilla no habilita otra factura para el mismo periodo. Reejecutar devuelve lo existente o error explicado.

Registrar cobro en caja, transferencia, depósito identificado o cheque; aplicar parcial o a varios documentos del mismo tercero/empresa. El excedente queda en anticipo cliente, no en ingreso nuevo. Registrar retención recibida en el maestro único `withholding` con dirección `RECEIVED`, soporte, valor y aplicación. No crear una segunda tabla independiente que duplique su efecto contable.

La anulación de cobro deshace aplicaciones y efectos contables atómicamente, luego gestiona dependencias bancarias. Un ajuste de cartera requiere motivo, evidencia y aprobación; castigo, condonación y diferencia de redondeo son tipos distintos. La antigüedad se calcula por vencimiento al corte, con bandas predeterminadas 0–30, 31–60, 61–90 y más de 90 días, configurables; saldos a favor/anticipos se muestran separados.

Campañas generales de cobranza usan saldo congelado al envío, preferencias legales de comunicación, responsables y promesas de pago. Nunca publican listas de deudores ni exponen destinatarios entre clientes.

### 4.6 Bancos, cheques y caja chica

Separar libro contable de extracto bancario. Importar CSV/XLSX con plantilla definida, cuenta, periodo, saldo inicial/final, filas, referencia, importe firmado, hash y resultado. Los signos se normalizan explícitamente; no inferir cargo/abono de una descripción libre. Emparejar movimientos uno a uno, uno a varios o varios a uno mediante grupos cuyo total coincida. Las tolerancias generan diferencias explicadas, no alteran valores originales.

Mantener sugerido, confirmado, descartado y excepción para conciliación; el usuario aprueba emparejamientos. Una comisión/interés faltante crea un ajuste aprobado y asiento, no un cambio de saldo directo. Cerrar conciliación exige saldo explicado y listado de partidas pendientes. Deshacerla conserva historial.

Los cheques recibidos usan custodia/posfechado/depositado/compensado/devuelto; los emitidos usan borrador/emitido/entregado/cobrado/anulado/sustituido. Definir `direction` y transiciones distintas; no mezclar cheque de cliente en custodia con cheque propio emitido. Reimpresión no es nuevo pago. Sustitución no es segundo gasto. Cheque recibido antes de compensarse se muestra en cuenta puente/no disponible, según política aprobada.

Un depósito traslada caja o cheques en tránsito a banco: no genera ingreso de nuevo. Caja chica usa fondo, custodio, saldo, comprobantes pendientes/aprobados y reposición; registrar gasto al consumir, reposición como transferencia de fondos. Arqueo y diferencias llevan aprobación y soporte.

### 4.7 Reportes, activos y flujo de efectivo

Los reportes contables usarán únicamente movimientos publicados y reversos efectivos al corte. Totalizar con la misma semántica en pantalla y exportación. Ofrecer libro diario, mayor, balance de comprobación, situación financiera vertical/horizontal, resultados, gastos mensuales/acumulados por centro, cartera/anticipos/retenciones, compras, cobros/pagos, bancos y cierre, cubriendo todas las variantes del Excel.

Mapear cuentas a estados financieros con vigencia y versión de reporte; mostrar no clasificadas como error de preparación, no ocultarlas. Para flujo de efectivo usar método indirecto como propuesta inicial, con conciliación entre saldo inicial/final y clasificación operativa/inversión/financiación; confirmar con contador antes de implementación. El tablero financiero no sustituye reportes firmables.

Activos fijos incluirá clase, costo, residual, vida útil, fecha disponible, centro, método aprobado, depreciación por periodo, baja/venta y documentos. Proponer línea recta inicialmente; no activar reevaluación, deterioro complejo o depreciación tributaria automática sin reglas confirmadas. La depreciación será única por activo/periodo/versión aprobada y respetará periodos cerrados.

## 5. Reglas funcionales de la extensión inmobiliaria

Registrar condominios, torres/secciones, pisos, tipos, unidades, áreas y usos. Separar propietarios, copropietarios, residentes, arrendatarios y responsable de pago; no asumir que siempre son la misma persona. Admitir varios propietarios simultáneos con participaciones. Evitar solapes del mismo vínculo unidad/persona/rol y verificar la suma del conjunto; no prohibir toda copropiedad por una restricción unidad/rol.

La alícuota y participación tendrán intervalos `[inicio, fin)` y aprobación. Un cargo conserva propietario/responsable, regla, alícuota, rubro y fecha como snapshot. Si cambia propietario después, no trasladar deuda automáticamente: registrar evento de transferencia/ajuste con fundamento validado y enlaces, respetando el reglamento y revisión legal.

La distribución podrá ser por alícuota, monto fijo, consumo o regla mixta aprobada por rubro. Presupuesto guarda condominio, ejercicio, rubro/centro/fondo, aprobado, comprometido, devengado y pagado. Fondos operativo/reserva/extraordinario se separan mediante dimensiones y cuentas según criterio contable; un fondo no es automáticamente otro banco ni un ingreso libre. El presupuesto general del núcleo no debe exigir estos fondos.

Un ciclo ordinario se identifica por condominio, periodo y tipo. Las expensas extraordinarias admiten varios ciclos del mismo mes mediante código/resolución aprobado; no imponer una unicidad que bloquee dos cuotas extraordinarias legítimas. Un cargo es único por ciclo, unidad y rubro/posición.

Flujo: preparar presupuesto/resolución → determinar padrón vigente → calcular borrador → presentar distribución y diferencias → aprobar → finalizar cargos y asientos → generar documento fiscal solo si aplica → notificar → recaudar → conciliar → reportar. Cargos de expensa, recibos de cobro y factura fiscal son documentos distintos; solo un reconocimiento canónico genera la deuda.

Usar cálculos `Decimal` de alta precisión. Repartir residuos de centavos por mayor residuo fraccionario y desempate por código estable de unidad; conservar ajuste por línea. La suma debe coincidir exactamente con total aprobado. Prohibir finalizar si reglas o alícuotas no cuadran; cualquier excepción debe tener aprobación y evidencia.

La mora queda desactivada hasta aprobar fórmula, límites, base legal/reglamento y aplicación. Separar principal, recargo e interés. No capitalizar ni aplicar automáticamente sanciones legales no verificadas. Conservar la tasa aplicada por periodo y no alterar cargos previos al cambiar configuración.

Para finalización de un ciclo dentro del límite ratificado en el hito de plataforma, crear cargos, obligaciones, asientos, auditoría y eventos outbox en una sola transacción. Para volúmenes mayores, preparar lote interno y publicar solo después de validación completa, con estrategia aprobada; no dejar un ciclo aparentemente finalizado con deuda parcial. Email y SRI ocurren después del commit. Un fallo en correo no elimina cargos válidos.

Las cuatro plantillas originales cubrirán expensas ordinarias, extraordinarias, recaudaciones y cobranza. Las dos últimas tienen versión general sin campos de inmueble; las dos primeras pertenecen a la extensión. El resumen/histórico inmobiliario debe conciliar saldo por unidad con cartera general, sin llevar un saldo manual separado.

## 6. Investigación de Ecuador y decisiones tributarias

### 6.1 Comprobantes electrónicos: validez, ficha y operación

El SRI identifica factura, liquidación de compras, notas de crédito/débito, retención y guía de remisión como tipos electrónicos; distingue pruebas sin validez tributaria de producción autorizada. El portal consultado publica la ficha técnica offline **2.34, actualizada a julio de 2026**, y esquemas por tipo/versión. Esta publicación es la referencia inicial, no una garantía de que siga sin cambios al construir. [1]

Implementar factura, NC/ND, liquidación y retención dentro del alcance base; guía de remisión se activará solo mediante alcance adicional si el cliente realiza traslados que la requieren. No afirmar cobertura integral de comercio con inventario/logística si se excluyen esos procesos. Descargar de la biblioteca oficial, versionar y guardar hash de cada XSD/catálogo/ficha utilizado; validar ejemplos y respuestas contra esas versiones antes de habilitar emisión. [1]

El adaptador deberá implementar la clave de acceso de 49 dígitos y su dígito verificador según ficha, numeración establecimiento/punto/secuencial, tipo, RUC, fecha y ambiente; firma XML conforme el perfil exigido por SRI —incluido XAdES cuando la ficha lo determine—; y los servicios de recepción y autorización con sus WSDL oficiales. La IA debe obtener URLs y perfil exacto de la ficha vigente, no inventar una API REST `/sri/autorizar`. Mantener separado recibido/devuelto de autorizado/no autorizado. La comprobación de estructura XSD, firma y autorización son controles distintos. [1]

**Transmisión inmediata.** Las resoluciones 25-00000014 y 25-00000017 eliminan desde el 1 de enero de 2026 la alternativa de transmitir dentro de cuatro días hábiles. Por ello, el worker tributario procesará prioritariamente al emitir, sin programar el envío para una noche posterior. Una cola/outbox garantiza recuperación, no habilita demora voluntaria: medir edad, alertar retrasos y aplicar protocolo de contingencia validado. No vender “facturación offline” como autorización para diferir transmisión; el nombre del esquema técnico no cambia la obligación temporal. [3] [4]

Conservar XML firmado, clave, estado/fecha, autorización, respuestas y RIDE; entregar la representación/comprobante autorizado por canal configurado. Firma, certificado y contraseña se guardan cifrados, con permiso específico, alerta de vencimiento y renovación auditada. SRI en Línea y certificado no deben exponerse al navegador ni guardarse como campos públicos. Estas medidas de custodia son controles técnicos recomendados para cumplir el flujo, no una certificación automática del software. [1]

### 6.2 Anulación: regla vigente y canal realmente disponible

La resolución inicial 25-00000014 indicaba día 10; la reforma 25-00000017 lo sustituye por **día 7 del mes siguiente al de emisión**, con tratamiento de feriados/días de descanso conforme norma. La revisión directa de ambas resoluciones prevalece sobre guías antiguas que mencionan 90 días. Modelar regla y calendario con vigencia: no fijar 90 días en el sistema ni reutilizar límites históricos como actuales. [3] [4]

Retenciones, notas de crédito y notas de débito requieren aceptación del receptor en los supuestos previstos, con cinco días hábiles; existen excepciones para ciertos receptores del exterior/fallecidos y casos de retenciones vinculadas a ISD. Las facturas con leyenda “consumidor final” tienen restricciones de anulación y notas de crédito desde 2026; la reforma también sustituye el límite general de doce meses para NC de la resolución original. Incorporar estas condiciones con fuente/vigencia y revisión del contador; no conceder una anulación uniforme por ser administrador del sistema. [3] [4]

El texto oficial establece canal en línea mediante portal institucional o Facturador SRI cuando se emitió allí. **No asumir que existe un web service público para anular desde FastAPI.** La interfaz del adaptador deberá declarar capacidades: automatización solo si existe canal oficial documentado; en otro caso, generar tarea/instrucción para operador autorizado en SRI en Línea y registrar solicitud, aceptación, respuesta y evidencia de resultado. El estado interno seguirá pendiente hasta confirmación. Reverso contable y anulación fiscal son flujos separados; la interfaz debe advertir consecuencias de ambos. [3] [4]

### 6.3 ATS y RDEP, catálogos y regímenes

El SRI publica programas, fichas, catálogos y XSD distintos para ATS y RDEP. ATS informa transacciones; RDEP corresponde a relación de dependencia. La etiqueta original Anexo Transaccional RDEP conserva su ubicación y acceso; dentro de esa pantalla existirán dos pestañas y generadores separados ATS y RDEP. El portal consultado identifica ATS 1.19.0 actualizado en septiembre de 2026 y recursos RDEP para ejercicio 2026; la IA debe seleccionar recursos por periodo y verificar la combinación de ficha/plantilla/catálogo aplicable, no solo el nombre del programa. [2]

Cada generador parte de un snapshot aprobado y reconciliado, valida campos, totales, exclusiones/duplicados y XML; devuelve errores antes de exportar. Guardar versión, hash, fecha y usuario. **Generar un archivo no es presentarlo al SRI**: el envío y talón/resultado se registrarán mediante canal permitido y aprobación separada. RDEP debe importar detalle anual por trabajador si no hay nómina integrada; no deducir rubros salariales desde compras a proveedores. [2]

El perfil RUC/régimen, actividad, calidad de agente y vigencia controla comprobantes y retenciones. RIMPE distingue negocio popular de emprendedor y contempla actividades excluidas; notas de venta no se habilitan para todos los usuarios ni se deduce automáticamente el régimen por ingresos cargados en la aplicación. La calificación se verifica con documentos/catastros oficiales. [5] [6]

### 6.4 IVA, retenciones y expensas: no usar constantes universales

Implementar catálogos y una matriz por fecha, tipo de operación, concepto, base, tarifa, comprador/proveedor y régimen/calidad. Diferenciar gravado a tarifa aplicable, tarifa cero, exento y no objeto: no son etiquetas equivalentes. Las páginas SRI y resoluciones son fuente de tarifas y porcentajes, pero deben verificarse sus decretos/reformas y periodo antes de cargar valores; este diseño deliberadamente no fija una tarifa general ni porcentajes de retención como constantes. [6] [7] [8]

El SRI publica porcentajes de retención de renta mediante resolución 26-00000009 y reglas de agentes/contribuyentes especiales. El motor debe guardar código, porcentaje, fundamento y resolución de la operación. La condición de agente y los supuestos especiales, como liquidación de compras, pueden producir obligaciones distintas; una compra no siempre genera retención y un contribuyente no designado puede retener en supuestos específicos. [6] [8]

La LRTI y su reglamento contienen reglas particulares para cuotas/aportes de condóminos destinados a mantenimiento bajo propiedad horizontal. Los textos oficiales consultados de 2023 son evidencia de esa distinción, pero su aplicación concreta debe contrastarse con reformas y documentos del inmueble antes de producción. La cuota común, reserva, reembolso, consumo, alquiler y servicio profesional de administración no se agruparán como una única venta. Para cada rubro, el contador aprobará obligado, hecho económico, comprobante, base, IVA, retención y cuenta/fondo. Sin decisión, bloquear emisión automática de ese rubro. [10] [11]

### 6.5 Contabilidad general y obligaciones condicionales

La referencia tributaria SRI señala contabilidad por partida doble, en castellano y dólares para sujetos obligados, y estados financieros como soporte de obligaciones. La clasificación NIIF completas/NIIF para PYMES y la presentación a SCVS dependen de la entidad y su régimen de control; no del hecho de activar inmuebles. Configurar marco, plan y mapeos por empresa y validar con el contador. [12] [13]

Incorporar diario, balance de comprobación, flujo de efectivo y activos fijos por buenas prácticas de integridad/reporte. No afirmar que un conjunto fijo de reportes comunitarios satisface todos los requerimientos NIIF o de una compañía regulada. Si el cliente necesita estados adicionales, notas, consolidación, instrumentos financieros o módulos sectoriales, registrar un cambio de alcance.

Si existe empleador, debe evaluarse nómina, IESS, obligaciones y datos para RDEP. El IESS documenta obligaciones de registro y efectos de mora patronal; el sistema base almacenará/importará evidencia laboral anual para el anexo, pero no enviará avisos ni calculará aportes/nómina por estar desactivada la extensión laboral. Nómina completa exige otro alcance y parámetros oficiales por periodo. [17]

### 6.6 Propiedad horizontal, presupuesto y deuda

La ley y el reglamento institucional consultados respaldan la relación de unidades con bienes comunes, alícuotas, contribución a expensas y funciones de administración/asamblea. El reglamento contempla presupuesto, expensas ordinarias/extraordinarias y fondo de reserva. Guardar declaratoria, reglamento, acta y vigencia; contrastar copias normativas, reformas y reglas locales antes de automatizar porcentajes o mora. No imponer una cuenta bancaria separada como obligación universal: es una opción de control si corresponde. [14] [15]

Mantener título/propietario/responsable por periodo y evidencias. La aplicación no determina solidaridad, responsabilidad del comprador ni procedencia de acción judicial. Produce cuenta histórica, cargos y certificados revisables; cambios de responsable y de deuda requieren decisión documentada. La protección de datos impide tratar la transparencia como permiso para difundir una lista pública nominativa de morosos. [15] [16]

### 6.7 Conservación, privacidad y continuidad

El SRI recuerda conservación mínima de siete años para comprobantes, incluidos electrónicos. Aplicar una política por categoría, con plazos mayores cuando corresponda a activos, litigios u otra norma. No programar eliminación automática al cumplir siete años sin revisar impedimentos y retenciones legales. Copias, XML/autorizaciones, documentos y claves recuperables deben integrarse en los ensayos de restauración. [9] [12]

La LOPDP establece bases de licitud, información al titular, derechos y medidas de seguridad. Registrar finalidad, base legal, responsable/encargado, categorías, retención y destinatarios; las operaciones contables y cobranza no deben usar consentimiento como sustituto genérico de una base legal aplicable. Implementar acceso mínimo, bitácora, cifrado, gestión de solicitudes y evaluación de ubicación/subencargados. La eliminación solicitada debe respetar obligaciones de conservación y responder motivadamente cuando exista excepción. [16]

### 6.8 Prácticas verificadas de productos y su incorporación

Siigo|Contífico publica contabilidad, cartera, centros de costo, conciliación bancaria, reportes y automatización. Su ayuda de compras detalla TXT/XML/ZIP, homologación, documentos posiblemente duplicados, cargas parciales y reintentos por intermitencias. Se incorpora este patrón como bandeja de importación con revisión y trazabilidad, no como descarga masiva de SRI sin credenciales/canal documentado. Estas son características comerciales verificadas, no pruebas de certificación jurídica de nuestro producto. [18] [19]

ISAC ofrece en Ecuador administración de condominios con presupuesto, gastos por concepto, alícuotas, avisos, pagos, comunicación y perfiles de administrador/copropietario. Se adopta el ciclo presupuesto–cargo–cobro–conciliación–reporte para la extensión. El portal de residentes se mantiene adicional, porque el Excel no lo exige y supone permisos e integraciones propias. [20]

La separación núcleo/vertical responde a la aclaración del usuario: no copiar una especialización inmobiliaria dentro de todas las entidades. Conciliación, asientos automáticos, XML, auditoría, cartera y cierres son capacidades generales; unidades, alícuotas, actas y fondos de propiedad horizontal son extensión. Inventario/POS y logística pueden ser ampliaciones para otros sectores, no requisitos ocultos de esta versión.


## 7. Datos adicionales y contratos obligatorios

### 7.1 Tablas que completan el modelo técnico

Aplicar UUID, FK compuesta por tenant/empresa, fechas de negocio, auditoría y RLS según el catálogo técnico. En tablas globales como usuario o catálogo nacional, utilizar política específica; no obligar a un usuario global a poseer `company_id`.

- `company_module`: `tenant_id`, `company_id`, `module_code varchar(40)`, `state varchar(16)`, `effective_from timestamptz`, `config jsonb`, `version bigint`; clave única por empresa/módulo y auditoría de cambios.
- `product_service`: código, tipo bien/servicio, unidad, descripción, cuentas y perfil tributario con vigencia; único por empresa/código. No requiere bodega ni inmueble.
- `receivable_item` y `payable_item`: UUID, tercero, origen tipado, emisión/vencimiento, moneda, importe `numeric(20,2)`, estado y versión. Único por origen/id/posición para evitar doble deuda. Aplicaciones tienen FKs inequívocas a cada auxiliar; no usar un `target_id` polimórfico sin integridad.
- `settlement_application`: tabla específica por auxiliar o relación validada; importe positivo, fecha efectiva, fuente cobro/anticipo/retención/nota, reverso relacionado y estado. Garantizar saldo bajo locks. Conservar historial completo para cortes pasados.
- `property_receivable_link`, `property_document_link`, `property_journal_dimension`: solo en esquema vertical; vinculan cargo, unidad/condominio y recursos canónicos mediante FKs compuestas. Dimensiones de inmueble no aparecen como campos obligatorios en tablas generales.
- `budget`, `budget_line`, `budget_revision` y `fund`: presupuesto por empresa/ejercicio/versión y centro/rubro, estado, monto, acta; los fondos y detalles inmobiliarios viven en extensión. Compromisos, devengado y pagado se derivan de eventos/documentos, no de edición libre de acumulados.
- `approval_request`, `approval_step`: recurso, versión/hash del contenido, regla/umbral, solicitante, aprobadores, decisión/fecha. Cambiar contenido invalida aprobación anterior; impedir autoaprobación cuando la política exige segregación.
- `bank_statement`, `bank_statement_line`, `bank_reconciliation`, `bank_match_group`, `bank_match_member`: cuenta, periodo, archivo/hash, línea original normalizada, saldo, estado, movimientos contables emparejados y aprobador. Único por identidad de extracto; no usar solo monto/fecha como prueba definitiva de duplicado legítimo.
- `tax_document`, `tax_document_attempt`, `tax_cancellation_request`, `certificate_ref`: documento de origen, tipo, ambiente, clave, snapshot, versión XSD, hashes, número de intento, resultado remoto, timestamps, artefactos y secreto referenciado. Una clave puede tener varios intentos; no crear múltiples documentos para un timeout.
- `tax_return_batch`, `tax_return_validation`, `rdep_import_batch`, `rdep_employee_record`: tipo ATS/RDEP, empresa/periodo/año, versión, snapshot, errores, artefacto/hash, datos de empleado/rubros y comprobante de presentación manual cuando exista. Datos laborales cifrados y con permisos específicos.
- `fixed_asset`, `asset_depreciation_run`, `asset_depreciation_line`, `asset_disposal`: costo/residual `numeric`, vida útil, fecha disponible, clase, cuenta, método, periodo, asiento y estado; unicidad activo/periodo para ejecuciones publicadas, reversos enlazados.
- `notification_template_version`, `notification_recipient`, `delivery_attempt`, `collection_promise`: plantilla/evento/versión, variables permitidas, destinatario/base legal/preferencia, entrega/rebote y promesa/fecha/importe.
- `import_batch`, `import_row`, `migration_reconciliation`: origen/hash, corte, tipo, claves externas, validaciones, modo y diferencias; conservar mapas entre IDs originales y nuevos.

### 7.2 Contratos que deberán ampliarse en OpenAPI

Además de las familias del anexo técnico, definir:

`GET /api/v1/me/context` devuelve usuario, empresas autorizadas, empresa activa, permisos, módulos y perfil tributario visible. `PATCH /api/v1/companies/{id}/modules/{code}` requiere administrador y política de cambio; cuerpo con estado, motivo, versión esperada y confirmación del impacto. Un módulo apagado mantiene consultas históricas expresas, no autoriza crear recursos.

`GET/POST /api/v1/catalog/products-services` permite facturación no inmobiliaria. `GET /api/v1/receivables/items` y `/payables/items` filtran tercero, corte, vencimiento, estado y origen. Las aplicaciones apuntan al ítem canónico y devuelven saldo anterior/nuevo, asiento y versión; nunca calculan en cliente el saldo definitivo.

`POST /api/v1/treasury/statements/imports` recibe multipart, cuenta, periodo y versión de plantilla; retorna `202` con `job_id`. `GET /api/v1/imports/{id}` devuelve resumen y errores por fila; `POST .../{id}/confirm` confirma filas válidas revisadas. `POST /api/v1/treasury/reconciliations/{id}/matches` recibe arrays de IDs de extracto y libro, total esperado, motivo y versiones; devuelve grupo y diferencia. `POST .../{id}/close` exige conciliación final y aprobación.

`POST /api/v1/property/expense-cycles/preview` recibe condominio, periodo, tipo, resolución/rubros, vencimiento y versiones; devuelve cargos calculados, residuo, suma y snapshot/hash. `POST /api/v1/property/expense-cycles/{id}/finalize` recibe hash/versión de vista previa y aprobación; no acepta un interruptor libre para saltarse contabilidad. Documento fiscal se decide por política validada, no por un booleano arbitrario del navegador.

`POST /api/v1/tax/returns/ats` y `/rdep` recibe empresa, periodo/año, versión de esquema y snapshot; devuelve trabajo y validaciones. `POST /api/v1/tax/rdep/imports` importa detalle laboral anual. `POST /api/v1/assets/depreciation-runs/preview` devuelve cálculo por activo; `POST .../{id}/post` requiere aprobación y publica una sola vez.

`GET /api/v1/reports/{report_code}` usa `as_of` o `from/to` explícitos, empresa y filtros permitidos. Exportar mediante `POST /api/v1/report-exports` con formato, mismos filtros y snapshot; retorna trabajo y URL temporal con permisos. Endpoint de consulta/exportación no debe permitir SQL, expresiones arbitrarias o acceso entre empresas.

Cada operación documentará request/response completos en Pydantic/OpenAPI antes de su UI, incluyendo enums, precisión, nullability, permisos, estados, errores y paginación. El cliente TypeScript se generará desde OpenAPI; no mantener DTO divergentes a mano. Normalizar las rutas finales bajo dominio (`receivables`, `payables`, `treasury`, `accounting`, `property`, `tax`); los ejemplos cortos del anexo indican acciones, no autorización para publicar rutas ambiguas duplicadas.

## 8. Seguridad y pruebas de salida del producto

Usar SQLAlchemy 2 y Alembic con PostgreSQL real en integración; Pydantic 2 y Decimal para reglas. Seleccionar en el hito de plataforma versiones estables, soportadas y compatibles de React, FastAPI y PostgreSQL, documentarlas y fijarlas en lockfiles; no suponer que una versión antigua es “la última”. No reemplazar PostgreSQL por SQLite en pruebas de RLS, transacciones o constraints.

La autenticación React utilizará acceso de corta vida en memoria y refresh en cookie `Secure/HttpOnly/SameSite`, o un flujo OIDC aprobado; no almacenar tokens persistentes en `localStorage`. Proteger refresh/logout contra CSRF, verificar CORS limitado, rotar refresh y revocar sesiones. La API tendrá scopes por empresa; MFA/reautenticación para certificados, cambios bancarios, cierres y reversos sensibles.

Definir un usuario runtime sin superusuario ni `BYPASSRLS`, no propietario de tablas; activar `ENABLE/FORCE ROW LEVEL SECURITY` donde corresponda. Usar `set_config(..., true)` parametrizado por transacción y denegar si falta contexto; ningún header de tenant basta sin verificar membresía. Trabajadores usan contexto validado por empresa y roles limitados; las migraciones usan rol separado.

La garantía interna es transacción e idempotencia, no “exactamente una vez” mágico para externos. Si un proveedor de correo no admite clave idempotente, un timeout deja resultado incierto: conciliar con referencia/estado y no reenviar a ciegas. Para SRI, consultar clave de acceso antes de repetir tras respuesta desconocida. Recuperación de backups exige pausa/revisión de outbox para no reemitir efectos externos.

Pruebas adicionales a la matriz: flujo completo sin inmuebles desde compra/venta hasta cierre; empresa A con extensión y B sin ella en el mismo tenant; URL vertical deshabilitada; baja/reactivación sin pérdida; cargos/factura relacionados con una sola deuda; copropiedad concurrente; dos cuotas extraordinarias legítimas en un mes; NC de factura pagada; cierres concurrentes con publicación; dos proveedores con la misma serie/número; cambio de plantilla recurrente sin doble cargo; SRI acepta pero cliente recibe timeout; emparejamiento bancario agrupado; exportación maliciosa tipo fórmula; respaldo con base/objetos/claves recuperables.

Cobertura propuesta: al menos 85% del backend global y 95% de las ramas críticas de dinero, estados, permisos y posting. Cobertura no reemplaza prueba de comportamiento. Toda fila incluida debe tener `T-XLS-*` o `T-ADD-*`; CI falla con error monetario, fuga de empresa, migración inválida o pruebas críticas fallidas. Completar revisión de dependencias y pruebas de accesibilidad; ninguna vulnerabilidad crítica/alta explotable abierta al liberar.

La salida a producción requiere datos iniciales reconciliados, revisión contable y fiscal, prueba SRI real en ambiente de pruebas, restauración exitosa, manuales y acta de piloto. Objetivos de carga/RPO/RTO se ratifican en el hito de plataforma; la ficha técnica verificable y el proveedor externo se validan de nuevo antes de liberar.

## 9. Secuencia de ejecución y entrega completa

Ejecutar los hitos del plan v2, con las fases y paquetes de pantallas identificados allí; la secuencia técnica no altera su distribución de menú. La extensión puede desarrollarse mientras el núcleo madura, pero sus dependencias deben estar probadas antes de invocarlas. La demostración del flujo de cartera y la aceptación final deben incluir un cliente no inmobiliario; el piloto final incluirá también un condominio con extensión activa.

En cada iteración, la IA actualizará el documento de decisiones, contrato OpenAPI, matriz de avance, pruebas y manuales. Entregará migraciones reversibles cuando sean seguras; para cambios monetarios/históricos, usar migración hacia adelante y plan de recuperación, no revertir destruyendo evidencias. No alterar archivos contables de producción para “hacer pasar” una prueba.

El producto completo del alcance base debe incluir frontend, backend, base/migraciones, worker, catálogos, adaptadores verificables, exportaciones, pruebas, scripts reproducibles, documentación y migración ensayada. Todos los módulos del Excel deben funcionar, aunque el usuario final pueda desactivar el vertical. No confundir personalización por configuración con escribir un sistema distinto para cada cliente.

## Anexo A. Especificación técnica detallada

Las reglas de los capítulos anteriores completan y concretan este anexo. Las tablas son un catálogo contractual a materializar en migraciones; cualquier campo indexado debe existir y llevar tipo. Cuando aparece un shorthand como “estados”, deben usarse los tres estados explícitos y enum del recurso. Todas las unicidades/FKs de empresa incluyen tenant según convención. La configuración de cada entidad no puede omitir su política RLS.

### A.1. Alcance técnico y principios no negociables

El núcleo administra empresas; la extensión opcional administra condominios, inmuebles, pisos, secciones, rubros, alícuotas y propietarios históricos; expensas ordinarias y extraordinarias; notificaciones y correo; configuración contable; plan de cuentas; centros de costo; asientos y libros; cierres; caja chica; cuentas por pagar (CxP); anticipos y notas de crédito; liquidación de compras; retenciones emitidas; cuentas por cobrar (CxC); facturación recurrente; recaudaciones y cobranza; retenciones recibidas; bancos, depósitos, cheques y egresos; y salidas tributarias como ATS/RDEP.

La fuente funcional local se toma como catálogo de capacidades: administración de inmuebles, notificaciones/email, configuración financiera, contabilidad, caja chica, CxP, CxC, bancos, tributación y configuración de empresa/certificado digital. Los nombres exactos de pantallas no son contratos de API; los recursos y estados definidos aquí sí lo son.

#### A.1.1 Principios

1. **Inmutabilidad contable:** un asiento contabilizado no se edita ni se elimina. Una corrección se hace mediante reversa, ajuste o documento relacionado, con trazabilidad.
2. **Separación de estados:** cada documento tiene estado de negocio, estado contable y estado tributario independientes. Ningún estado se infiere de otro.
3. **Tenant fuerte:** toda consulta, escritura, índice de unicidad y FK debe quedar acotada por `tenant_id`/`company_id` o por la clave compuesta definida. PostgreSQL RLS es una barrera adicional, no un sustituto de las autorizaciones.
4. **Decimal exacto:** importes monetarios se almacenan como `numeric`, nunca `float`; en JSON se transportan como cadenas decimales.
5. **Concurrencia explícita:** numeración, saldos, finalización, aplicación de anticipos, cheques y cierres requieren bloqueo y/o aislamiento apropiado, idempotencia y detección de conflictos.
6. **Procesamiento asíncrono confiable:** correo, generación de XML, firma, envío tributario, reintentos y archivos de salida se coordinan mediante outbox transaccional y worker.
7. **Auditoría:** toda transición relevante registra actor, timestamp, razón, origen, correlación, valores afectados y resultado.
8. **No asumir normativa vigente:** tasas, tipos de comprobante, catálogos, códigos de retención, plazos, esquemas XML y reglas SRI son datos versionados y configurables por vigencia, no constantes en código.

#### A.1.2 Fuera de alcance de esta especificación

No se define aquí una tasa tributaria concreta, un endpoint SRI real, un certificado real, una credencial, un algoritmo de firma propietario, una tarifa, una regla legal no verificada, una UI final, código ejecutable o un pipeline de despliegue operativo. Sí se definen las interfaces, validaciones y controles que permitirán incorporar esos elementos sin reescribir el dominio.

---

### A.2. Arquitectura lógica

#### A.2.1 Monolito modular

El backend FastAPI debe organizarse como un monolito modular con límites explícitos:

- **Identity/Access:** usuarios, roles, permisos, sesiones, MFA si aplica y contexto activo.
- **Tenant/Company:** tenant, empresa, establecimientos, períodos, configuración y numeradores.
- **Condominium:** condominios, tipos de inmueble, pisos, secciones, rubros, inmuebles, alícuotas, propietarios históricos, expensas y campañas de cobro.
- **Contacts:** terceros, clientes, proveedores, direcciones, emails y datos de facturación.
- **Accounting:** plan de cuentas, tipos de comprobante, centros de costo, asientos, períodos, libros, cierres y plantillas de contabilización.
- **Payables:** documentos soporte, compras, liquidaciones, anticipos de proveedores, NC y retenciones emitidas.
- **Receivables:** comprobantes de venta, facturación recurrente, anticipos de clientes, aplicaciones, recaudaciones, retenciones recibidas y cobranza.
- **Treasury:** cuentas bancarias, depósitos, cheques, egresos y conciliación/movimientos bancarios.
- **PettyCash:** fondos, cajas, reposiciones, documentos pendientes y liquidaciones.
- **Tax:** catálogos tributarios versionados, conciliación de compras, archivos de salida ATS/RDEP, firma y seguimiento de presentación.
- **Documents/Notifications:** plantillas, email, boletines, adjuntos, documentos generados y delivery.
- **Audit/Outbox:** auditoría, idempotencia, eventos, outbox y dead-letter.

Cada módulo expone casos de uso y DTOs; no accede directamente a tablas internas de otro módulo salvo por puertos definidos. Las transacciones que cruzan módulos se coordinan en una capa de aplicación; no se distribuyen transacciones entre servicios.

#### A.2.2 Componentes de ejecución

- **API:** FastAPI, validación de entrada, autorización, contexto tenant/empresa, transacción de solicitud y publicación en outbox.
- **PostgreSQL:** fuente de verdad, RLS, constraints, secuencias/numeradores, materializaciones opcionales y auditoría.
- **Worker:** consume `outbox_event`, procesa jobs con lease, backoff exponencial, deduplicación e idempotencia.
- **Proveedor de correo:** detrás de `EmailProvider`; nunca se llama directamente desde una transacción de dominio.
- **Adaptador tributario:** detrás de `SRIAdapter`; soporta generación, firma y transporte sin codificar aquí APIs específicas.
- **Almacenamiento de objetos:** documentos XML/PDF/CSV, certificados cifrados y artefactos de auditoría; la base guarda hash, metadatos y referencia.
- **Observabilidad:** logs estructurados, métricas, trazas y auditoría de negocio, con redacción de secretos.

#### A.2.3 Transacciones y unidad de trabajo

Cada comando de negocio abre una unidad de trabajo con:

1. autenticación y contexto tenant/empresa;
2. validación de permisos y precondiciones;
3. lectura consistente y locks necesarios;
4. escritura de entidades de negocio;
5. creación de asiento o reserva contable si corresponde;
6. escritura de auditoría;
7. inserción del evento outbox en la misma transacción;
8. commit;
9. procesamiento asíncrono posterior para efectos externos.

Un evento outbox nunca se publica antes del commit. El worker marca `processing` con lease; al expirar el lease, otro worker puede reclamarlo. Un evento exitoso queda `succeeded`; un error transitorio se reintenta; un error permanente pasa a `dead_letter` y requiere acción autorizada.

---

### A.3. Aislamiento multiempresa, condominios y concurrencia

#### A.3.1 Jerarquía

`tenant` representa el espacio lógico del cliente. Un tenant tiene una o más `company`. Cada empresa puede administrar uno o más `condominium`. Los datos transaccionales llevan al menos `tenant_id` y `company_id`; los datos propios del condominio agregan `condominium_id`.

Reglas:

- `company.tenant_id = tenant.id`.
- Un usuario solo puede operar sobre empresas asignadas en `user_company`.
- La empresa activa debe viajar en el contexto de solicitud y quedar registrada en auditoría.
- Un condominio pertenece a una empresa y no puede mezclarse con otra.
- Un documento, asiento, cuenta bancaria o secuencia no puede cruzar tenant/empresa; las entidades de la extensión tampoco. El núcleo no exige inmueble ni propietario.
- Si un tercero se comparte entre empresas, se modela un maestro de persona neutral y perfiles por empresa; nunca se reutiliza por accidente el saldo de otra empresa.

#### A.3.2 RLS y pools

El pool de PostgreSQL debe usar un rol de aplicación sin privilegios de bypass RLS, no propietario de tablas, y con FORCE RLS aplicado donde corresponda. Por transacción, la aplicación establece variables de sesión locales, por ejemplo `app.tenant_id`, `app.company_id`, `app.user_id` y `app.request_id`; se utiliza `SET LOCAL` para impedir contaminación entre solicitudes.

Las políticas RLS se definen por tabla sensible y verifican el contexto. Las escrituras validan tanto `tenant_id` como `company_id`. Las FKs compuestas evitan referencias cruzadas incluso si un cliente omitiera una condición RLS:

```sql
-- Ejemplo conceptual, sintético; no es código de aplicación.
FOREIGN KEY (tenant_id, company_id)
  REFERENCES company (tenant_id, id);

FOREIGN KEY (tenant_id, company_id, condominium_id)
  REFERENCES condominium (tenant_id, company_id, id);
```

Los procesos administrativos de mantenimiento no deben conectarse como propietario de tablas desde la aplicación. Las migraciones usan un rol separado y se auditan.

#### A.3.3 Pools y trabajos

- Pool API con tamaño limitado y timeouts.
- Pool worker separado para evitar que trabajos largos consuman conexiones de API.
- Transacciones cortas; no mantener una conexión abierta durante llamadas a correo, firma, SRI o almacenamiento.
- Timeout de lock, statement y transaction configurados.
- Jobs recurrentes usan una clave de partición por empresa para impedir ejecuciones concurrentes del mismo período.

#### A.3.4 Idempotencia y reintentos

Los comandos mutantes aceptan `Idempotency-Key` y `X-Request-Id`. Se guarda una huella de método, ruta, actor, tenant, empresa y cuerpo canónico. La misma clave con el mismo hash devuelve la respuesta original; la misma clave con otro cuerpo produce `409 IDEMPOTENCY_KEY_REUSED`.

Los eventos llevan `event_id` único. El consumidor registra `consumer_name + event_id`; procesar dos veces el mismo evento no duplica XML canónico, asiento, recaudación ni aplicación. Para correo y otros externos se requiere idempotencia del proveedor o conciliación de resultado incierto; no prometer exactly-once.

---

### A.4. Estados separados e invariantes del dominio

#### A.4.1 Estados comunes

Cada documento relevante puede contener:

- `business_status`: `DRAFT`, `VALIDATED`, `APPROVED`, `ISSUED`, `APPLIED`, `PAID`, `PARTIALLY_PAID`, `VOID_REQUESTED`, `VOIDED`, `CANCELLED`, `REJECTED`.
- `accounting_status`: `NOT_APPLICABLE`, `PENDING`, `POSTING`, `POSTED`, `REVERSED`, `POSTING_ERROR`.
- `tax_status`: `NOT_APPLICABLE`, `PENDING`, `READY`, `SIGNED`, `SUBMITTED`, `AUTHORIZED`, `REJECTED`, `CANCELLED`, `TAX_ERROR`.

No se permite sustituir estos tres campos por un único `status`. Por ejemplo, una factura puede estar `ISSUED`, `POSTED` y `REJECTED` tributariamente; el rechazo tributario no borra la factura ni revierte automáticamente el asiento.

#### A.4.2 Reglas de transición

- `DRAFT -> VALIDATED` exige estructura, terceros, período abierto y líneas válidas.
- `VALIDATED -> APPROVED` exige segregación de funciones cuando la política lo requiera.
- `APPROVED -> ISSUED` reserva numeración y congela campos fiscales relevantes.
- `ISSUED -> POSTED` crea el asiento por plantilla; el posting es atómico con el cambio de estado cuando el efecto contable es interno.
- `POSTED` es terminal respecto de edición y borrado. Se puede `REVERSED` mediante documento de reversa.
- `VOIDED` solo se alcanza por proceso autorizado, con razón y efectos contables/tributarios propios.
- `SUBMITTED` y `AUTHORIZED` son estados del flujo tributario, no una confirmación genérica de pago.
- Las acciones inválidas devuelven `409 INVALID_STATE_TRANSITION`.

#### A.4.3 Invariantes contables

1. Todo asiento contabilizado tiene al menos dos líneas, débito total igual a crédito total y moneda/escala compatibles.
2. El total de líneas debe coincidir con el total del documento según la plantilla, salvo diferencias de redondeo declaradas y dentro de la política configurable.
3. Una cuenta usada en posting debe estar activa, ser imputable y pertenecer al mismo plan/empresa.
4. Todo asiento pertenece a un período abierto y a una empresa.
5. Un asiento contabilizado no tiene `UPDATE` destructivo ni `DELETE`; solo se agregan reversas, ajustes y metadatos no contables permitidos.
6. Un cierre aprobado impide nuevos postings al período, excepto un procedimiento especial de reapertura con permiso dual y auditoría.
7. El saldo derivado de líneas es reproducible desde el libro; los snapshots son aceleradores y se recalculan/verifican.

#### A.4.4 Finalización, trigger diferido y concurrencia

Al finalizar un documento con varias líneas:

- La cabecera se bloquea `FOR UPDATE`; quienes agregan líneas deben bloquear esa misma cabecera para impedir escrituras concurrentes a un agregado publicado.
- El publicador bloquea el período `FOR SHARE`; el cierre toma `FOR UPDATE` y espera a publicadores en curso. Se bloquea también la reserva de numeración cuando aplica.
- Se insertan líneas en estado provisional dentro de la transacción.
- Un constraint trigger `DEFERRABLE INITIALLY DEFERRED` valida al final de la transacción: suma de débitos = suma de créditos, suma de bases/impuestos/descuentos según plantilla, y totalidad de líneas esperadas.
- El trigger debe poder distinguir un asiento en construcción del asiento final y rechazar commit si un asiento marcado para publicación queda desequilibrado. Los borradores incompletos pueden guardarse; nunca se publican sin balance.
- Para saldos concurrentes, se bloquea la fila de cuenta/saldo por empresa-período o se usa aislamiento `SERIALIZABLE` con reintento acotado. Nunca se confía en `SELECT` sin lock seguido de `UPDATE`.
- Si dos procesos intentan finalizar el mismo documento, uno gana por lock/idempotencia; el otro recibe la respuesta ya creada o un conflicto determinista.

#### A.4.5 Invariantes de condominios

- La suma de alícuotas activas del universo definido debe cumplir la política del condominio: normalmente 100%, pero puede existir regla configurable y un estado de excepción documentado.
- La vigencia de una alícuota no puede solaparse para el mismo inmueble, rubro y período.
- La titularidad histórica usa intervalos `[valid_from, valid_to)` sin solapes para el mismo vínculo inmueble/persona/rol; varios copropietarios pueden coexistir con participaciones validadas.
- Un cargo de expensa captura la versión de alícuota y titular vigente al momento de cálculo; no cambia retroactivamente si la historia cambia.
- Las expensas generadas no se recalculan silenciosamente: una corrección produce ajuste o documento de reversa.

---

### A.5. Modelo de datos relacional

#### A.5.1 Convenciones

Todas las tablas incluyen `id uuid`, `tenant_id uuid`, fechas técnicas (`created_at timestamptz`, `updated_at timestamptz`), `created_by uuid`, `updated_by uuid` cuando aplique. Las tablas contables agregan `company_id`, `period_id` y `row_version bigint` o mecanismo equivalente de control optimista. Las claves primarias se expresan como `(tenant_id, id)` o `(tenant_id, company_id, id)` cuando el aislamiento lo exige; si se utiliza UUID global, las FKs compuestas siguen siendo obligatorias para tenant/empresa.

Tipos recomendados: `numeric(20,6)` para importes de cálculo, `numeric(20,2)` para importes monetarios finalizados cuando la política de la empresa lo establezca, `char(3)` para moneda ISO, `date` para fechas de negocio, `timestamptz` para eventos, `jsonb` solo para extensiones y snapshots no canónicos, `citext` para identificadores textuales donde se requiera comparación insensible a mayúsculas.

#### A.5.2 Catálogo de identidad y tenant

**`tenant`**. Columnas esenciales y tipos: `id uuid`, `legal_name varchar(200)`, `status varchar(20)`, `created_at`. FKs / restricciones: `status` en catálogo; nombre requerido. Índices principales: `(status)`.

**`company`**. Columnas esenciales y tipos: `id uuid`, `tenant_id uuid`, `tax_id varchar(32)`, `legal_name`, `currency char(3)`, `status`, `timezone`. FKs / restricciones: FK `(tenant_id,id)`; `UNIQUE(tenant_id,tax_id)`; una moneda base. Índices principales: `(tenant_id,status)`, `(tenant_id,tax_id)`.

**`user_account`**. Columnas esenciales y tipos: `id uuid`, `email citext`, `status`, `password_hash`/federation id. FKs / restricciones: email único global o por política. Índices principales: `(email)`, `(status)`.

**`user_company`**. Columnas esenciales y tipos: `tenant_id`, `company_id`, `user_id`, `active`. FKs / restricciones: FKs compuestas a empresa y usuario. Índices principales: PK `(tenant_id,company_id,user_id)`.

**`role`, `permission`, `role_permission`, `user_role`**. Columnas esenciales y tipos: UUIDs, códigos y vigencia. FKs / restricciones: FKs al contexto. Índices principales: `(company_id,user_id)`, `(role_id,permission_id)`.

**`fiscal_period`**. Columnas esenciales y tipos: `id`, `tenant_id`, `company_id`, `year smallint`, `month smallint`, `status`, `closed_at`. FKs / restricciones: `UNIQUE(company_id,year,month)`; estado `OPEN/CLOSING/CLOSED`. Índices principales: `(company_id,status)`, `(company_id,year,month)`.

**`establishment`**. Columnas esenciales y tipos: `id`, `company_id`, `code`, `name`, `address jsonb`, `status`. FKs / restricciones: `UNIQUE(company_id,code)`. Índices principales: `(company_id,status)`.

**`sequence_definition`**. Columnas esenciales y tipos: `id`, `company_id`, `document_type`, `establishment_id`, `terminal`, `environment varchar(12)`, `prefix`, `next_number bigint`, `active`. FKs / restricciones: unique por tenant/empresa/tipo/establecimiento/terminal/ambiente. Índices principales: `(company_id,document_type,active)`.


#### A.5.3 Condominios e inmuebles

**`condominium`**. Columnas esenciales y tipos: `id`, `company_id`, `code`, `name`, `address`, `status`, `allocation_policy`. FKs / restricciones: `UNIQUE(company_id,code)`. Índices principales: `(company_id,status)`.

**`property_type`**. Columnas esenciales y tipos: `id`, `condominium_id`, `code`, `name`, `usage`. FKs / restricciones: unique por condominio. Índices principales: `(condominium_id,code)`.

**`floor`**. Columnas esenciales y tipos: `id`, `condominium_id`, `code`, `level_no int`, `name`. FKs / restricciones: unique nivel/código. Índices principales: `(condominium_id,level_no)`.

**`section`**. Columnas esenciales y tipos: `id`, `condominium_id`, `code`, `name`. FKs / restricciones: unique código. Índices principales: `(condominium_id,code)`.

**`expense_item`**. Columnas esenciales y tipos: `id`, `condominium_id`, `code`, `name`, `kind`, `account_id`, `cost_center_id`, `active`. FKs / restricciones: cuenta y centro de costo de misma empresa; unique código. Índices principales: `(condominium_id,active)`.

**`property_unit`**. Columnas esenciales y tipos: `id`, `condominium_id`, `property_type_id`, `floor_id`, `section_id`, `code`, `area numeric`, `status`. FKs / restricciones: FKs del mismo condominio; `UNIQUE(condominium_id,code)`; área positiva. Índices principales: `(condominium_id,status)`, `(floor_id,section_id)`.

**`property_allocation`**. Columnas esenciales y tipos: `id`, `property_unit_id`, `expense_item_id`, `valid_range daterange`, `percentage numeric(12,9)`, `version int`. FKs / restricciones: `EXCLUDE` para evitar solape por unidad/rubro; porcentaje >=0. Índices principales: `(property_unit_id,expense_item_id)`, GIST rango.

**`person`**. Columnas esenciales y tipos: `id`, `tenant_id`, `identification_type`, `identification_value`, `legal_name`, `email`. FKs / restricciones: identificación normalizada; única por tenant/tipo/valor. Índices principales: `(tenant_id,identification_type,identification_value)`.

**`property_owner_history`**. Columnas esenciales y tipos: `id`, `property_unit_id`, `person_id`, `role`, `valid_range`, `participation numeric`. FKs / restricciones: `EXCLUDE` por unidad/persona/rol/vigencia; copropietarios concurrentes permitidos; participación positiva. Índices principales: `(property_unit_id)`, GIST rango.

**`expense_cycle`**. Columnas esenciales y tipos: `id`, `condominium_id`, `period_id`, `kind`, `status`, `due_date`, `allocation_version`. FKs / restricciones: unique condominio/período/tipo/código de ciclo; ordinario único por periodo, extraordinario permite resoluciones distintas. Índices principales: `(condominium_id,period_id,status)`.

**`expense_charge`**. Columnas esenciales y tipos: `id`, `expense_cycle_id`, `property_unit_id`, `owner_id`, `item_id`, `base`, `adjustment`, `total`, `document_id`. FKs / restricciones: importes >=0; snapshot de alícuota/titular; unique por ciclo/unidad/rubro. Índices principales: `(expense_cycle_id,property_unit_id)`, `(owner_id,status)`.


La carga masiva de inmuebles debe entrar a una tabla `property_import_batch` y `property_import_row` con archivo, hash, número de fila, payload normalizado, estado y error. Nunca escribe directamente sobre registros existentes sin modo explícito de actualización y reporte de conflictos.

#### A.5.4 Configuración contable

**`chart_of_accounts`**. Columnas esenciales y tipos: `id`, `company_id`, `code`, `name`, `account_type`, `parent_id`, `is_postable`, `active`. FKs / restricciones: `UNIQUE(company_id,code)`; padre misma empresa; no circularidad. Índices: `(company_id,code)`, `(company_id,parent_id)`.

**`cost_center_type`**. Columnas esenciales y tipos: `id`, `company_id`, `code`, `name`, `active`. FKs / restricciones: código único empresa. Índices: `(company_id,active)`.

**`cost_center`**. Columnas esenciales y tipos: `id`, `company_id`, `type_id`, `code`, `name`, `active`. FKs / restricciones: tipo misma empresa; unique código. Índices: `(company_id,code)`, `(company_id,active)`.

**`journal_type`**. Columnas esenciales y tipos: `id`, `company_id`, `code`, `name`, `numbering_policy`. FKs / restricciones: unique código; vigencia. Índices: `(company_id,active)`.

**`posting_template`**. Columnas esenciales y tipos: `id`, `company_id`, `business_event`, `version`, `effective_range`, `definition jsonb`, `active`. FKs / restricciones: no solape de versiones activas; cuentas referenciadas de misma empresa. Índices: `(company_id,business_event,active)`, GIST rango.

**`journal_entry`**. Columnas esenciales y tipos: `id`, `company_id`, `period_id`, `journal_type_id`, `number`, `entry_date`, `description`, `status`, `source_type`, `source_id`, `reversal_of_id`. FKs / restricciones: number único por tipo/período; source idempotente; período mismo. Índices: `(company_id,period_id,entry_date)`, `(company_id,source_type,source_id)`, `(company_id,status)`.

**`journal_line`**. Columnas esenciales y tipos: `id`, `journal_entry_id`, `line_no`, `account_id`, `cost_center_id`, `debit`, `credit`, `currency`, `description`, `party_id`, `tax_detail jsonb`. FKs / restricciones: exactamente un débito/crédito positivo; cuenta imputable; `UNIQUE(entry_id,line_no)`. Índices: `(entry_id)`, `(account_id,entry_date)` vía consulta/tabla de saldo.

**`period_close`**. Columnas esenciales y tipos: `id`, `company_id`, `period_id`, `phase`, `status`, `approved_by`, `approved_at`. FKs / restricciones: unique período/fase; segregación. Índices: `(company_id,period_id,status)`.

**`account_balance_snapshot`**. Columnas esenciales y tipos: `id`, `company_id`, `period_id`, `account_id`, `debit_total`, `credit_total`, `closing_balance`, `checksum`. FKs / restricciones: unique empresa/período/cuenta. Índices: `(company_id,period_id,account_id)`.


`journal_entry` y `journal_line` deben estar protegidas contra `DELETE`. Un trigger de base rechaza cambios a líneas o cabecera cuando `status='POSTED'`; una excepción solo permite completar campos técnicos no financieros previamente definidos.

#### A.5.5 Terceros, CxP y tributación de compras

**`party_profile`**. Columnas esenciales y tipos: `id`, `company_id`, `person_id`, `party_kind`, `account_receivable_id`, `account_payable_id`, `status`. FKs / restricciones: persona y cuentas misma empresa; unique persona/kind. Índices: `(company_id,party_kind,status)`, `(company_id,person_id)`.

**`support_document`**. Columnas esenciales y tipos: `id`, `company_id`, `supplier_id`, `document_type`, `series`, `number`, `issue_date`, `due_date`, `currency`, `subtotal`, `tax_total`, `grand_total`, `business_status`, `accounting_status`, `tax_status`. FKs / restricciones: unique empresa/proveedor/tipo/serie/número; clave de acceso única por empresa cuando exista; total = suma validada. Índices: `(company_id,supplier_id,due_date,status)`, `(company_id,issue_date)`.

**`support_line`**. Columnas esenciales y tipos: `id`, `document_id`, `line_no`, `description`, `quantity`, `unit_price`, `discount`, `net`, `tax_code`, `tax_amount`, `account_id`, `cost_center_id`. FKs / restricciones: línea única; importes no negativos; cuenta/CC same company. Índices: `(document_id)`, `(account_id)`.

**`supplier_advance`**. Columnas esenciales y tipos: `id`, `company_id`, `supplier_id`, `amount`, `unapplied_amount`, `business_status`, `accounting_status`. FKs / restricciones: saldo no negativo y <= monto; source único. Índices: `(company_id,supplier_id,status)`.

**`advance_application`**. Columnas esenciales y tipos: `id`, `company_id`, `advance_id`, `document_id`, `amount`, `applied_at`. FKs / restricciones: suma aplicada <= saldo bajo lock. Índices: `(advance_id)`, `(document_id)`.

**`credit_note`**. Columnas esenciales y tipos: `id`, `company_id`, `supplier_id`, `related_document_id`, `reason`, `amount`, estados. FKs / restricciones: validar importe original y ajustes acumulados; si está pagada, generar saldo a favor en lugar de prohibirla por saldo cero; referencia misma empresa. Índices: `(company_id,related_document_id)`.

**`purchase_liquidation`**. Columnas esenciales y tipos: `id`, `company_id`, `party_id`, `document_date`, `lines`, estados y totales. FKs / restricciones: tercero habilitado según política; unique secuencia. Índices: `(company_id,party_id,document_date)`.

**`withholding`**. Columnas esenciales y tipos: `id`, `company_id`, `direction`, `source_document_id`, `party_id`, `base_total`, `details`, `number`, estados. FKs / restricciones: direction `ISSUED/RECEIVED`; no duplicar source; catálogos versionados. Índices: `(company_id,party_id,issue_date)`, `(source_document_id)`.

**`tax_catalog_version`**. Columnas esenciales y tipos: `id`, `catalog_type`, `code`, `description`, `valid_range`, `metadata jsonb`, `active`. FKs / restricciones: no solape de código/vigencia. Índices: `(catalog_type,code)`, GIST rango.


#### A.5.6 CxC, facturación y cobranza

**`sales_document`**. Columnas esenciales y tipos: `id`, `company_id`, `customer_id`, `establishment_id`, `document_type`, `series`, `number`, `issue_date`, `due_date`, `subtotal`, `tax_total`, `grand_total`, tres estados. FKs / restricciones: unique empresa/tipo/serie/número; totales consistentes. Índices: `(company_id,customer_id,status,due_date)`, `(company_id,issue_date)`.

**`sales_line`**. Columnas esenciales y tipos: `id`, `document_id`, `line_no`, `description`, `quantity`, `unit_price`, `discount`, `net`, `tax_code`, `tax_amount`, `account_id`, `cost_center_id`. FKs / restricciones: línea única; cantidades e importes válidos. Índices: `(document_id)`.

**`recurring_billing_plan`**. Columnas esenciales y tipos: `id`, `company_id`, `customer_id`, `frequency`, `next_run_date`, `template`, `status`. FKs / restricciones: frecuencia permitida; no duplicar ciclo generado. Índices: `(company_id,next_run_date,status)`.

**`customer_advance`**. Columnas esenciales y tipos: `id`, `company_id`, `customer_id`, `amount`, `unapplied_amount`, estados. FKs / restricciones: saldo con lock. Índices: `(company_id,customer_id,status)`.

**`collection`**. Columnas esenciales y tipos: `id`, `company_id`, `customer_id`, `receipt_number`, `collection_date`, `amount`, `method`, estados. FKs / restricciones: número único; importe positivo. Índices: `(company_id,customer_id,collection_date)`, `(company_id,receipt_number)`.

**`collection_application`**. Columnas esenciales y tipos: `id`, `collection_id`, `receivable_item_id`, `amount`. FKs / restricciones: suma <= recaudación y saldo ítem; vínculo fiscal no crea segunda deuda. Índices: `(receivable_item_id)`, `(collection_id)`.

**`collection_campaign`**. Columnas esenciales y tipos: `id`, `condominium_id/company_id`, `name`, `criteria jsonb`, `status`. FKs / restricciones: criterios versionados; audiencia congelada al envío. Índices: `(company_id,status)`.


#### A.5.7 Bancos, cheques y caja chica

**`bank_account`**. Columnas esenciales y tipos: `id`, `company_id`, `bank_name`, `account_number_encrypted`, `last4`, `currency`, `gl_account_id`, `status`. FKs / restricciones: número protegido; cuenta GL misma empresa; unique fingerprint. Índices: `(company_id,status)`.

**`bank_deposit`**. Columnas esenciales y tipos: `id`, `bank_account_id`, `deposit_date`, `amount`, `reference`, estados. FKs / restricciones: importe positivo; no duplicar referencia/idempotencia. Índices: `(bank_account_id,deposit_date)`, `(company_id,status)`.

**`check`**. Columnas esenciales y tipos: `id`, `bank_account_id`, `check_number`, `payee_id`, `issue_date`, `due_date`, `amount`, `status`, `replaced_by_id`. FKs / restricciones: único número por cuenta; máquina de estados. Índices: `(bank_account_id,check_number)`, `(company_id,status,due_date)`.

**`expense_payment`**. Columnas esenciales y tipos: `id`, `company_id`, `payee_id`, `bank_account_id`, `payment_date`, `amount`, `method`, estados. FKs / restricciones: cuenta y tercero same company; puede originar cheque. Índices: `(company_id,payee_id,payment_date)`, `(company_id,status)`.

**`petty_cash_fund`**. Columnas esenciales y tipos: `id`, `company_id`, `custodian_id`, `authorized_limit`, `current_balance`, `status`. FKs / restricciones: límites positivos; un custodio según política. Índices: `(company_id,status)`.

**`petty_cash_document`**. Columnas esenciales y tipos: `id`, `fund_id`, `supplier_id`, `document_date`, `amount`, `support_ref`, `status`, `expense_account_id`. FKs / restricciones: saldo no negativo; soporte requerido según política. Índices: `(fund_id,document_date,status)`.

**`petty_cash_replenishment`**. Columnas esenciales y tipos: `id`, `fund_id`, `period_id`, `amount`, `journal_entry_id`, `status`. FKs / restricciones: no duplicar período/fondo; posting relacionado. Índices: `(fund_id,period_id)`.


#### A.5.8 Documentos, outbox, auditoría y archivos

**`document_file`**. Columnas esenciales y tipos: `id`, `company_id`, `owner_type`, `owner_id`, `storage_key`, `sha256`, `mime_type`, `size bigint`, `classification`, `encrypted`. FKs / restricciones: hash y referencia; no guardar secretos en claro. Índices: `(owner_type,owner_id)`, `(sha256)`.

**`email_message`**. Columnas esenciales y tipos: `id`, `company_id`, `template_id`, `recipient_hash`, `payload jsonb`, `status`, `provider_ref`. FKs / restricciones: no incluir credenciales; destinatarios validados. Índices: `(company_id,status,scheduled_at)`.

**`outbox_event`**. Columnas esenciales y tipos: `id uuid`, `tenant_id`, `company_id`, `event_type`, `aggregate_type`, `aggregate_id`, `payload jsonb`, `status`, `attempts`, `available_at`, `lease_until`, `last_error`, `occurred_at`. FKs / restricciones: unique `event_id`; payload versionado. Índices: `(status,available_at)`, `(company_id,aggregate_type,aggregate_id)`, partial index pendientes.

**`processed_event`**. Columnas esenciales y tipos: `consumer_name`, `event_id`, `processed_at`, `result_hash`. FKs / restricciones: PK compuesta. Índices: `(consumer_name,processed_at)`.

**`idempotency_record`**. Columnas esenciales y tipos: `tenant_id`, `company_id`, `actor_id`, `key`, `request_hash`, `response_status`, `response_body`, `expires_at`. FKs / restricciones: unique contexto + key. Índices: `(expires_at)`, `(company_id,key)`.

**`audit_event`**. Columnas esenciales y tipos: `id`, `tenant_id`, `company_id`, `actor_id`, `action`, `resource_type`, `resource_id`, `before jsonb`, `after jsonb`, `reason`, `request_id`, `occurred_at`. FKs / restricciones: append-only; redactar secretos. Índices: `(company_id,resource_type,resource_id)`, `(company_id,occurred_at)`, `(request_id)`.


---

### A.6. Contabilización y plantillas de posting

#### A.6.1 Motor de posting

El motor recibe un evento de negocio normalizado y selecciona una plantilla por `business_event`, empresa, vigencia, moneda y configuración. La plantilla no contiene saldos calculados manualmente; referencia reglas que producen líneas deterministas a partir del documento.

Cada plantilla define:

- evento y versión;
- cuentas por rol (`AR`, `AP`, `BANK`, `REVENUE`, `EXPENSE`, `TAX_PAYABLE`, `TAX_RECEIVABLE`, `ADVANCE`, `WITHHOLDING`, `ROUNDING`);
- dimensiones obligatorias: centro de costo, condominio, rubro, tercero, inmueble;
- política de redondeo;
- validación de balance;
- evento de reversa;
- si requiere autorización o aprobación dual.

Las cuentas y códigos son ejemplos configurables. No deben interpretarse como plan contable oficial universal.

#### A.6.2 Plantillas sintéticas

**A. Factura de venta general / cargo vertical según plantilla aprobada**

Evento: `SALES_INVOICE_ISSUED`.

- Débito `AR_CLIENTE` = total facturado.
- Crédito `INGRESO_SERVICIO` = subtotal general; para el vertical resolver ingreso/fondo/pasivo conforme política aprobada, no asumir que toda cuota es ingreso comercial.
- Crédito `IMPUESTO_POR_PAGAR` = impuesto calculado, solo si la configuración aplicable lo exige.
- Si hay redondeo, débito/crédito `DIFERENCIA_REDONDEO` dentro del límite permitido.

Si hay extensión, sus enlaces conservan condominio, ciclo, inmueble, propietario histórico y rubro. El asiento general conserva cuentas/centros sin depender de tablas verticales.

**B. Compra o soporte de proveedor**

Evento: `PURCHASE_RECOGNIZED`.

- Débito `GASTO_RUBRO` o `ACTIVO` = base neta, por línea y centro de costo.
- Débito `IMPUESTO_CREDITO_TRIBUTARIO` si corresponde a la clasificación configurada.
- Crédito `AP_PROVEEDOR` = total.

**C. Retención emitida sobre compra**

Evento: `WITHHOLDING_ISSUED`.

- Débito `AP_PROVEEDOR` = total de la retención aplicada.
- Crédito `RETENCIONES_POR_PAGAR` = total retenido.

Los detalles de base y código se toman de catálogos versionados. La plantilla no fija porcentajes.

**D. Anticipo a proveedor**

Evento: `SUPPLIER_ADVANCE_PAID`.

- Débito `ANTICIPOS_PROVEEDORES`.
- Crédito `BANCO` o `CAJA`.

Cruce con factura: débito `AP_PROVEEDOR`, crédito `ANTICIPOS_PROVEEDORES`, por el monto aplicado bajo lock.

**E. Nota de crédito de proveedor**

Evento: `SUPPLIER_CREDIT_NOTE_POSTED`.

- Débito `AP_PROVEEDOR` o disminución de obligación según relación.
- Crédito `GASTO_RUBRO`/`ACTIVO` y, si corresponde, reversa de impuesto.

**F. Recaudación de cliente**

Evento: `CUSTOMER_COLLECTION_RECEIVED`.

- Débito `BANCO`, `CAJA`, `CHEQUE_EN_CARTERA` o medio equivalente.
- Crédito `AR_CLIENTE` por la aplicación.
- La parte no aplicada se registra en `ANTICIPOS_CLIENTES` y se aplica posteriormente.

**G. Retención recibida de cliente**

Evento: `CUSTOMER_WITHHOLDING_RECEIVED`.

- Débito `RETENCIONES_A_FAVOR`.
- Crédito `AR_CLIENTE` por el valor aceptado y aplicado.

**H. Cheque/egreso a proveedor**

Evento: `SUPPLIER_PAYMENT_ISSUED`.

- Débito `AP_PROVEEDOR`.
- Crédito `BANCO`.
- Si la política utiliza cuenta puente de cheques emitidos, se genera primero `CHEQUES_EN_TRANSITO` y luego el evento de cobro/conciliación.

**I. Caja chica**

Evento: `PETTY_CASH_EXPENSE_RECORDED`.

- Débito `GASTO_RUBRO`/`IMPUESTO` por documento.
- Crédito `CAJA_CHICA`.

Reposición:

- Débito `CAJA_CHICA`.
- Crédito `BANCO`.

#### A.6.3 Cierres y reversas

El cierre mensual valida documentos en estados incompatibles, saldos desequilibrados, outbox fallido crítico, retenciones pendientes y conciliaciones configuradas como obligatorias. El cierre genera asiento de cierre solo según la política contable de la empresa y no borra saldos históricos.

Una reversa copia la referencia del original, invierte débitos/créditos, exige razón y queda ligada mediante `reversal_of_id`. La reversa no cambia los valores del original. Un documento anulado después de posting debe tener efectos contables explícitos.

---

### A.7. Interfaz SRI y flujos asíncronos

#### A.7.1 Puerto abstracto

Definir un puerto `SRIAdapter` con operaciones conceptuales:

- `prepare_tax_document(document_snapshot, catalog_version) -> PreparedTaxDocument`;
- `sign(prepared_document, certificate_ref) -> SignedTaxDocument`;
- `submit(signed_document, idempotency_token) -> SubmissionReceipt`;
- `query_status(external_reference) -> TaxStatusResult`;
- `cancel_or_void(document_snapshot, reason) -> SubmissionReceipt` cuando investigación tributaria determine disponibilidad;
- `generate_ats(dataset_snapshot) -> TaxFileArtifact`;
- `generate_rdep(dataset_snapshot) -> TaxFileArtifact` cuando aplique.

El contrato devuelve estados normalizados (`PREPARED`, `SIGNED`, `SUBMITTED`, `AUTHORIZED`, `REJECTED`, `RETRYABLE_ERROR`, `PERMANENT_ERROR`) y conserva `provider_payload` cifrado o minimizado según necesidad de auditoría. No se inventan nombres de servicios, URLs ni códigos del SRI.

#### A.7.2 Certificados y firma

- El certificado digital se registra como referencia a un secreto cifrado; nunca se guarda la clave privada en texto plano.
- El proceso de firma usa un worker aislado lógicamente y no expone material secreto en logs, respuestas ni trazas.
- Se registra huella del certificado, vigencia, emisor, usuario que lo configuró y prueba de disponibilidad, sin guardar el secreto en auditoría.
- Antes de firmar se congela el snapshot fiscal del documento y su hash.
- El hash del XML firmado y la referencia al artefacto se guardan junto al estado tributario.

#### A.7.3 Flujo de documento tributario

1. Documento de negocio validado y contabilizado, si corresponde.
2. Se crea evento `TAX_DOCUMENT_PREPARE_REQUESTED`.
3. Worker toma snapshot inmutable, resuelve catálogos por fecha y genera artefacto.
4. Worker firma usando referencia de certificado.
5. Worker envía mediante el adaptador, con token idempotente.
6. Respuesta se normaliza y registra; autorización/rechazo no modifica silenciosamente el documento financiero.
7. Reintentos transitorios usan backoff; errores permanentes generan tarea de revisión.
8. La consulta de estado es segura de repetir.

#### A.7.4 ATS/RDEP

Los generadores reciben un conjunto de datos cerrado por empresa, período y versión de esquema. Antes de entregar un archivo se validan completitud, sumatorias, duplicados, terceros, fechas, documentos anulados y coherencia con libros. Se almacena el archivo, hash, versión del generador, snapshot de entrada y resultado de validación.

---

### A.8. API HTTP y contrato OpenAPI

#### A.8.1 Convenciones

- Base conceptual: `/api/v1`.
- `Authorization: Bearer <token>`; `X-Tenant-Id`, `X-Company-Id`, `X-Request-Id`, `Idempotency-Key`.
- Fechas ISO-8601; timestamps UTC; zona de presentación de empresa.
- UUID en minúscula; enumeraciones en mayúscula.
- Importes y tasas en JSON como **strings**: `"1234.50"`; nunca números binarios.
- Paginación por cursor para listados grandes: `limit`, `cursor`, `next_cursor`.
- Ordenamiento estable y filtros por empresa/condominio obligatorios cuando aplique.
- `ETag`/`If-Match` o `version` para edición de borradores.
- POST mutante idempotente; DELETE no se ofrece para documentos contabilizados.

#### A.8.2 Envelope de éxito

```json
{
  "ok": true,
  "data": {
    "id": "8aef2a0f-04f1-4c82-8c84-6c8db3fc9301",
    "business_status": "ISSUED",
    "accounting_status": "POSTED",
    "tax_status": "PENDING",
    "total": "125.50",
    "currency": "USD"
  },
  "meta": {
    "request_id": "req_20261025_000001",
    "correlation_id": "corr_8b8f",
    "warnings": []
  }
}
```

#### A.8.3 Envelope de error

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "El documento no puede anularse desde el estado actual.",
    "details": [
      {"field": "business_status", "reason": "EXPECTED_ISSUED_OR_POSTED", "value": "DRAFT"}
    ],
    "retryable": false,
    "conflict_resource": null
  },
  "meta": {
    "request_id": "req_20261025_000002",
    "correlation_id": "corr_8b90"
  }
}
```

Códigos HTTP: `400` formato, `401` autenticación, `403` permiso/contexto, `404` inexistencia visible en el tenant, `409` conflicto de estado/idempotencia/concurrencia, `422` regla de dominio, `429` límite, `500` inesperado, `503` dependencia no disponible. No filtrar si un recurso existe en otro tenant.

#### A.8.4 Familias de API

**Tenant/empresa y configuración**

- `GET/POST /companies`, `GET/PATCH /companies/{id}`.
- `GET/POST /companies/{id}/establishments`.
- `GET/POST /companies/{id}/fiscal-periods`, `POST /fiscal-periods/{id}/close`.
- `GET/POST /companies/{id}/sequences`.
- `GET/POST /companies/{id}/chart-of-accounts`, `POST /chart-of-accounts/import`.
- `GET/POST /companies/{id}/cost-center-types`, `/cost-centers`.

**Condominios**

- `GET/POST /condominiums`.
- `GET/POST /condominiums/{id}/property-types`, `/floors`, `/sections`, `/expense-items`.
- `GET/POST /condominiums/{id}/properties`.
- `POST /condominiums/{id}/properties/import-batches` y `GET .../rows`.
- `GET/POST /properties/{id}/allocation-versions`.
- `GET/POST /properties/{id}/owner-history`.
- `POST /condominiums/{id}/expense-cycles/preview`, `POST .../finalize`.
- `GET /condominiums/{id}/reports/owner-history`, `GET .../reports/expenses`.

**Terceros y CxP**

- `GET/POST /parties`, `POST /parties/import-batches`.
- `GET/POST /payables/support-documents`.
- `POST /payables/support-documents/{id}/validate`, `/approve`, `/post`, `/void`.
- `GET/POST /payables/advances`, `POST /advances/{id}/apply`.
- `GET/POST /payables/credit-notes`.
- `GET/POST /payables/purchase-liquidations`.
- `POST /payables/withholdings/{id}/issue`, `/void`.
- Reportes de documentos, retenciones, anticipos, saldos y pagos con filtros por período.

**CxC y cobranza**

- `GET/POST /receivables/sales-documents`.
- `POST /sales-documents/{id}/validate`, `/issue`, `/post`, `/void`.
- `GET/POST /receivables/recurring-plans`, `POST /recurring-plans/run`.
- `GET/POST /receivables/collections`, `POST /collections/{id}/apply`.
- `GET/POST /receivables/customer-advances`, `POST /customer-advances/{id}/apply`.
- `GET/POST /receivables/withholdings`.
- `GET/POST /collections/campaigns`, `POST /campaigns/{id}/execute`.
- Reportes de documentos emitidos, antigüedad, cartera, recaudaciones y anticipos.

**Bancos/caja**

- `GET/POST /bank-accounts`.
- `GET/POST /bank-deposits`, `POST /bank-deposits/{id}/void`.
- `GET/POST /checks`, `POST /checks/{id}/replace`, `POST /checks/{id}/reprint`.
- `GET/POST /expense-payments`, `POST /expense-payments/{id}/void`.
- `GET/POST /petty-cash/funds`, `/documents`, `/replenishments`.
- Reportes de cheques emitidos, saldos y movimientos bancarios.

**Contabilidad y tributación**

- `GET /accounting/journal-entries`, `GET /accounting/ledgers/general`, `/trial-balance`, `/income-statement`, `/cost-center-expenses`.
- `POST /accounting/journal-entries` solo para asientos manuales autorizados y en período abierto.
- `POST /accounting/journal-entries/{id}/reverse`.
- `POST /tax/documents/{id}/prepare`, `/sign`, `/submit`, `/status`.
- `POST /tax/ats/generate`, `POST /tax/rdep/generate`.
- `GET /tax/reconciliations/purchases` y reportes generales.

**Documentos/email**

- `GET/POST /notification-templates`, `/email-preferences`, `/bulletins`.
- `POST /email-messages/preview`, `POST /email-messages/send`.
- El envío solo encola; el endpoint no espera al proveedor externo.

#### A.8.5 Contratos críticos con ejemplos sintéticos

**Crear una factura en borrador**

```http
POST /api/v1/receivables/sales-documents
Idempotency-Key: demo-factura-001
X-Company-Id: 75c2a4d6-3a82-4e10-9af3-6bb90f5d6cb3
Content-Type: application/json
```

```json
{
  "customer_id": "d0c4d4a7-2c0c-4d7c-9ea0-e15b16f8b4b2",
  "document_type": "SALES_INVOICE",
  "issue_date": "2026-10-25",
  "due_date": "2026-11-10",
  "currency": "USD",
  "lines": [
    {
      "description": "Servicio profesional sintético — octubre",
      "quantity": "1.000000",
      "unit_price": "100.00",
      "discount": "0.00",
      "tax_code": "CATALOG_CODE_TO_BE_CONFIGURED",
      "account_id": "7a4f7f6c-b58c-4f00-838b-04f4f340ca48",
      "cost_center_id": "9fb13a9d-b5e2-4b38-b7b5-8f5c60a7fb01"
    }
  ]
}
```

**Finalizar una expensa**

```http
POST /api/v1/condominiums/condo-demo/expense-cycles/cycle-demo/finalize
Idempotency-Key: demo-expense-finalize-001
```

```json
{
  "expected_allocation_version": 4,
  "approved_preview_hash": "hash-del-borrador-aprobado",
  "approval_id": "uuid-aprobacion",
  "tax_processing": "ASYNC_IF_APPLICABLE"
}
```

La respuesta debe indicar cantidad de cargos, documentos creados, asientos publicados atómicamente, trabajos externos encolados y advertencias; si falla una validación total, no debe existir un ciclo parcialmente finalizado.

**Aplicar anticipo**

```json
{
  "advance_id": "f2df0d95-0460-4387-8207-2cf105e7181b",
  "target_document_id": "31d0bd6b-6512-4fae-a91d-2ed2d44bb6f6",
  "amount": "25.00",
  "currency": "USD",
  "expected_row_versions": {
    "advance": 3,
    "document": 5
  }
}
```

Si el saldo disponible cambió, responder `409 BALANCE_CHANGED` sin reducir saldo parcialmente.

**Reversa de asiento**

```json
{
  "reason": "Corrección sintética de clasificación; reemplazo por asiento AJ-2026-0042",
  "effective_date": "2026-10-25",
  "replacement_entry_id": null
}
```

---

### A.9. Secuencias operativas críticas

#### A.9.1 Facturación recurrente

1. Worker obtiene planes cuyo `next_run_date <= now`, agrupados por empresa y con lock/lease.
2. Genera una clave natural `company_id + plan_id + billing_period`; guardar versión de plantilla como snapshot, no como factor que habilita duplicados.
3. Crea borradores idempotentes; errores de una cuenta no duplican las demás.
4. Valida terceros, período, secuencia y totales.
5. Emite y contabiliza según permisos/configuración.
6. Encola tributación y correo.
7. Avanza el plan solo cuando la unidad definida tuvo resultado aceptable; deja excepción para revisión.

#### A.9.2 Compras, retención y pago

1. Registrar soporte en `DRAFT`.
2. Validar líneas, tercero, período, catálogos versionados y totales.
3. Aprobar según segregación.
4. Contabilizar compra.
5. Emitir retención como documento independiente relacionado; nunca editar el asiento original para simularla.
6. Crear egreso/cheque y contabilizar el pago.
7. Conciliar banco cuando exista movimiento.
8. Generar archivos tributarios con snapshot.

#### A.9.3 Recaudación y conciliación

1. Registrar medio de cobro y monto.
2. Bloquear recaudación, documento y/o anticipo.
3. Aplicar a saldos en orden explícito (selección del usuario o regla configurable).
4. Crear asiento por aplicación; remanente va a anticipo.
5. Emitir recibo y encolar email.
6. Si el medio es cheque, registrar estado `IN_PORTFOLIO`; el depósito y cobro son eventos posteriores.

#### A.9.4 Cheques

Estados recibidos: `IN_PORTFOLIO`, `POSTDATED`, `DEPOSITED`, `CLEARED`, `BOUNCED`, `VOIDED`. Estados emitidos: `DRAFT`, `ISSUED`, `DELIVERED`, `CLEARED`, `VOIDED`, `REPLACED`. Las transiciones se validan según dirección, no en una sola máquina indiferenciada. Cambios de número, reimpresión o reemplazo conservan historial; nunca se sobreescribe el documento que fue entregado. Un cheque conciliado no se anula sin reversa y motivo autorizado.

#### A.9.5 Cierre

1. Verificar período, documentos pendientes, desequilibrios, estados tributarios requeridos y jobs críticos.
2. Bloquear período con lock de empresa/período.
3. Ejecutar controles y snapshot de saldos.
4. Registrar acta de cierre con usuario aprobador y hash de reporte.
5. Marcar `CLOSED`; rechazar nuevos postings.
6. Una reapertura requiere permiso específico, segundo aprobador, razón, ventana limitada y auditoría.

---

### A.10. Permisos y segregación de funciones

La autorización combina RBAC, alcance por tenant/empresa/condominio y reglas de separación. Permisos mínimos de ejemplo:

- `company.read`, `company.configure`, `certificate.manage`;
- `property.manage`, `allocation.approve`, `owner_history.manage`, `expense.generate`, `expense.finalize`;
- `accounting.draft`, `accounting.post`, `accounting.reverse`, `period.close`, `period.reopen`;
- `payable.create`, `payable.approve`, `payable.withholding.issue`, `payment.issue`;
- `receivable.create`, `collection.record`, `collection.apply`, `customer_withholding.record`;
- `bank.deposit`, `check.issue`, `check.replace`, `bank.reconcile`;
- `tax.prepare`, `tax.sign`, `tax.submit`, `tax.review`;
- `report.read`, `audit.read`, `bulk_import.execute`.

Reglas de segregación recomendadas:

- El creador de una compra no puede aprobarla en la misma operación cuando el umbral/política exige doble control.
- Quien configura el certificado no debe ser el único aprobador de envío tributario.
- Quien emite un cheque no puede ser el único conciliador bancario.
- Quien registra una retención puede prepararla, pero la anulación exige permiso superior y razón.
- Cerrar o reabrir un período requiere rol específico y, de ser necesario, segundo aprobador.
- La configuración de cuentas y plantillas afecta posting futuro; cambios de vigencia quedan auditados.

Toda autorización se evalúa antes de adquirir locks de negocio. Los reportes exportables respetan el mismo alcance y llevan actor, filtros, timestamp y hash del archivo.

---

### A.11. Estructura de carpetas técnica

La estructura orientativa del monolito debe mantener separadas interfaces, aplicación y dominio:

```text
/backend
  /app
    /api
      /v1
        /companies
        /condominiums
        /accounting
        /payables
        /receivables
        /treasury
        /petty_cash
        /tax
        /notifications
      dependencies.py
      errors.py
      envelope.py
    /modules
      /identity
      /tenant
      /company
      /condominium
      /contacts
      /accounting
      /payables
      /receivables
      /treasury
      /petty_cash
      /tax
      /documents
      /audit
      /outbox
    /domain
      entities.py
      value_objects.py
      events.py
      invariants.py
      state_machines.py
    /application
      commands.py
      queries.py
      unit_of_work.py
      idempotency.py
    /infrastructure
      /db
        models.py
        repositories.py
        rls.py
        migrations/
      /outbox
      /providers
        email_port.py
        sri_port.py
        storage_port.py
      /security
      /observability
    /worker
      dispatcher.py
      handlers/
      leases.py
      retry_policy.py
  /tests
    /unit
    /integration
    /contract
    /security
    /property_based
    /acceptance
/frontend
  /src
    /app
    /modules
    /components
    /contracts-generated
    /auth
    /routing
    /i18n
    /telemetry
/docs
  /openapi
  /adr
  /runbooks
```

Los módulos no importan ORM de otro módulo para modificar su estado. Las consultas de reporting pueden usar read models o vistas controladas, pero los reportes contables deben poder reconciliarse contra `journal_line`.

---

### A.12. Calidad, CI, contenedores y observabilidad

#### A.12.1 CI y calidad

El pipeline debe ejecutar, en orden y con artefactos retenidos:

1. formato y lint de Python/TypeScript;
2. chequeo de tipos (`mypy`/equivalente y TypeScript estricto);
3. validación de OpenAPI y compatibilidad de contratos;
4. tests unitarios de reglas e invariantes;
5. tests de integración contra PostgreSQL real con RLS habilitado;
6. tests de concurrencia e idempotencia;
7. tests de migración desde base vacía y desde una versión anterior;
8. tests de seguridad, dependencias y secretos;
9. cobertura mínima por módulo, con umbral alto para posting, estados, permisos y cálculo monetario;
10. generación de artefactos versionados y checksum.

No se considera suficiente pasar un test de endpoint que solo compruebe un `200`; los tests deben comprobar cambios de estado, asientos, outbox, auditoría y ausencia de duplicados.

#### A.12.2 Contenedores

La definición de contenedores debe ser reproducible y no contener secretos. Separar al menos API, worker y PostgreSQL en entornos de prueba. Ejecutar como usuario no root cuando sea compatible, filesystem de aplicación de solo lectura si es posible, healthchecks y límites de recursos. Las migraciones se ejecutan como paso explícito con control de versión, no al arrancar múltiples réplicas simultáneamente.

#### A.12.3 Observabilidad

Logs JSON con `request_id`, `correlation_id`, `tenant_id`/`company_id` seudonimizados o controlados, `actor_id`, módulo, operación, duración, estado y error normalizado. Nunca registrar tokens, claves privadas, contraseñas, contenido completo de documentos sensibles ni números bancarios completos.

Métricas mínimas:

- latencia y errores por endpoint/módulo;
- locks, deadlocks, rollbacks, serialización fallida;
- outbox pendiente, edad máxima, reintentos y dead-letter;
- documentos por estado y tiempo en estado;
- postings exitosos/fallidos y desequilibrios rechazados;
- trabajos tributarios por estado;
- correos pendientes/rechazados;
- duración de cierre, exportación y generación de archivos;
- conexiones de pool y saturación.

Trazas correlacionan solicitud API, transacción, evento outbox y worker. Auditoría de negocio es independiente de logs operativos y tiene retención protegida.

---

### A.13. Seguridad, privacidad y continuidad

#### A.13.1 Seguridad de aplicación

- Validar tenant, empresa y permisos en cada comando.
- Usar consultas parametrizadas/ORM seguro y prohibir SQL construido con filtros del usuario.
- Protección CSRF si existe autenticación basada en cookie; CORS mínimo.
- Rate limiting por actor/empresa para login, importaciones, correo y servicios externos.
- MFA y reautenticación para certificados, cierres, reversas y operaciones de alto riesgo según política.
- Rotación de claves, expiración de sesiones y revocación.
- Escaneo de archivos, límites de tamaño y lista permitida de MIME.
- Control de acceso a adjuntos por propietario y tenant, no por URL permanente.
- Datos personales minimizados; retención y anonimización conforme política aplicable.

#### A.13.2 Cifrado

TLS en tránsito. Cifrado en reposo para base/objetos y cifrado a nivel de aplicación para certificados, claves, identificadores bancarios y secretos. Usar KMS/secret manager; la clave maestra no se guarda en la base. Rotación con versionado y prueba de descifrado. Archivos exportados se protegen y expiran según clasificación.

#### A.13.3 Backups y restore

- Backup lógico periódico para objetos seleccionados y backup físico/PITR para la base.
- Cifrado, retención por capas y copia fuera del entorno principal.
- Verificación automática de integridad/checksum.
- Prueba de restauración en entorno aislado con RLS, migraciones y conteo de asientos.
- RPO/RTO deben ser valores aprobados por negocio, no supuestos del documento.
- Runbook de desastre: declarar incidente, detener writers si corresponde, restaurar, aplicar WAL, validar checksums/saldos, rotar secretos comprometidos, reanudar outbox con deduplicación y emitir informe.
- La restauración no debe reenviar automáticamente documentos tributarios ni correos; el outbox restaurado se clasifica y se reanuda con revisión/idempotencia.

---

### A.14. Pruebas de aceptación obligatorias

#### A.14.1 Tenant y seguridad

- Un usuario de empresa A no puede leer, modificar ni inferir por error recursos de empresa B.
- Una FK compuesta impide asociar una línea o cuenta de otra empresa.
- RLS deniega una consulta sin variables de contexto válidas.
- Dos solicitudes con la misma clave idempotente devuelven el mismo resultado sin duplicar documento, asiento o evento canónico; correo usa garantía/conciliación del proveedor.
- Una solicitud con la misma clave y cuerpo diferente devuelve `409`.

#### A.14.2 Condominio y expensas

- Crear una unidad con piso/sección/rubro válidos y rechazar referencias de otro condominio.
- Rechazar alícuotas solapadas y detectar suma fuera de política.
- Mantener historia de propietario sin solapes.
- Generar una vista previa de expensas y comprobar que finalizar crea todos los cargos en una sola transacción.
- Provocar un error en una línea durante finalización y comprobar rollback total.
- Cambiar titularidad después del cálculo y comprobar que el cargo histórico conserva snapshot.

#### A.14.3 Contabilidad

- Rechazar asiento con débito distinto de crédito en commit por constraint diferido.
- Rechazar cuenta no imputable o período cerrado.
- Contabilizar factura sintética y comprobar líneas, dimensiones y outbox.
- Revertir asiento y comprobar que el original permanece intacto y la suma neta queda explicada.
- Ejecutar dos finalizaciones concurrentes y comprobar que existe un solo asiento.
- Ejecutar dos aplicaciones concurrentes de un anticipo y comprobar que nunca se supera el saldo.
- Cerrar período y comprobar que una escritura posterior falla con conflicto de período.

#### A.14.4 CxP/CxC y tesorería

- Registrar compra, retención sintética, egreso y cheque; verificar estados independientes y postings correspondientes.
- Aplicar parcialmente un anticipo y rechazar una aplicación superior al saldo.
- Registrar factura recurrente dos veces por el mismo ciclo y comprobar una sola factura.
- Registrar recaudación con aplicación parcial y crear remanente como anticipo.
- Reemplazar un cheque sin borrar historial y preservar referencias.
- Anular un depósito no conciliado con reversa; impedir eliminación de movimiento contabilizado.

#### A.14.5 Tributación y worker

- Preparar un documento con catálogo versionado y comprobar que el snapshot no cambia al actualizar el catálogo.
- Simular firma externa caída: documento queda `TAX_ERROR` o `RETRYABLE_ERROR` según clasificación, sin revertir negocio.
- Reprocesar el mismo evento tributario y comprobar idempotencia.
- Simular rechazo del adaptador y verificar auditoría, payload minimizado y tarea de revisión.
- Generar ATS/RDEP sintético y comprobar hash, versión, sumatorias y archivo asociado.

#### A.14.6 Restauración y seguridad

- Restaurar backup en entorno aislado y comparar conteos, hash de saldos, auditoría y estados.
- Comprobar que secretos no aparecen en logs, respuestas, trazas, exportaciones ni backups sin cifrar.
- Intentar acceso a adjunto de otro tenant y comprobar `404`/`403` según política sin filtración.
- Verificar que el pipeline falla si OpenAPI rompe compatibilidad o si una migración altera un asiento contabilizado.

---

### A.15. Criterios de terminado técnico

Una entrega de construcción asistida por IA solo se considera técnicamente completa cuando:

- todos los módulos tienen límites, permisos, estados y contratos definidos;
- el esquema aplica FKs compuestas, RLS, índices y restricciones de período/estado;
- los importes están definidos como decimales y los contratos JSON como strings;
- posting, reversa, cierre, idempotencia y concurrencia están cubiertos por tests reales;
- no existe borrado/edición destructiva de contabilizados;
- outbox y worker son transaccionales, reintentables y observables;
- el adaptador SRI es una interfaz reemplazable, sin APIs concretas inventadas;
- certificados, firma, archivos, auditoría, backups y restore tienen controles explícitos;
- los endpoints documentados producen el envelope exacto de éxito/error;
- los reportes se pueden reconciliar con el libro mayor y los snapshots tienen checksum;
- los ejemplos se identifican como sintéticos y las reglas legales/tasas se parametrizan por catálogo y vigencia.

Este anexo concreta la construcción técnica. La matriz y las reglas de los capítulos anteriores son obligatorias, incluida operación independiente del núcleo y activación opcional del vertical.


## Referencias

[1]: https://www.sri.gob.ec/facturacion-electronica "SRI: facturación electrónica y ficha técnica offline 2.34 publicada a julio de 2026"
[2]: https://www.sri.gob.ec/formularios-e-instructivos1 "SRI: formularios, instructivos y recursos separados ATS y RDEP"
[3]: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar?id=137046a6-787c-47fb-a2d7-176595d292dc&nombre=NAC-DGERCGC25-00000014.pdf "SRI: resolución NAC-DGERCGC25-00000014 de emisión y anulación electrónica"
[4]: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar?id=e98fc8a6-299e-4ea9-8de7-2f6c70dbb4f5&nombre=NAC-DGERCGC25-00000017.pdf "SRI: resolución NAC-DGERCGC25-00000017 que reforma plazos, excepciones y vigencia"
[5]: https://www.sri.gob.ec/rimpe "SRI: Régimen Simplificado para Emprendedores y Negocios Populares"
[6]: https://www.sri.gob.ec/normativa-para-agentes-de-retencion-y-contribuyentes-especiales "SRI: normativa para agentes de retención y contribuyentes especiales"
[7]: https://www.sri.gob.ec/impuesto-al-valor-agregado-iva "SRI: Impuesto al Valor Agregado, reglas y tarifas que deben verificarse por vigencia"
[8]: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/272ca6a9-d679-4b4e-8da0-fb4671cf5f8f/NAC-DGERCGC26-00000009_Ret_IR.pdf "SRI: resolución NAC-DGERCGC26-00000009 sobre porcentajes de retención de renta"
[9]: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/e9383f68-a515-47a4-ad64-919190ca8c82/BOLET%C3%8DN%20018%20-%20%20AVISO%20SOBRE%20CONSERVACI%C3%93N%20DE%20COMPROBANTES%20ELECTR%C3%93NICOS%20Y%20ACCESO%20A%20SERVICIOS%20DEL%20SRI.pdf "SRI: aviso de conservación de comprobantes electrónicos, marzo de 2024"
[10]: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/1c04850c-093e-44bf-ba98-e9bc8baae57e/Ley_Regimen_Tributario_Interno_20_jun_2023.pdf "SRI: texto LRTI publicado en 2023, sujeto a contraste con reformas para cada operación"
[11]: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/aa569bb7-b871-458c-a8c7-6bcf49841843/Reglamento_LRTI_24Nov2023.pdf "SRI: reglamento LRTI publicado en 2023, reglas de expensas y alícuotas sujetas a contraste de reformas"
[12]: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/e48abc39-3dee-49d2-93d7-3cbe5d01c704/Art.%2B19%2BContabilidad%2By%2BEstados%2BFinancieros.pdf "SRI: extracto de obligaciones de contabilidad, estados financieros y conservación"
[13]: https://www.supercias.gob.ec/portalscvs/doc/normativa/NORMAS%2BNIIF.pdf?MOD=AJPERES&CACHEID=3171f132-591e-4825-9951-f71974c57ca4 "SCVS: instructivo de aplicación de NIIF completas y NIIF para las PYMES"
[14]: https://www.gob.ec/regulaciones/ley-propiedad-horizontal "Gobierno del Ecuador: Ley de Propiedad Horizontal"
[15]: https://www.pimampiro.gob.ec/images/documents/REGLAMENTO_LEY_PROPIEDAD_HORIZONTAL.pdf "Municipio de Pimampiro: copia institucional del Reglamento General de Propiedad Horizontal"
[16]: https://www.spdp.gob.ec/wp-content/uploads/2025/09/03.pdf "SPDP: Ley Orgánica de Protección de Datos Personales"
[17]: https://www.iess.gob.ec/en/web/empleador/mora-patronal "IESS: obligaciones del empleador y mora patronal"
[18]: https://contifico.com/funcionalidades-de-contifico/ "Siigo Contífico Ecuador: funcionalidades contables, bancos y automatización"
[19]: https://contifico.portaldeclientes.siigo.ec/basedeconocimiento/cargar-compras-automaticamente/ "Siigo Contífico: ayuda oficial de carga automática de compras y homologación"
[20]: https://isac.ec/ "ISAC Ecuador: presupuesto, alícuotas, pagos y administración de condominios"

