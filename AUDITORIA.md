# Checklist para completar Recetario

Actualizado: 19 de septiembre de 2026. Los cambios de cierre están integrados
en `main` y desplegados según confirmación del propietario. La entrega protegida
de imágenes se ha comprobado en producción y el bloqueo de ImageKit está activo. Las decisiones
vigentes están en [CLAUDE.md](./CLAUDE.md) y los procedimientos en
[docs/OPERACION.md](./docs/OPERACION.md).

**La web aún no está terminada.** Los dos problemas P0 identificados se han
corregido. Quedan configuración externa, contenidos y pruebas de flujos completos.
Cada punto distingue las comprobaciones locales de las de producción; una casilla
marcada no es una certificación de seguridad.

Prioridades: P0 inmediata; P1 necesaria para cerrar la web; P2 mejora posterior.
Se conservan los identificadores de los 39 puntos de la revisión inicial.

## Validación realizada

- Minimización de nuevas sesiones implementada: IP y navegador
  nulos antes de persistir; no se modifica el limitador de intentos. 84 pruebas
  unitarias correctas, incluidas sesión autenticada y límite por IP con el
  adaptador en memoria de Better Auth. Sin borrados históricos ni pruebas nuevas
  en producción para este cambio.
- Revisión de entrega del 19/09: anchuras 320/390/768/1440 px sin desbordamiento
  en catálogo y con tarjetas iguales; ficha estrecha, teclado y Safari de escritorio.
  Corregidos impresión de pasos no visitados, etiquetas del editor, salto al
  contenido, listas en Safari e imágenes adaptativas. Evidencias y límites en
  [docs/REVISION-FINAL.md](./docs/REVISION-FINAL.md).
- 82 pruebas unitarias correctas, incluidos intención de guardado tras acceso,
  aislamiento/recuperación de borradores y tamaños de imágenes permitidos.
- TypeScript y ESLint correctos; `git diff --check` sin errores.
- 31 pruebas de entorno correctas con `PROBAR_HTTP=1` contra `recetas_dev` e ImageKit. Mongo
  comprobó índices y creó/eliminó datos temporales; ImageKit solo se consultó.
- `npm run build` con Turbopack correcto con acceso fuera del sandbox;
  compilación 1,7 s y tipos 1,3 s en local. No equivale al tiempo total de Vercel.
- `npm audit`: cero vulnerabilidades conocidas tras actualizar Next a
  16.3.5, sharp a 0.35.4 y js-yaml a su parche compatible.
- HTTP local sobre el build: portada, login y recuperación responden 200;
  admin sin sesión redirige a login; icono, Apple y OG responden PNG/200.
  Las páginas incluyen CSP con nonce coincidente en HTML, nosniff y DENY.
- Revisión visual e interactiva local de portada, ficha, catálogo y cuenta
  en móvil y escritorio: filtros y búsqueda combinados, raciones compartidas,
  modo cocina y apertura/cierre de ajustes. Retorno al filtro del catálogo
  comprobado en navegador. Por HTTP local se comprobaron acceso, cambio de
  contraseña, sesión caducada, TOTP y códigos de recuperación, eliminación de
  lector y prohibición de eliminar admin, CSRF, fotos restringidas y conflicto
  de guardado. Se utilizaron cuentas temporales y se limpiaron al terminar.
- Editor probado en dos pestañas con un borrador temporal: recuperación de texto
  e ingrediente incompleto, rechazo de versión antigua, conservación al seguir
  escribiendo y sustitución solo tras confirmación explícita.
- Backup de desarrollo restaurado en base temporal: documentos e índices
  recuperados y cuatro originales verificados. La base temporal se eliminó;
  el backup local se conserva fuera de Git. No se ensayó reconstruir ImageKit.
- ImageKit: activado el bloqueo de todas las peticiones de imágenes sin firma
  e invalidada la caché de los siete archivos existentes. Los siete originales y
  sus variantes probadas devuelven 401 sin firma; las dos fotografías públicas
  responden 200 mediante el endpoint de producción. No se borraron originales
  ni se cambiaron recetas, cuentas o secretos. Esto no sustituye probar todos
  los roles y cambios de visibilidad en Vercel.

Las comprobaciones de integración y HTTP necesitaron acceso de red fuera del
sandbox. Los primeros fallos de DNS/conexión no eran fallos de credenciales.

## 1. Seguridad y acceso

- [x] **S1 · P0 · Dependencias.** Actualizadas y auditadas; build y pruebas
  correctos. Revisar de nuevo los avisos antes del despliegue.
- [x] **S2 · P0 · Retorno del login.** `src/lib/navegacion.ts` exige el mismo
  origen y rechaza barras invertidas, controles y destinos externos. Pruebas
  de regresión para el caso original `/\\example.org`.
