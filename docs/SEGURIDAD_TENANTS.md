# Seguridad y aislamiento de empresas

## Controles aplicados

- El usuario se obtiene de una cookie de sesión firmada y `HttpOnly`. El encabezado `X-Actor-Id` ya no es una credencial y se ignora.
- `X-Company-Id` únicamente selecciona la empresa: el backend valida la membresía del usuario antes de consultar o modificar información.
- Todos los accesos empresariales usan `company_id` como parte del filtro y de las claves compuestas.
- Los valores de `client_state`, los payloads operativos y el detalle de auditoría se cifran con AES-256-GCM. Cada empresa usa una subclave derivada distinta; además, la empresa y la clave del registro se autentican como datos asociados, por lo que un ciphertext no puede trasladarse válidamente a otra empresa.
- La base SQLite no abre un puerto de red. En validación, API y frontend se publican sólo en `127.0.0.1`.
- La API bloquea acceso remoto salvo que `SAGA_ALLOW_REMOTE=true`, restringe hosts aceptados y emite cabeceras CSP, anti-frame, no-sniff y no-cache.
- SQLite usa claves foráneas, borrado seguro, sincronización completa y permisos locales restrictivos para el archivo.

## Grupos administrativos de compañías

- Una compañía puede pertenecer como máximo a un grupo administrativo, evitando alcances superpuestos o ambiguos.
- Cada grupo debe contener al menos dos compañías activas.
- El Administrador de Grupo obtiene las capacidades `USERS_MANAGE`, `PERMISSIONS_MANAGE` y `ACCESS_MANAGE` únicamente dentro de las compañías del grupo. Sólo recibe las pantallas Usuarios, Roles y Permisos; no recibe módulos operativos, contables, cartera, clientes ni proveedores.
- La selección de compañía enviada por el navegador nunca amplía el alcance: el backend vuelve a comprobar grupo activo, administrador activo y relación grupo-compañía en cada solicitud.
- El Administrador de Grupo sólo recibe en los listados las compañías y grupos autorizados. No puede crear compañías, agrupar compañías adicionales, suspender empresas ni consultar otros grupos.
- Si el navegador conserva una compañía anterior que ya no pertenece al alcance, la sesión obtiene primero la lista autorizada y recarga el almacenamiento con una compañía válida antes de leer información empresarial.
- La sincronización del navegador para este rol sólo entrega configuración de seguridad e identidad visual. Las claves operativas y financieras se eliminan del almacenamiento local y el backend rechaza su lectura o escritura.

## Llaves y secretos

En validación local se generan dos llaves aleatorias en el mismo directorio privado de la base:

- `.saga-data.key`: cifrado de datos.
- `.saga-session.key`: firma de sesiones.

Ambas rutas están excluidas de Git. Si se pierde `.saga-data.key`, los datos cifrados no se pueden recuperar.

En producción no se generan llaves automáticamente. Deben configurarse desde un gestor de secretos como valores Base64 URL-safe de 32 bytes:

- `SAGA_DATA_ENCRYPTION_KEY`
- `SAGA_SESSION_SECRET`

Las llaves no deben quedar en archivos del repositorio, imágenes Docker, respaldos sin cifrar ni variables visibles al frontend.

## Acceso remoto y producción

El autoacceso existente sirve únicamente para la validación local por loopback. En `SAGA_ENVIRONMENT=production` queda deshabilitado y la API falla cerrada si no existe una sesión autenticada.

Antes de habilitar `SAGA_ALLOW_REMOTE=true` se requiere:

1. Publicar únicamente el frontend/reverse proxy con TLS; nunca publicar la base de datos.
2. Integrar un proveedor de identidad con MFA y establecer la sesión firmada desde el servidor.
3. Guardar llaves en un gestor de secretos y cifrar respaldos.
4. Migrar la persistencia de producción a PostgreSQL con Row-Level Security, `FORCE ROW LEVEL SECURITY`, rol de aplicación sin `BYPASSRLS` y políticas obligatorias por tenant/empresa.
5. Ejecutar pruebas negativas de lectura, escritura, exportación, caché y restauración entre empresas.
6. Alertar intentos rechazados de acceso cruzado y conservar auditoría sin datos sensibles en texto plano.

SQLite se mantiene como base local de validación. No debe ubicarse en una carpeta compartida ni sincronizada públicamente.
