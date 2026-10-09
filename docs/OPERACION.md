# Operación y cierre

## Desplegar las imágenes protegidas sin romper las actuales

**Estado vigente (19/09/2026):** entrega protegida desplegada en producción.
La cuenta ImageKit es exclusiva de Recetario y tiene **Restrict all requests**
activado para imágenes. Se invalidó la caché de los siete archivos existentes;
los originales y variantes probadas sin firma responden 401, mientras las dos
fotos públicas del sitio responden 200. No se modificaron los originales.
Queda repetir en Vercel el recorrido de cambio de visibilidad y roles.

Procedimiento para nuevos entornos o cambios de proveedor:

1. Integrar por `feature/*` → `develop`. Probar la entrega de fotos por
   `/api/imagenes/[id]`: pública sin sesión, restringida 404 sin sesión y 200
   con una cuenta autorizada. Comprobar también portada, pasos, tarjetas y OG.
2. Llevar el código validado a `main` por PR. Confirmar `Ready` y el dominio
   https://recetario-36ok.vercel.app. No activar aún la restricción del proveedor
   si alguna versión que debe seguir funcionando depende de URLs sin firma.
3. En ImageKit, revisar qué otros sitios usan la misma cuenta. Activar
   **Restrict unsigned URLs → Restrict all requests** solo después de confirmar
   que todos los consumidores afectados están preparados. Las nuevas subidas
   ya usan `isPrivateFile`, pero esto no protege todos los enlaces antiguos.
4. Purgar las variantes antiguas pertinentes siguiendo el procedimiento del
   proveedor y probar originales y transformaciones sin firma desde una sesión
   anónima. Deben quedar rechazados; las rutas autorizadas de Recetario deben
   continuar funcionando. No se pueden retirar copias que alguien ya descargó.
5. Probar pasar una receta de pública a restringida y cerrar sesión: la ruta
   del sitio debe devolver 404 sin enviar bytes. No añadir una caché pública a
   este endpoint. Medir su coste y latencia en Vercel con fotos reales.

La firma vive únicamente en la petición servidor-servidor, caduca en 60 segundos
y no se devuelve al cliente. Los tamaños se validan con una lista cerrada y la
entrega limita ambas dimensiones a 1600 px, conservando la proporción. Los
originales no se reducen ni se destruyen.

