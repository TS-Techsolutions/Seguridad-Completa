# Instrucciones de ejecución para IA — SAGA v2

**Estado:** nuevo plan pendiente de aprobación del usuario. En esta revisión no se construye ni se modifica la aplicación. Existe una implementación realizada por otra IA según el usuario, pero no se ha recibido ni auditado su repositorio o URL.

## Qué cambió respecto de la primera versión

La distribución del Excel es ahora contractual: cinco raíces exactas, todos sus padres/niveles, orden y 101 accesos operativos. No sustituirla por módulos genéricos ni reorganizarla en nuevas raíces Compras, Ventas, Tesorería o Comunicaciones. Los nombres y errores de escritura originales se mantienen como referencia; cualquier corrección visible requiere aprobación y nunca elimina el acceso.

Un directorio, router, modelo o menú no equivale a un módulo terminado. Una pantalla requiere una ruta propia, una vista específica, campos/filtros, columnas, acciones con permisos, proceso backend, persistencia y pruebas. Compartir un componente React o un servicio es válido; fusionar Registro, Reimpresión, Modificación y Anulación en una única página genérica no lo es.

## Orden de lectura obligatorio

1. Leer `01_Plan_reconstruccion_v2.md` y confirmar autorización de ejecución.
2. Leer `05_Distribucion_original_v2.md` y `03_Menu_original_v2.json`; implementar navegación conservando padres y orden.
3. Leer `02_Catalogo_pantallas_procesos_v2.md` y `03_Manifiesto_pantallas_v2.json`; cada ficha es un contrato de pantalla y proceso.
4. Usar `03_Matriz_pantallas_procesos_v2.xlsx` para auditar cobertura, evidencias y aceptación.
5. Aplicar `04_Base_tecnica_v2.md` para React/TypeScript, FastAPI/Python, PostgreSQL, contabilidad, seguridad, estados e integración SRI. Las fichas y distribución v2 prevalecen sobre ejemplos de organización del documento previo.
6. El archivo `fuente/DetalledePantallas.xlsx` es la evidencia original. No basarse en memoria ni en un listado reducido.

## Si se entrega una aplicación existente

Auditar primero, sin borrar ni sobrescribir datos. Para cada ID, comprobar menú, URL, formulario/tabla, botones, API, base, permisos, proceso, reportes y evidencias. Clasificar existente-completo, existente-incompleto, faltante, bloqueado o no auditado. Reutilizar solo lo que supere pruebas. La matriz empieza NO AUDITADO: no significa que todas las pantallas estén ausentes ni que la aplicación ya sea correcta.

No declarar una causa concreta del fallo anterior sin evidencia. Si no hay repositorio/URL, preparar la ejecución desde los contratos y pedir acceso al iniciar la fase de auditoría. El plan puede aprobarse sin ese acceso, pero la estimación de reparación no debe inventarse.

## Entregar un incremento vertical cada vez

Para cada pantalla: crear migración/modelo si hace falta → servicio de dominio → contrato API → vista React específica → permisos/estados → prueba positiva → prueba negativa → persistencia tras recarga → evidencia. La ruta visible del frontend no es la URL de FastAPI: documentar ambas. Una transacción financiera debe dejar saldo, auxiliares, asiento y reporte coherentes; una reimpresión no crea transacción.

No aceptar placeholders, botones sin efecto, respuestas fijas, datos únicamente en memoria o localStorage, pantallas copiadas sin adaptación, tablas genéricas sin filtros específicos, reportes con totales de ejemplo ni un SRI simulado en producción. Estados vacío/error/carga deben existir, pero no reemplazan procesos.

Cada evidencia debe asociarse al ID: captura de vista, URL, traza Playwright, respuesta API y persistencia verificable. La captura demuestra interfaz, no integridad contable. El conteo de componentes o endpoints no demuestra cobertura.

## Reglas funcionales que no pueden perderse

El núcleo contable general funciona sin inmuebles; la extensión inmobiliaria se construye, pero se activa por empresa opcionalmente. Desactivarla no borra asientos ni impide cobrar cartera histórica. No exigir condominio, unidad o alícuota en operaciones generales.

Mantener la pantalla original D145 `Anexo Transaccional RDEP`, con pestañas ATS y RDEP, fuentes/esquemas/procesos separados. Mantener E118 `Rep. Retenciones Emitidas` bajo CxC y explicar su alcance mediante selector emitidas/recibidas y subtítulo; no reemplazar silenciosamente el acceso por otra opción. El reporte de CxP sigue existiendo.

Mantener ambos accesos de importación Proveedores/Clientes. Pueden usar un único motor, pero deben conservar sus rutas, encabezados, contexto y pruebas. Las pantallas de reportes no deben redirigir todas a un único dashboard.

No borrar ni editar contabilizados: reversar/reemplazar con vínculo, motivo y aprobación. Separar autorización/anulación fiscal de efectos contables. No inventar tarifas ni API pública de anulación SRI; seguir fuentes y canales vigentes del documento técnico.

## Salida y autorizaciones

Los 20 controles/mejoras incluidos en v1 se conservan. Los complementos de pantalla v2 cierran flujos dentro de ese alcance y no reemplazan originales; si alguno añade un alcance material nuevo, solicitar cambio antes de implementarlo. Portal de propietarios, nómina completa y pagos/conexiones bancarias permanecen fuera del alcance base.

La entrega completa exige las 101 opciones aceptadas, complementos necesarios operativos, controles y pruebas integrales, tanto en empresa general como con módulo inmobiliario. Presentar pendientes y bloqueos explícitos; nunca usar “aplicación completa” para una estructura navegable sin procesos.

Aprobar el plan no autoriza automáticamente producción, pagos, certificados reales ni presentación de archivos tributarios. Mantener esas puertas de aprobación separadas.
