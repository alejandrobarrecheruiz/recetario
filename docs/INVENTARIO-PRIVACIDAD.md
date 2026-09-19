# Inventario técnico de privacidad

Revisión: 19/09/2026. Documento interno, no política publicada ni certificación
legal. Distingue comportamiento del código, observaciones HTTP y configuración
externa pendiente. No contiene datos de cuentas, tokens ni valores de cookies.

## Alcance y resultado

- Revisados código de aplicación, Better Auth instalado, scripts de backup y
  configuración de Next. No se identificaron anuncios, píxeles, analítica,
  newsletter ni integraciones de seguimiento añadidas por el proyecto.
- En producción, GET anónimo a `/`, `/recetas`,
  `/recetas/katsu-curry-de-proteina-vegetal`, `/login`, `/contacto` y
  `/api/auth/get-session`: todos 200, ninguno con `Set-Cookie`.
- Esto es una comprobación HTTP sin ejecutar JavaScript: no demuestra por sí
  sola ausencia de almacenamiento o peticiones posteriores en el navegador.
- No se han creado cuentas ni activado correo o 2FA. Ambos siguen aplazados
  por decisión del propietario; el registro permanece cerrado.
- No se consultaron documentos de usuarios, logs privados, backups ni contratos.
  Falta contrastar cookies autenticadas en HTTPS y ajustes reales de proveedores.

### Decisión de minimización

Se prioriza recoger los mínimos datos necesarios sin eliminar acceso, guardadas,
recuperación de trabajo ni protección frente a intentos de entrada. Implementado
en el código: `minimizarNuevaSesion` establece `ipAddress` y
`userAgent` a `null` en el hook anterior a crear una sesión. No se guardan esos
valores en las nuevas filas de `session`; sí se procesan cabeceras de la petición
y se mantiene la IP utilizada por `rateLimit`. No equivale a navegación anónima.

No se han eliminado sesiones históricas, datos de cuentas ni backups. No cambia
la retención de los borradores. La minimización en Vercel/Atlas/ImageKit y la
conservación efectiva del limitador siguen pendientes. No se han fijado plazos
arbitrarios ni aplicado borrados retroactivos.