Referencia del proveedor: [seguridad de entrega de ImageKit](https://imagekit.io/docs/media-delivery-basic-security).
Un rollback a la versión antigua no es compatible con el bloqueo de URLs sin
firma: conservar una versión de respaldo que use el endpoint protegido.

## Integridad de imágenes e índice único

Un archivo de ImageKit tiene un solo documento en `images`, identificado por
`(proveedor, fileId)`. El alta conserva el documento existente ante reintentos,
incluidas peticiones simultáneas, apoyándose en `proveedor_fileId_unico`.
Responde 201 al crear y 200 al reutilizar. Repetir el registro no cambia el alt,
la receta de origen ni el ID. Subir dos veces los mismos bytes puede generar
dos `fileId` distintos: esta protección no compara el contenido de los archivos.

### Comprobación de solo lectura

```bash
npm run integridad:imagenes
# Para obtener únicamente JSON, sin la cabecera de npm:
npm run --silent integridad:imagenes -- --json
```

Lee todas las recetas, incluidos borradores y restringidas, todos los alimentos
de Despensa (también borradores) y los metadatos.
Recorre la carpeta de ImageKit del entorno y sus subcarpetas con paginación.
No descarga originales, crea índices, repara referencias ni borra archivos.
Exige la pareja `recetas_dev/dev` o `recetas_prod/prod`. Para leer producción,
usar su configuración y añadir `-- --permitir-prod` explícito; no basta con
cambiar el nombre de base dejando la carpeta de desarrollo.

El informe enumera IDs y rutas, sin credenciales ni URLs firmadas:

- Registros duplicados por proveedor y archivo.
- Referencias de portada/pasos y fotos de alimentos a metadatos inexistentes.
- Imágenes sin referencias, incluso si conservan `recetaId`.
- Archivos de ImageKit sin metadatos.
- Metadatos cuyo archivo no aparece en la carpeta comprobada.
- Rutas que no coinciden con el proveedor o pertenecen a otra carpeta.

Códigos de salida: **0** comprobación completa sin incidencias, **1** completa
con incidencias, **2** incompleta por configuración, conexión o listado inválido.
Un fallo al paginar no produce un informe parcial presentado como completo.
Hacerlo sin subidas ni ediciones concurrentes: no es una instantánea
transaccional. Una imagen sin referencias puede estar pendiente de guardado;
el informe es una lista para revisar, nunca una orden de borrado. Si se guarda
la salida de producción, conservarla localmente fuera de Git.

### Aplicación del índice

1. Ejecutar el inventario en el entorno de destino sin ediciones concurrentes.
   Ante código 2, resolver el fallo y repetir antes de interpretar los datos.
2. Si hay duplicados, detener la aplicación del índice. Hacer backup y preparar
   una reparación revisada: elegir un ID canónico, redirigir todas las referencias
   de portada/pasos y eliminar **solo los metadatos sobrantes**. No usar
   `DELETE /api/imagenes/[id]` para fusionar duplicados: borraría el archivo
   compartido de ImageKit. El comando de integridad no hace esa reparación.
3. Ejecutar `npm run indices`. En producción, con sus credenciales y
   `MONGODB_DB=recetas_prod`, usar `npm run indices -- --permitir-prod`.
   `crearIndices()` comprueba duplicados antes de crear índices y aborta con
   una indicación concreta si los encuentra. No los fusiona automáticamente.
4. Repetir el inventario y verificar `proveedor_fileId_unico` en `images`
   (`unique: true`, claves `proveedor: 1, fileId: 1`). Revisar las demás incidencias
   aunque no impidan crear ese índice.
5. Aplicar y verificar el índice en producción **antes de integrar el cambio
   en `main`**. La creación en desarrollo no demuestra que exista en producción.

La entrega y el borrado de imágenes resuelven referencias de recetas y alimentos
mediante `src/lib/usos-imagenes.ts`. Antes de que otra sección utilice `images`,
ampliar conjuntamente autorización, borrado e inventario con sus referencias.

### Incorporar Despensa

1. Aplicar `npm run indices` en desarrollo. Añade la colección `foods`, el índice
   único `alimento_nombre_unico` por `claveNombre`, `despensa_publicada` y el índice
   `images.alimentoId`. No rellena alimentos ni modifica recetas existentes.
2. Comprobar en local y Preview: alta de borrador, publicación, indispensable,
   revisión de enlaces, foto, edición concurrente y retirada. Las pruebas HTTP
   locales cubren además que borrar una receta conserve la foto de un alimento
   y viceversa. No ejecutar la suite HTTP contra Vercel.
3. Ejecutar inventario y aplicar los índices con la configuración de producción
   y `npm run indices -- --permitir-prod`, **antes** de integrar en `main`.
4. Verificar `/despensa`, su entrada en cabecera y sitemap, y
   `/admin/despensa`. El estado inicial vacío es válido: las recomendaciones
   se escriben desde el panel, sin contenidos de muestra publicados.

Los documentos antiguos de imágenes pueden no llevar `alimentoId`; se resuelven
sin migración. Una vez haya fotos de alimentos, un rollback debe conservar las
comprobaciones de usos de Despensa: el código antiguo que solo consultaba recetas
no sirve para autorizar ni limpiar esas fotos. El backup habitual incluye `foods`
automáticamente y los originales siguen en `images`.

## Acceso y permisos

- El correo queda aplazado por decisión del propietario: sin dominio ni
  proveedor transaccional, sin integración de Gmail personal. Mantener cerrado
  el registro y no ofrecer recuperación automática; las cuentas existentes
  conservan el acceso y el cambio autenticado de contraseña.
- Cuando se retome el correo, configurar un dominio verificado en Resend,
  `RESEND_API_KEY` y `CORREO_REMITENTE`.
- Usar `BETTER_AUTH_URL` de cada entorno: localhost, el alias de develop
  `https://recetario-git-develop-barrechee.vercel.app` o el dominio de producción.
- Probar recepción real, caducidad/reutilización de enlaces, cuentas antiguas
  no verificadas y revocación de sesiones al recuperar contraseña.
- TOTP del administrador queda aplazado por decisión del propietario. Cuando
  se retome, activarlo desde su cuenta y guardar los códigos en su gestor seguro.
  La prueba con una cuenta temporal no activa el admin real.
- Sustituir el usuario Mongo de desarrollo con rol `atlasAdmin` por uno con
  `readWrite` solo en `recetas_dev`; Production necesita otro limitado a
  `recetas_prod`. Usar credenciales operativas separadas para tareas como un
  ensayo en una base nueva. Comprobar que cada usuario rechaza acceso cruzado.
- Separar secretos de autenticación y permisos de ImageKit. Planificar cualquier
  rotación de `BETTER_AUTH_SECRET`: puede invalidar sesiones y afectar secretos
  TOTP cifrados; no sustituirlo a ciegas en producción.
- Validar los límites de Better Auth, IP del cliente, 429 y comportamiento entre
  instancias en Vercel. Las APIs propias aún requieren límites de consumo.

## Pruebas reproducibles

```bash
conda activate recetario
npm run lint
npm run typecheck
npm test
npm run test:entorno
# Con npm run dev en localhost:3000 y .env.local de recetas_dev:
PROBAR_HTTP=1 npm run test:entorno
npm run build
```

La prueba HTTP opcional crea y elimina cuentas, documentos y un PNG privado de
1 px en la carpeta `dev` de ImageKit. No usa ni modifica fotografías editoriales.
Comprueba visibilidad de página/API/foto, CSRF, guardado idempotente, conflicto
If-Match, cambio de contraseña, sesión caducada, desafío TOTP, código de
recuperación de un solo uso y eliminación de lector. Comprueba también el alta
real de imagen y reintentos simultáneos con el mismo ID y metadatos conservados.
Incluye publicación y retirada de alimentos, deduplicación de nombres, revisión
de destinos, conflictos y conservación/borrado de fotografías compartidas.
No prueba entrega de correo,
pantallas en dispositivos reales ni aislamiento de producción. No usarla contra
una URL de Vercel ni una base real de producción.

## Copia y ensayo de recuperación

```bash
npm run backup
npm run restaurar:ensayo -- --carpeta backups/NOMBRE_DE_LA_COPIA --base recetas_restauracion_ensayo
```

Con `.env.local` habitual se copia **desarrollo**. Para un backup de producción,
usar su configuración de forma segura y añadir `-- --permitir-prod`.
El formato 2 guarda todas las colecciones EJSON, índices y originales de fotos
con hashes SHA-256. La copia solo está completa si `resumen.json` lo indica.
Realizarla sin ediciones concurrentes: no es una instantánea transaccional.
Los permisos locales son 0700/0600; contienen datos de usuarios, sesiones y
secretos cifrados. No subirla a Git, adjuntarla a incidencias ni compartirla por chat.

El ensayo rechaza destinos dev/prod y bases con colecciones. Restaura documentos
e índices y verifica los bytes de las fotos. **No reconstituye ImageKit**: ante
pérdida del proveedor aún hace falta reubicar los originales y actualizar
fileId/path/URL. Verificar esta recuperación en un espacio aislado antes de
considerar cerrado el plan de desastre. Eliminar solo la base temporal concreta
cuando se hayan comprobado los resultados.

Quedan por acordar retención de copias, copia externa cifrada y procedimiento
para no reintroducir cuentas eliminadas al recuperar una copia antigua.

## Cookies y almacenamiento

El [inventario técnico de privacidad](./INVENTARIO-PRIVACIDAD.md) centraliza
cookies, almacenamiento propio y de Better Auth, datos del servidor,
destinatarios, eliminación y evidencias locales/de producción. Incluye las
comprobaciones reproducibles pendientes, sin registrar valores de sesión.

La política sigue en borrador. No publicar un banner por defecto ni presentar
la caducidad de una cookie/token como eliminación de registros o backups.

## CI, avisos y siguientes revisiones

`comprobar.yml` ejecuta lint, tipos y pruebas puras sin secretos. Configurar la
comprobación como obligatoria en la protección de ramas después de su primer
resultado correcto. `disponibilidad.yml` comprueba portada y salud cada media
hora cuando esté en la rama predeterminada. Activar notificaciones de Actions,
probar un aviso y confirmar destinatario. Los cron pueden retrasarse: esto no
equivale a un servicio de monitorización con garantía. Faltan avisos de errores
de aplicación y una política de retención de logs sin datos privados.

Pendientes de prueba manual: red lenta y cortes durante subidas simultáneas,
recuperación de borrador en navegador, carreras de limpieza de imágenes,
Safari/iPhone y Android en móviles físicos, lector de pantalla, zoom y tarjeta
social externa. Safari de escritorio, teclado, anchuras móviles e impresión
tienen evidencias en [REVISION-FINAL.md](./REVISION-FINAL.md). Añadir paginación cuando el tamaño del catálogo lo justifique;
no introducir nuevas secciones por cerrar esta lista.