- [ ] **S3 · P1 · Correo verificado — aplazado por decisión del propietario.**
  Por ahora no se configura dominio/proveedor ni se integra Gmail personal.
  Configurar `RESEND_API_KEY` y `CORREO_REMITENTE`, DNS y entrega. Sin ambos
  valores, altas cerradas y acceso existente conservado. Al habilitarlos,
  las cuentas antiguas no verificadas deben confirmar su dirección; un login
  válido inicia el envío. Probar enlace, reenvío, caducidad y correo recibido.
- [ ] **S4 · P1 · Recuperación — aplazada junto al correo.**
  No hay recuperación automática disponible mientras no se configure remitente.
  Existe `/recuperar`, enlaces de una hora y revocación de sesiones tras el
  cambio; cambio autenticado disponible en cuenta. Probar caducidad,
  reutilización, sesión revocada y fallo de entrega con remitente real.
- [ ] **S5 · P1 · Enumeración — mitigación pendiente de prueba HTTP.**
  Formulario genérico; `autoSignIn:false` y verificación habilitan la respuesta
  genérica para duplicados en el Better Auth instalado. Comparar respuesta y
  tiempos con cuentas de prueba cuando se configure el correo.
- [ ] **S6 · P1 · Límites — implementación parcial.** Better Auth usa Mongo
  para contadores y reglas específicas. Verificar IP fiable, 429 y varias
  instancias de Vercel. Faltan límites de consumo de las APIs propias.
- [ ] **S7 · P1 · Segundo factor — activación aplazada por el propietario.** Al retomarlo, configurarlo en
  la cuenta administradora, probar códigos de recuperación y guardarlos fuera
  del sitio. Revisar también MFA de Vercel, Atlas, ImageKit y correo.
- [ ] **S8 · P1 · Separar credenciales dev/prod.** Verificar permisos reales,
  usuarios Mongo limitados por base, secretos de autenticación distintos y
  aislamiento de ImageKit. Una carpeta o nombre de base no aísla permisos.
  La credencial local tiene `atlasAdmin`, confirmado con sus permisos efectivos.
  No se han cambiado secretos ni cuentas de proveedores.
- [x] **S9 · P1 · Cabeceras HTTP.** CSP con nonce, protección frente a frames,
  nosniff, referrer y permisos restringidos. Verificadas por HTTP local.
  Estilos inline siguen permitidos; comprobar CSP y recursos en navegador y
  en el despliegue antes de integrar.
- [ ] **S10 · P1 · CSRF — probado en HTTP local, falta Vercel.**
  Mutaciones propias comprueban Origin/Fetch Metadata y mantienen guards.
  Pruebas unitarias para origen ajeno/subdominios; falta comprobar cookies y
  llamadas autenticadas en Preview.
- [x] **S11 · P1 · Fotos restringidas — desplegado y bloqueo externo activado.**
  Entrega por endpoint con autorización por receta y firma servidor-servidor,
  tamaños acotados y sin caché compartida; probado 404/200 con cuentas de prueba.
  Nuevas subidas privadas. Cuenta ImageKit exclusiva de Recetario con
  **Restrict all requests** activo y caché de siete archivos invalidada.
  Originales y variantes probadas sin firma: 401; fotografías públicas por
  Recetario: 200. Sin migrar ni destruir originales. Los roles y cambios de
  visibilidad se probaron localmente; falta repetir ese recorrido en Vercel.
- [ ] **S12 · P2 · Integridad de imágenes — implementación parcial.** El alta
  contrasta fileId, origen, carpeta, tipo, tamaño y dimensiones con ImageKit;
  rechaza SVG. Hay límites de textos/arrays y comprobación de fotos existentes
  al editar. Faltan pruebas con proveedor real y resolver carreras entre
  guardado, borrado y reutilización.
- [ ] **S13 · P2 · Fronteras de servidor.** Consultas administrativas ya pasan
  por `conVisibilidad`. Falta una barrera de importación de módulos privados
  verificada por el compilador; no se añadió otra dependencia.

## 2. Editor y funcionamiento

- [ ] **F1 · P1 · Guardado concurrente — probado por HTTP.**
  Peticiones serializadas; PUT exige If-Match con la fecha ISO y actualiza
  atómicamente por versión. 412 detiene el guardado y avisa del conflicto.
  El segundo PUT con revisión antigua recibe 412 sin pisar el primero, también
  probado en dos pestañas del navegador. Faltan respuestas lentas y fotos simultáneas.
