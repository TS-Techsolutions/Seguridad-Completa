# Guía de validación incremental

## Corte 1 — estructura y navegación

1. Confirmar los nueve módulos y su orden: Administración Inmuebles, Email, Contabilidad, Caja Chica, CxP, CxC, Bancos, Tributación y Configuración General.
2. Recorrer la jerarquía anidada y buscar por ID o nombre.
3. Verificar que las 101 rutas abren una pantalla y conservan título y breadcrumb contractuales.

## Corte 2 — interacción y datos

1. Crear un borrador desde una pantalla de catálogo.
2. Abrir el detalle y refrescar para comprobar persistencia.
3. Ejecutar una acción contextual y revisar el cambio de estado y versión.
4. Validar que cada tabla, filtro, formulario y flujo proviene del manifiesto de esa pantalla.

## Corte 3 — casos especiales

- XLS-079: cambiar entre la perspectiva Emitidas y Recibidas.
- XLS-098: comprobar la separación visual de ATS y RDEP.
- Pantallas inmobiliarias: deshabilitar el paquete y comprobar el guard de escritura.
- Repetir una creación con la misma clave de idempotencia y verificar que no se duplique.

## Corte 4 — endurecimiento previo a producción

El siguiente ciclo debe reemplazar los adaptadores locales por servicios de dominio por módulo, PostgreSQL, autenticación y autorización reales, almacenamiento documental y conectores certificados. Ningún botón del entorno actual comunica con SRI, bancos, correo o pasarelas externas.

## Criterio de salida por pantalla

Una pantalla se considera aceptada cuando coincide con su ruta y nombre original, aplica sus campos obligatorios y validaciones, persiste sin duplicados, registra auditoría, respeta el estado del módulo y tiene pruebas del flujo feliz y los errores relevantes.
