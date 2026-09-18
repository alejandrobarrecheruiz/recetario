# Checklist para completar Recetario

Actualizado: 18 de septiembre de 2026. Estado del código local, todavía sin
desplegar. Las decisiones vigentes están en [CLAUDE.md](./CLAUDE.md).

**La web aún no está terminada.** Los dos problemas P0 identificados se han
corregido localmente. Quedan configuración externa, contenidos y pruebas de
flujos completos. Una casilla marcada significa corrección local comprobada,
no certificación de seguridad ni verificación de producción.

Prioridades: P0 inmediata; P1 necesaria para cerrar la web; P2 mejora posterior.
Se conservan los identificadores de los 39 puntos de la revisión inicial.

## Validación realizada

- 76 pruebas unitarias correctas, incluidos retorno del login, comprobación
  de origen, publicación, correo simulado, catálogo y progreso de cocina.
- TypeScript y ESLint correctos; `git diff --check` sin errores.
- 30 pruebas de entorno correctas contra `recetas_dev` e ImageKit. Mongo
  comprobó índices y creó/eliminó datos temporales; ImageKit solo se consultó.
- `npm run build -- --webpack` correcto. Turbopack quedó bloqueado por
  restricciones del entorno para abrir puertos internos; no se ha validado
  aquí su compilación.
- `npm audit`: cero vulnerabilidades conocidas tras actualizar Next a
  16.3.5, sharp a 0.35.4 y js-yaml a su parche compatible.
- HTTP local sobre el build: portada, login y recuperación responden 200;
  admin sin sesión redirige a login; icono, Apple y OG responden PNG/200.
  Las páginas incluyen CSP con nonce coincidente en HTML, nosniff y DENY.
- Revisión visual e interactiva local de portada, ficha, catálogo y cuenta
  en móvil y escritorio: filtros y búsqueda combinados, raciones compartidas,
  modo cocina y apertura/cierre de ajustes. No se han probado los nuevos flujos
  autenticados de extremo a extremo: faltan entrega real de correos, TOTP,
  cambios de contraseña y eliminación de cuentas con usuarios de prueba.
- No se modificaron producción, cuentas reales, secretos ni configuración
  de proveedores. No se hizo push ni despliegue.

Las comprobaciones de integración y HTTP necesitaron acceso de red fuera del
sandbox. Los primeros fallos de DNS/conexión no eran fallos de credenciales.

## 1. Seguridad y acceso

- [x] **S1 · P0 · Dependencias.** Actualizadas y auditadas; build y pruebas
  correctos. Revisar de nuevo los avisos antes del despliegue.
- [x] **S2 · P0 · Retorno del login.** `src/lib/navegacion.ts` exige el mismo
  origen y rechaza barras invertidas, controles y destinos externos. Pruebas
  de regresión para el caso original `/\\example.org`.
- [ ] **S3 · P1 · Correo verificado — preparado, falta activación.**
  Configurar `RESEND_API_KEY` y `CORREO_REMITENTE`, DNS y entrega. Sin ambos
  valores, altas cerradas y acceso existente conservado. Al habilitarlos,
  las cuentas antiguas no verificadas deben confirmar su dirección; un login
  válido inicia el envío. Probar enlace, reenvío, caducidad y correo recibido.
- [ ] **S4 · P1 · Recuperación — preparada, falta prueba real.**
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
- [ ] **S7 · P1 · Segundo factor — disponible, no activado.** Configurarlo en
  la cuenta administradora, probar códigos de recuperación y guardarlos fuera
  del sitio. Revisar también MFA de Vercel, Atlas, ImageKit y correo.
- [ ] **S8 · P1 · Separar credenciales dev/prod.** Verificar permisos reales,
  usuarios Mongo limitados por base, secretos de autenticación distintos y
  aislamiento de ImageKit. Una carpeta o nombre de base no aísla permisos.
  No se han cambiado secretos ni cuentas de proveedores.
- [x] **S9 · P1 · Cabeceras HTTP.** CSP con nonce, protección frente a frames,
  nosniff, referrer y permisos restringidos. Verificadas por HTTP local.
  Estilos inline siguen permitidos; comprobar CSP y recursos en navegador y
  en el despliegue antes de integrar.
- [ ] **S10 · P1 · CSRF — implementado, falta flujo autenticado.**
  Mutaciones propias comprueban Origin/Fetch Metadata y mantienen guards.
  Pruebas unitarias para origen ajeno/subdominios; falta comprobar cookies y
  llamadas autenticadas en Preview.
- [ ] **S11 · P1 · Fotos restringidas.** Definir si deben tener el mismo control
  de acceso que el texto. Las URLs actuales no están protegidas por sesión.
  Si deben ser privadas, configurar entrega firmada, migración y caché; no
  basta con esconder las URLs. No se ha migrado ningún fichero.
- [ ] **S12 · P2 · Integridad de imágenes — implementación parcial.** El alta
  contrasta fileId, origen, carpeta, tipo, tamaño y dimensiones con ImageKit;
  rechaza SVG. Hay límites de textos/arrays y comprobación de fotos existentes
  al editar. Faltan pruebas con proveedor real y resolver carreras entre
  guardado, borrado y reutilización.
- [ ] **S13 · P2 · Fronteras de servidor.** Consultas administrativas ya pasan
  por `conVisibilidad`. Falta una barrera de importación de módulos privados
  verificada por el compilador; no se añadió otra dependencia.