- [ ] **F2 · P1 · Recuperación de trabajo — implementada y probada entre pestañas.**
  Borradores locales por usuario/receta/pestaña, recuperación y descarga JSON,
  copia de la cola de fotos pendientes. Ante conflicto permite consultar la
  versión actual y confirmar una sustitución, nunca fusiona automáticamente.
  Pruebas unitarias de aislamiento y campos incompletos y recuperación visual;
  falta corte de red real y navegación atrás con cambios sin guardar.
- [ ] **F3 · P1 · Sustitución de fotos — parcial.** Se confirma la nueva
  referencia antes de borrar la foto antigua; una foto referenciada no se
  elimina. Falta limpieza/reintento de huérfanas tras fallo o cierre de pestaña.
- [ ] **F4 · P1 · Borrado — parcial.** Limpia guardadas; conserva fotos
  reutilizadas y muestra aviso de limpieza incompleta. Faltan acción de
  reintento y pruebas de carreras; los metadatos fallidos se conservan.
- [x] **F5 · P1 · Publicación válida.** Ingredientes y pasos obligatorios al
  publicar, IDs únicos, textos no vacíos y tiempo total coherente. Publicación
  explícita; portada y resumen continúan siendo opcionales. Pruebas correctas.
- [ ] **F6 · P1 · Estados de error — implementados, falta flujo.** Login,
  salida, alta y favoritos muestran fallos de red. Rollback por favorito,
  protección frente al redirect concurrente del login. Probar expiración y
  varias acciones simultáneas con navegador.
- [ ] **F7 · P1 · Caídas de servicios — parcial.** Pantallas error/global-error
  recuperables; Mongo no conserva promesas rechazadas. Falta probar recuperación
  tras fallo inicial de importación de auth, que usa await de módulo.
- [ ] **F8 · P2 · Navegación/búsqueda — parcial.** Se combinan texto y categoría;
  slug estable desde primera publicación. Retorno al catálogo conserva filtros
  y posición dentro del recorrido público. Guardar tras acceso se completa con
  intención local vigente y permite reintentar. Falta paginación/límites cuando
  el volumen lo requiera. El progreso de cocina no se conserva tras recargar.

## 3. Privacidad, información y contacto

`/contacto` incluye la identidad y correo confirmados y un canal para derechos,
enlazado desde el pie público y acceso/cuenta. El borrador de privacidad está en
[PRIVACIDAD.md](./PRIVACIDAD.md), no en una ruta pública; faltan decisiones y
comprobaciones de los tratamientos reales para convertirlo en política definitiva.

- [ ] **L1 · P1 · Privacidad y aviso en registro.** Identidad y contacto
  confirmados; borrador preparado. Completar bases jurídicas, conservación,
  proveedores, regiones/transferencias y derechos. Incluir nombre, correo,
  sesión, guardadas y correo transaccional. Revisar el texto antes de publicarlo.
- [ ] **L2 · P1 · Canal de derechos — parcial.** Cuenta permite editar nombre,
  contraseña y eliminar lectores (incluidas guardadas y limpieza de TOTP).
  Contacto visible añadido; faltan procedimiento de atención y política de backups.
  Probar borrado, reautenticación y sesiones; admin no se borra desde la cuenta.
- [ ] **L3 · P1 · Inventario de cookies — documentado, contraste parcial.**
  [Inventario técnico](./docs/INVENTARIO-PRIVACIDAD.md) de cookies, almacenamiento
  propio y de Better Auth, datos, destinatarios y borrado. Seis respuestas HTTP
  anónimas de producción sin `Set-Cookie`; acceso/TOTP observados previamente
  solo en HTTP local. Falta navegador limpio y HTTPS autenticado, sin activar
  2FA al administrador. No se añadió un banner ni se cerró la decisión jurídica.
- [ ] **L4 · P1 · Información del sitio.** Contacto y titular disponibles.
  Faltan autoría/licencia de textos y fotos; valorar condiciones de cuenta y aplicabilidad del aviso
  legal. No añadir políticas de compra o devolución a este blog sin comercio.