Pruebas locales sin red: creación y lectura de sesión con Better Auth y su
adaptador en memoria, IP/navegador nulos, respuesta 429 al superar el límite y
contadores separados para IP distintas. No es una prueba de MongoDB ni Vercel.
Fuente de la extensión utilizada:
[hooks de base de datos de Better Auth](https://better-auth.com/docs/concepts/database).

## Cookies de autenticación

Fuente: `src/lib/auth.ts` y Better Auth, `dist/cookies/index.mjs`,
`dist/context/create-context.mjs` y `dist/plugins/two-factor/`.
En producción HTTPS se espera el prefijo `__Secure-better-auth.`; en HTTP local,
`better-auth.`. Atributos configurados por defecto: HttpOnly, SameSite=Lax,
Path=/, Secure en HTTPS y sin Domain compartido. No son cookies de ImageKit.

| Sufijo | Uso y vigencia | Evidencia / estado |
|---|---|---|
| `session_token` | Identificador firmado de acceso; 7 días, con renovación de sesión según actividad (intervalo por defecto: 1 día) | Configuración y observación HTTP local previa de 604800 s; pendiente contraste HTTPS autenticado |
| `two_factor` | Desafío de acceso con segundo factor; 10 minutos | Observado en HTTP local previo; solo si se usa 2FA, no se activa para este inventario |
| `session_data` | Caché de sesión, deshabilitada en esta configuración | En pruebas previas solo apareció para borrarse, Max-Age=0; no clasificarlo como almacenamiento activo de 5 minutos |
| `dont_remember` | Cookie de sesión si se solicita no recordar el acceso | Disponible en dependencia; el formulario actual no envía esa opción |
| `trust_device` | Dispositivo recordado para 2FA; máximo por defecto 30 días | Disponible en dependencia; el formulario no solicita `trustDevice` |
| `account_data` | Caché de cuenta | No habilitada; no confundir una definición de la librería con una cookie emitida |

No hay proveedores OAuth configurados. No añadir sus posibles cookies a la
lista de cookies efectivas. Una cookie expirada no acredita eliminación de los
datos correspondientes en MongoDB o en copias de seguridad.

## Almacenamiento del dispositivo

| Mecanismo / clave | Contenido y finalidad | Conservación efectiva |
|---|---|---|
| `sessionStorage`: `recetario:guardar-tras-acceso` | ID de receta, destino interno y fecha; completar el Guardar solicitado antes de entrar | Vigencia lógica de 1 hora; se borra al completar/cancelar o al leer un valor inválido. No hay temporizador de borrado; normalmente desaparece al terminar la sesión de la pestaña |
| `localStorage`: `recetario:editor:<usuarioId>:<recetaId>:<instancia>` | Copia del texto y datos de receta, IDs, versión, metadatos de imágenes y cola de fotos pendientes; recuperar trabajo del administrador | Sin caducidad. La copia de la instancia actual se retira al quedar limpia sin fotos pendientes; otras copias requieren recuperar/descartar. Cerrar sesión no limpia estos borradores |
| `localStorage`: `better-auth.message` | Último aviso técnico de cambio de sesión entre pestañas: evento, motivo, identificador aleatorio y fecha; no contraseña ni token de acceso | Better Auth lo sobrescribe al emitir otro aviso; no establece caducidad ni lo elimina al desmontar |
| Memoria React | Raciones, paso de cocina, filtros y posición del catálogo | Se pierde al recargar o abandonar el recorrido público; no se añade persistencia |
| Descarga manual de borrador JSON | Copia de trabajo solicitada por el administrador | Archivo local fuera del control de la web; requiere borrado manual |

Fuentes: `src/lib/guardado-pendiente.ts`, `src/lib/borradores-editor.ts`,
`src/models/borrador-editor.ts`, `src/components/editor-receta.tsx`,
`src/components/boton-salir.tsx` y Better Auth
`dist/client/broadcast-channel.mjs` / `session-refresh.mjs`.

Separar claves por usuario evita mezclar borradores en la interfaz, pero no los
cifra ni protege frente a otra persona con acceso al mismo perfil del navegador.
Las copias contienen metadatos de fotos, no sus archivos originales.

## Datos del servidor y eliminación

| Colección / sistema | Datos tratados | Borrado y límites comprobables en código |
|---|---|---|
| MongoDB `user` | Nombre, correo, verificación, rol, fechas, estado de bloqueo y segundo factor; el esquema también admite imagen de perfil | Eliminación de lector disponible; administrador excluido. Sin caducidad por inactividad |
| `account` | Relación con usuario/proveedor de acceso, hash de contraseña y fechas | Better Auth elimina las cuentas vinculadas al eliminar al usuario; no se guarda contraseña en claro |
| `session` | Token de sesión, usuario y fechas; posible referencia de suplantación del plugin admin. IP y user-agent nulos al crear con el código actual; versiones anteriores sí guardan esos valores | Eliminación por cierre/revocación y borrado de cuenta. La librería puede retirar una sesión caducada al consultarla; no hay limpieza periódica propia garantizada |
| `saves` | IDs de usuario y receta, fecha de guardado | Quitar guardada y hook anterior a eliminación de cuenta |
| `verification` | Identificador, valor de verificación y fechas; usado también por desafíos de seguridad | Hay consumo y limpieza oportunista de caducados al consultar. El borrado de usuario no acredita barrido de todas sus verificaciones |
| `rateLimit` | Clave formada por IP resuelta (o identificador de respaldo) y ruta, contador y fecha de última petición | Limpieza oportunista al reiniciar una ventana existente; ventana de límite no equivale a plazo máximo de conservación |
| `twoFactor` | Relación de usuario, secreto y códigos de recuperación cifrados, verificación y contadores de bloqueo | Hook posterior a eliminar lector. Activación aplazada; no se ha inspeccionado contenido real |
| `recipes`, `images` | Textos, autor/subidor, fechas, descripciones, IDs y metadatos de fotografía | Borrado editorial y limpieza de referencias; originales en ImageKit. No borrar fotos que otras recetas utilizan |
| Backup local | Todas las colecciones no internas, índices y originales de fotos | Copia manual; sin rotación ni eliminación automática. Incluye hashes de contraseñas y tokens de sesión, además de datos personales |
| Correo de contacto | Remitente, texto y adjuntos que la persona envíe voluntariamente a Gmail | Fuera de la base de la web; plazo y procedimiento pendientes |

Fuentes: `src/lib/auth.ts`, `src/lib/privacidad-sesion.ts`, `src/lib/mongo.ts`, `src/models/`,
`scripts/backup.ts`, rutas de recetas/imágenes y Better Auth
`dist/db/internal-adapter.mjs` / `dist/api/rate-limiter/index.mjs`.
El proyecto no declara índices TTL para autenticación en `crearIndices()`;
no se han inspeccionado los índices efectivos de producción en esta revisión.

El backup escribe con permisos locales 0700/0600 y está excluido de Git; eso
no equivale a cifrado del conjunto. No hay un procedimiento implementado para
reaplicar las supresiones ni invalidar sesiones al restaurar una copia antigua.
Tampoco se garantiza una operación atómica entre el borrado de guardadas,
cuenta y segundo factor: deben comprobarse y gestionarse los fallos parciales.

## Destinatarios y tráfico

- **Vercel:** recibe las peticiones web y ejecuta el servidor. Puede tratar IP,
  cabeceras, rutas y logs operativos. La búsqueda viaja en `?q=` y puede aparecer
  en historial y registros de URL. Retención y configuración de logs pendientes.
- **MongoDB Atlas:** recibe datos de cuentas, autenticación, guardadas y contenido
  desde el servidor, no una conexión directa del navegador. Región, permisos,
  backups gestionados y condiciones reales pendientes de comprobar.
- **ImageKit:** almacena originales y transformaciones. La visualización usa
  el endpoint de Recetario y una petición servidor-servidor sin reenviar cookies
  ni cabeceras del visitante. El administrador sí sube directamente a
  `upload.imagekit.io`, que recibe archivo y datos técnicos de esa conexión.
  Revisar EXIF de originales: proteger la URL no elimina metadatos ni copias.
- **Google/Gmail:** buzón de contacto; no se integra con el acceso. Las fuentes
  de Google se sirven localmente mediante `next/font`, sin petición del lector
  a Google Fonts según esa implementación.
- **Resend:** código preparado, servicio transaccional aplazado. No presentarlo
  como destinatario activo de correos de usuarios.
- **GitHub:** repositorio, CI y monitor HTTP. Los workflows revisados no cargan
  backups ni la base de usuarios; las copias locales no se versionan.

No se han verificado entidades contratantes, acuerdos de tratamiento,
subencargados, regiones ni garantías de transferencias. No deducirlos del nombre
del proveedor. Las cookies de sus paneles administrativos no son automáticamente
cookies instaladas por Recetario a sus lectores.

## Consentimiento y comprobaciones antes de publicar

No se ha identificado una finalidad publicitaria o analítica que justifique
añadir ahora un banner. La guía de la AEPD contempla la excepción para tecnologías
estrictamente necesarias para el servicio solicitado; debe evaluarse por
finalidad, también para almacenamiento local, no solo por llamarse «técnicas».
Es una conclusión provisional del inventario, no una determinación legal.
Fuente: [Guía de cookies de la AEPD](https://www.aepd.es/guias/guia-cookies.pdf).

Pendientes concretos:

1. En un perfil de pruebas limpio, comprobar almacenamiento y red tras cargar
   páginas, buscar y pulsar Guardar; después, acceso/salida con cuenta de prueba
   autorizada. Registrar solo nombres, atributos, duraciones y destinos, sin
   valores de sesión. No cerrar la sesión real del propietario para probarlo.
2. Contrastar HTTPS autenticado y limpieza de cookies. Documentar 2FA como
   condicional; no activarlo al administrador para completar este inventario.
3. Acordar retención de cuentas, correos, borradores, logs y backups. No fijar
   plazos en la política antes de implementar y comprobar la limpieza necesaria.
4. Definir supresión en restauraciones y tratamiento de fallos parciales;
   comprobar ajustes, regiones y contratos de proveedores.
5. Validar bases jurídicas y texto de privacidad. Solo entonces publicar
   `/privacidad` y añadir los enlaces e información correspondientes.
