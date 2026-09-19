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

La prueba HTTP opcional crea y elimina cuentas y documentos temporales en dev.
Comprueba visibilidad de página/API/foto, CSRF, guardado idempotente, conflicto
If-Match, cambio de contraseña, sesión caducada, desafío TOTP, código de
recuperación de un solo uso y eliminación de lector. No prueba entrega de correo,
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