Referencias para revisión del texto, no certificación legal:
[RGPD](https://www.boe.es/doue/2016/119/L00001-00088.pdf),
[guía de cookies AEPD](https://www.aepd.es/guias/guia-cookies.pdf),
[LSSI](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758).

## 4. Imágenes e identidad

| Recurso | Estado local | Falta |
|---|---|---|
| Logo original | Conservado, 246 × 256 | Original mayor si se amplía; revisar legibilidad pequeña |
| Favicon | Sustituido por ruta PNG de marca 64 × 64 | Comprobar pestaña a 16/32 px |
| Icono Apple | PNG 180 × 180 | Verificar en iPhone |
| Imagen social | PNG 1200 × 630 con marca | Revisar tarjeta compartida |
| Portada horizontal/móvil | Optimizador Next y selección por ancho | Medir peso, carga y encuadre reales |
| Foto personal y vídeo | Bloques retirados de la portada aprobada | No son requisitos pendientes |
| Fotos de recetas | Se resuelven por IDs referenciados | Inventario de portadas y pasos |
| Texto alternativo | Editable desde portada y pasos en el editor | Revisión editorial de descripciones útiles |

- [ ] **V1 · P1:** icono sustituido; comprobar tamaño pequeño. Foto/bucle retirados.
- [ ] **V2 · P1:** Apple/OG generados y alt editable; falta revisión en dispositivos.
- [x] **V3 · P1:** medición móvil de laboratorio realizada: portada 90 de
  rendimiento, LCP 3,6 s y CLS 0 antes de esta entrega. Reducidos peso de cubierta
  y tamaños solicitados por tarjetas. No hay datos de usuarios reales.
- [ ] **V4 · P1:** confirmar derechos de uso y revisar EXIF/ubicación.
  No se ha afirmado que los originales contengan GPS.

El favicon anterior de Vercel se retiró; el original versionado sigue recuperable
en Git. Manifest/PWA es opcional, no condición para cerrar el blog.

## 5. Accesibilidad y buscadores

- [ ] **U1 · P1 · Modo cocina — teclado comprobado.** Apertura, navegación,
  ingredientes, Escape y retorno del foco comprobados en Chrome; apertura/cierre
  en Safari de escritorio. Falta lector de pantalla, incluidos los ingredientes.
- [ ] **U2 · P1 · Controles — parcial.** aria-pressed, mensajes de estado,
  foco visible, escalador táctil y botones para reordenar. Revisar todas las
  etiquetas de campos del panel y anuncios con lector de pantalla.
- [ ] **U3 · P1 · Revisión visual.** Móvil estrecho, escritorio, zoom, contraste,
  texto sobre fotos, movimiento reducido, Safari/iPhone y Chrome/Android.
  Lighthouse móvil medido; no hay datos de campo ni prueba en móviles físicos.
- [ ] **E1 · P1 · Metadatos — implementados, falta validación externa.**
  Canónicas, OG global y descripción alternativa. Probar tarjetas compartidas
  y datos estructurados con recetas reales.
- [x] **E2 · P1 · Indexación en código.** noindex en cuenta/login/admin y recetas
  restringidas; Preview disallow y X-Robots-Tag. Sitemap sigue solo público.
  Verificar cabeceras del despliegue; robots no sustituye autorización.
- [x] **E3 · P2 · Impresión.** Previsualización de Chrome comprobada: pasos
  completos aunque no se hayan visitado, sin controles ni recetas relacionadas.
  Dominio propio, Search Console, compartir y PWA siguen siendo opcionales.

## 6. Operación y cierre

- [ ] **O1 · P1 · Backup restaurable — ensayo parcial superado.** Documentos,
  índices y originales incluidos; restauración aislada y hashes comprobados.
  Faltan reconstrucción del proveedor de fotos, copia externa protegida y
  retención. Con .env.local habitual se copia dev;
  producción requiere destino correcto y --permitir-prod explícito. Nunca
  ensayar una restauración sobre producción.
- [ ] **O2 · P1 · Proveedores.** Verificar índices/permisos de producción,
  aislamiento, Preview, cuotas y recuperación de cuentas. Las pruebas de
  desarrollo no demuestran configuración correcta de producción.
- [ ] **O3 · P1 · Alertas.** Confirmar monitor de disponibilidad y errores,
  destinatario de avisos y retención de logs; no registrar datos privados,
  contraseñas o tokens. Workflow de disponibilidad preparado; falta integración
  y prueba de notificaciones. No cubre todavía errores internos de aplicación.
- [ ] **O4 · P1 · Pruebas y CI.** Pruebas unitarias/integración existentes
  correctas; flujos HTTP ampliados y CI de lint/tipos/unidad preparado. Falta
  ejecutarlo en GitHub y exigir su resultado en las ramas protegidas.
  No se añadieron frameworks ni dependencias nuevas.

## Alcance de la entrega y trabajo aplazado

La entrega actual es la revisión visual, accesibilidad, rendimiento, impresión
y metadatos descrita en `docs/REVISION-FINAL.md`, integrada por
feature → develop → PR → main. La comprobación de producción debe confirmar
los marcadores de esta versión y las rutas públicas, no solo un HTTP 200.

Por decisión del propietario no se reabren ahora correo, activación de TOTP,
retención/política de privacidad ni pruebas adicionales de fiabilidad del editor.
Siguen aplazados, no completados. Tampoco se dan por verificadas las pruebas
que requieren móviles físicos o un lector de pantalla.

Se mantiene el alcance del producto: blog personal, sin anuncios, pagos,
newsletter, analítica de conversión ni funciones comerciales.
