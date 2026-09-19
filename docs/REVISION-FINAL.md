# Revisión de entrega — 19/09/2026

Se mantiene el diseño aprobado. No se añaden secciones, proveedores,
dependencias, analítica ni datos recogidos. Esta revisión no certifica WCAG
ni sustituye pruebas en dispositivos físicos.

## Correcciones

- Impresión: los pasos que todavía no se habían recorrido podían quedar
  invisibles por las animaciones. Se muestran todos, se reducen los espacios,
  se permiten saltos de página y se ocultan controles/recetas relacionadas.
- Teclado: enlace para saltar la cabecera; campos del editor con nombres
  accesibles y selección de fotografías alcanzable mediante Tab.
- Lectura: listas explícitas en Safari, encabezado de relacionadas, eliminación
  de una numeración duplicada para lectores y mejor contraste en acceso/modo cocina.
- Movimiento reducido: revelados visibles y parallax desactivado también
  cuando la preferencia cambia después del montaje.
- Móvil: cabecera de ingredientes adaptable; imágenes de tarjeta mediante
  `srcset` y tamaños adaptativos, conservando autorización por descarga.
- Cubierta: calidad 60 en el optimizador, sin alterar originales. Una comparación
  local del recurso vertical a 750 px pasa de 284.630 a 208.828 bytes (−26,6 %).
- Metadatos de receta: URL, nombre del sitio e idioma explícitos en Open Graph.
- Rastreo: `robots.txt` permite las fotografías servidas por el endpoint propio,
  necesarias para Recipe/OG; conserva el bloqueo del resto de la API, firma y
  Preview. La autorización de imágenes no cambia. Referencia:
  [directrices de imágenes de Recipe](https://developers.google.com/search/docs/appearance/structured-data/recipe).

## Comprobaciones realizadas

| Área | Evidencia | Límite |
|---|---|---|
| Adaptación | Catálogo a 320, 390, 768 y 1440 px: ancho del documento igual al viewport y tarjetas de igual altura, incluso sin foto. Ficha a 320 px sin desbordamiento | Chrome de escritorio con viewport reducido, no Android físico |
| Teclado | Salto al contenido; modo cocina, ingredientes, Escape y retorno al botón de apertura; cierre del buscador | No recorrido completo con lector de pantalla |
| Safari | Ficha, imágenes y listas reconocidas; apertura/cierre del modo cocina | Safari de macOS, no iOS |
| Impresión | Previsualización de Chrome: cuatro pasos completos sin haber recorrido previamente todos; sin navegación, botones ni relacionadas | No impresión en papel ni todos los controladores |
| Metadatos | HTTP anónimo en producción: canónicas en portada, catálogo y katsu; OG; JSON-LD Recipe con 17 ingredientes y 8 pasos | No acredita indexación ni previsualización en todas las redes |
| Rendimiento inicial | PageSpeed móvil: rendimiento 90, accesibilidad 100, buenas prácticas 100 y SEO 100; FCP 0,9 s, LCP 3,6 s, TBT 70 ms, CLS 0 | Laboratorio anterior a esta entrega; no datos de campo |

[Informe de PageSpeed inicial](https://pagespeed.web.dev/analysis/https-recetario-36ok-vercel-app/gsflpyvurm?form_factor=mobile).
El 100 automático de accesibilidad no demuestra conformidad completa.

## Validación y despliegue reproducibles

1. Ejecutar lint, tipos, pruebas unitarias y build.
2. Integrar por feature → develop → PR → main, sin saltar comprobaciones exigidas.
3. En producción, comprobar portada, catálogo, ficha, contacto, iconos,
   robots/sitemap y salud; verificar que aparecen el salto al contenido,
   el `srcset` de tarjetas y la cubierta con calidad 60.
4. Repetir medición móvil y distinguir fluctuaciones de laboratorio de mejoras
   demostradas en tamaño de recursos.

No se crean cuentas, sesiones ni recetas de prueba en producción. La minimización
de sesiones se comprueba con Better Auth en memoria; no se borran históricos.

## No comprobado o fuera de esta entrega

Móviles físicos iPhone/Android, VoiceOver/TalkBack, zoom real al 200 %, cambio
de movimiento reducido desde el sistema y tarjetas dentro de redes sociales.
Correo, activación de TOTP, política/retención de privacidad y pruebas adicionales
de fiabilidad del editor quedan aplazados por decisión del propietario, no cerrados.