## 2. Editor y funcionamiento

- [ ] **F1 · P1 · Guardado concurrente — implementado, falta prueba de flujo.**
  Peticiones serializadas; PUT exige If-Match con la fecha ISO y actualiza
  atómicamente por versión. 412 detiene el guardado y avisa del conflicto.
  Probar dos pestañas, respuestas lentas y edición durante subida de fotos.
- [ ] **F2 · P1 · Recuperación de trabajo — parcial.** Captura de fallos de red
  y avisos al cerrar/seguir enlaces. Faltan borrador recuperable, resolución
  de conflictos y cobertura de navegación atrás. No recargar ante un conflicto
  sin copiar primero los cambios que se quieran conservar.
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
  slug estable desde primera publicación. Faltan conservación de filtros al
  navegar y paginación/límites del listado de API.

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
- [ ] **L3 · P1 · Inventario de cookies.** Observar navegación anónima, sesión,
  persistencia y TOTP: nombre, finalidad, duración y destinatario. Decidir con
  ese inventario si hacen falta medidas de consentimiento. No se añadió
  automáticamente un banner.
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
| Foto «Quién cocina aquí» | Sigue el hueco | Foto cuadrada de unos 1000 px o retirar bloque |
| Bucle de cocina | Sigue el hueco | Vídeo corto con alternativa estática o retirar bloque |
| Fotos de recetas | Se resuelven por IDs referenciados | Inventario de portadas y pasos |
| Texto alternativo | Sigue derivado de título/paso | Editor de descripciones útiles y revisión editorial |

- [ ] **V1 · P1:** icono sustituido; faltan foto/bucle o decisión de retirarlos.
- [ ] **V2 · P1:** Apple/OG generados; faltan revisión de recortes y alt editables.
- [ ] **V3 · P1:** optimización implementada; faltan mediciones móviles.
- [ ] **V4 · P1:** confirmar derechos de uso y revisar EXIF/ubicación.
  No se ha afirmado que los originales contengan GPS.

El favicon anterior de Vercel se retiró; el original versionado sigue recuperable
en Git. Manifest/PWA es opcional, no condición para cerrar el blog.

## 5. Accesibilidad y buscadores

- [ ] **U1 · P1 · Modo cocina — implementado, falta comprobación.** Diálogo
  modal, foco inicial/retorno, captura de Tab, fondo inert y Escape. Probar
  teclado y lector de pantalla, incluidos los ingredientes.
- [ ] **U2 · P1 · Controles — parcial.** aria-pressed, mensajes de estado,
  foco visible, escalador táctil y botones para reordenar. Revisar todas las
  etiquetas de campos del panel y anuncios con lector de pantalla.
- [ ] **U3 · P1 · Revisión visual.** Móvil estrecho, escritorio, zoom, contraste,
  texto sobre fotos, movimiento reducido, Safari/iPhone y Chrome/Android.
  Medir Lighthouse/Core Web Vitals; todavía no hay medición real.
- [ ] **E1 · P1 · Metadatos — implementados, falta validación externa.**
  Canónicas, OG global y descripción alternativa. Probar tarjetas compartidas
  y datos estructurados con recetas reales.
- [x] **E2 · P1 · Indexación en código.** noindex en cuenta/login/admin y recetas
  restringidas; Preview disallow y X-Robots-Tag. Sitemap sigue solo público.
  Verificar cabeceras del despliegue; robots no sustituye autorización.
- [ ] **E3 · P2 · Extras.** Estilos de impresión añadidos, pendientes de revisión.
  Dominio propio, Search Console, compartir y PWA siguen siendo opcionales.

## 6. Operación y cierre

- [ ] **O1 · P1 · Backup restaurable.** El script actual copia documentos,
  no bytes de ImageKit ni índices. Falta restauración probada en base aislada,
  copia protegida externa y retención. Con .env.local habitual se copia dev;
  producción requiere destino correcto y --permitir-prod explícito. Nunca
  ensayar una restauración sobre producción.
- [ ] **O2 · P1 · Proveedores.** Verificar índices/permisos de producción,
  aislamiento, Preview, cuotas y recuperación de cuentas. Las pruebas de
  desarrollo no demuestran configuración correcta de producción.
- [ ] **O3 · P1 · Alertas.** Confirmar monitor de disponibilidad y errores,
  destinatario de avisos y retención de logs; no registrar datos privados,
  contraseñas o tokens. No es analítica comercial.
- [ ] **O4 · P1 · Pruebas y CI.** Pruebas unitarias/integración existentes
  correctas; faltan cobertura de flujos autenticados/editor y CI del repositorio.
  No se añadieron frameworks ni dependencias nuevas.

## Siguiente revisión antes de desplegar

1. Completar contacto/privacidad, configurar remitente y verificar correo.
2. Probar con cuentas temporales: lector, admin, TOTP, recuperación y borrado.
3. Probar visibilidad por API y páginas: una receta no visible debe devolver 404.
4. Simular dos pestañas, red lenta, caída de Mongo/ImageKit y limpieza fallida.
5. Revisar móvil, teclado, imágenes, contraste, CSP y cookies en Preview.
6. Separar secretos, confirmar backup recuperable e índices de producción.
7. Repetir pruebas, audit y build; integrar por feature → develop → PR → main.

Se mantiene el alcance del producto: blog personal, sin anuncios, pagos,
newsletter, analítica de conversión ni funciones comerciales.
