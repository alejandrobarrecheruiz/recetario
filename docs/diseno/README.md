# Recorrido 04: Mi libro de recetas

## Catálogo y cuenta · tira visual y cuenta aprobadas

[catalogo-cuenta.html](./catalogo-cuenta.html) compara dos tratamientos de
categorías (tira SVG deslizable y selector compacto) y una cuenta con identidad,
guardadas y ajustes separados. Incluye escritorio, 390 y 320 px, vista sin marco
y estado sin guardadas. Los filtros, búsqueda y marcadores funcionan solo en
memoria; los ajustes no solicitan credenciales ni modifican cuentas.

Se reutilizan Instrument Sans, el logo circular y los marcos. El catálogo de
ejemplo y su clasificación no cambian MongoDB. Mezcla fotos locales ya existentes
con recetas sin foto; la tortilla conserva la foto de prueba del autor. Las
guardadas y el estado de seguridad son ilustrativos, no se consultan en la cuenta.
El acceso al panel corresponde a la vista de administrador; la eliminación de
cuentas lectoras no se representa en esta primera composición. La tira visual
y la cuenta están aprobadas e implementadas en Next.js. El selector compacto
se conserva únicamente como alternativa de referencia. La aplicación usa las
categorías y guardadas reales, no las de muestra; mantiene los formularios de
seguridad y la eliminación de cuentas lectoras dentro del panel de ajustes.
La clasificación de categorías sigue sin modificarse.

Validación local: `node --test docs/diseno/catalogo-cuenta.test.mjs`.

## Comparativa de ficha de escritorio · 18 de septiembre

[propuestas-ficha.html](./propuestas-ficha.html) permite comparar cuatro
alternativas independientes de la app: foto y título enfrentados, foto lateral
que acompaña la lectura, y panorámica con ingredientes en una franja compacta.
La propuesta 04 combina las dos primeras: introducción e ingredientes a la
izquierda y foto a la derecha. Debajo, los pasos se leen sin rótulo lateral,
línea de entrada ni separadores entre filas, en una columna de hasta 980 px.
La nota queda más abajo, centrada y en cursiva, sin caja, «P. D.», título ni firma; el
encabezado de preparación sigue disponible para lectores de pantalla. Acota la lista
a 440 px y coloca el escalador junto al título, sin márgenes negativos. Se ha
retirado el pie de foto en todas las variantes. Incluye vista de escritorio,
390 y 320 px y enlace sin marco. La 04 está aprobada e implementada en la ficha
de Next.js; estos HTML se conservan como referencia comparativa. La aplicación
utiliza el contenido real, conserva las fotos de los pasos y solo muestra sus
títulos cuando la receta los tiene, sin copiar los ejemplos editoriales.

`ficha-propuestas.html?propuesta=1` (o `2`, `3`, `4`) abre cada alternativa;
sin parámetro se muestra la 04, también seleccionada al abrir el comparador.
Usan Instrument Sans local, el logo circular y la foto de prueba que el autor
añadió a la tortilla en desarrollo. La copia está en
`assets/tortilla-propuestas.jpg`; no representa una fotografía del plato ni
modifica el original. No se incluyen las imágenes de pasos de prueba. Los
títulos breves de los pasos son propuestas editoriales; los textos, cantidades
y tiempos proceden de la ficha de desarrollo. Los controles de raciones,
guardar y cocina son demostraciones en memoria, sin red ni acceso a cuentas.
Los otros iconos explican su condición de maqueta al pulsarlos.

La comparativa se abre como archivo local. Para revisarla mediante HTTP:

```bash
conda activate recetario
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs/diseno
```

Después, abrir `http://127.0.0.1:4173/propuestas-ficha.html`.

Validación de esta comparativa: `node --test docs/diseno/propuestas-ficha.test.mjs`
(cinco pruebas de recursos, sintaxis, variantes y aislamiento). Revisadas las
tres aperturas a 1440 px en navegador y la vista estrecha a 320 px, incluido el
escalado de raciones. No sustituye la revisión con fotografías de comida ni
con recetas más largas antes de integrar la propuesta elegida.

La 04 se ha revisado a 1440 px y en la vista de 320 px: control de raciones
alineado verticalmente con el título, lista sin desbordamiento horizontal,
preparación situada después de foto e ingredientes. Como
alternativas al espacio sobrante se pueden explorar notas de corte, sustituciones
o fotos de detalle cuando exista contenido real; esta variante no añade relleno.

---

17 de septiembre de 2026. La portada 03 ha sido aceptada como base visual.
El HTML se conserva como referencia independiente. Desde el 18 de septiembre,
su dirección también está implementada en Next.js para validación en desarrollo
con `npm run dev` (`http://localhost:3000`), sin desplegarla a producción.
`CLAUDE.md` describe la app vigente; el resto de este documento describe la maqueta.

La revisión posterior se hace directamente en Next.js: inicio con las tres
últimas publicaciones visibles, catálogo separado `/recetas`, cabecera por
iconos y buscador desplegable. `presentacion.html` conserva el recorrido 04;
no refleja estas decisiones posteriores ni debe sustituir la revisión en desarrollo.

En la app, las fichas son rutas reales, las guardadas usan la cuenta y las
recetas proceden de la consulta autorizada a MongoDB, no de esta selección
editorial. Una receta sin foto sigue visible, con tratamiento tipográfico.
La preparación se comparte en memoria entre portada y fichas, pero se pierde
al recargar o visitar cuenta/acceso/panel. La maqueta no tiene esa separación
de rutas y no debe usarse para prometer persistencia en la app.

## Abrir

Abrir [presentacion.html](./presentacion.html) en el navegador. Los botones
permiten ver el recorrido en escritorio, a 390 y a 320 píxeles CSS. Las pestañas
de pantalla abren Portada, Ficha de katsu, Ficha de guacamole y Modo cocina sin
recargar ni perder la preparación. Es un
iframe con ancho real, no una imagen escalada. En ventanas menores, se limita
al espacio disponible: el selector no emula un dispositivo completo.

[portada.html](./portada.html) abre la página sin marco, también desde el móvil
si se sirve en un entorno local accesible. No necesita Next.js ni conexión a
servicios para mostrar el contenido o probar las interacciones.

El [recorrido anterior](./recorrido-mobile.html) se conserva como boceto de
estructura de ficha y modo cocina; no representa su diseño visual definitivo.

## Lo construido sobre la base aprobada

- Logo circular en portada y ficha: dimensiones iguales y recorte circular,
  sin cambiar el archivo original.
- Fichas de las dos recetas reales, con la misma marca, tipografías, bordes,
  blanco de lectura y marco fotográfico. El guacamole no inventa una foto.
- Raciones entre 1 y 12, checklist y contador de ingredientes preparados.
  Cada receta tiene su propio estado mientras la maqueta está abierta.
- Modo cocina con los mismos ingredientes y cantidades: un paso cada vez,
  avance, salida, reanudación y reinicio explícito. Terminar conserva el último
  paso para revisión; no se reinicia automáticamente al volver a entrar.
- Guardadas compartidas entre la portada y las fichas.
- Franja «Retomar» en portada solo cuando existe una preparación empezada.
  Visitar otra receta sin prepararla no borra esa continuación.
- Continuidad entre recetas al final de cada ficha, sin presentarla como una
  recomendación personalizada ni afirmar que los platos deban combinarse.

Las fichas y el modo cocina son vistas mediante `dialog` nativo dentro del
mismo documento, no nuevas rutas Next.js. Esto permite revisar su coherencia
y compartir estado sin depender de almacenamiento bajo URLs `file:`.

## Base visual conservada de la versión 03

La dirección es evolucionar la portada original, no sustituirla por una
composición de revista. Esta iteración responde a la revisión del autor:

- Vuelve la cubierta ilustrada a sangre con `Portada.jpg` en escritorio y
  `Portada-V.jpg` en móvil. El nombre permanece brevemente al bajar y la imagen
  tiene parallax suave. El recorrido baja de unas 1,6 pantallas a aproximadamente
  una, con límites de altura. Se elimina el botón «Abrir el cuaderno»;
  la navegación «Recetas» y el enlace de salto para teclado siguen disponibles.
- Vuelve la banda horizontal ligada al scroll. No avanza sola ni intercepta
  rueda o gestos. Con movimiento reducido, imagen, nombre y banda se quedan
  quietos; los enlaces siguen funcionando.
- La sección de recetas se limita a 720 px incluidos márgenes. Se retira la
  composición en dos columnas de la destacada: ahora tiene foto arriba y
  título, fecha, tiempo y raciones al pie. No queda una columna sobrante a la
  derecha del texto. La cubierta conserva su anchura completa.
- Desaparece la acción repetida «Ver receta»: foto y título enlazan a la ficha,
  con una flecha junto al título. El marcador de guardar queda sobre una base
  blanca en la esquina de la foto, con área de 44 px, nombre accesible y estado
  pulsado. Es hermano del enlace, nunca un botón anidado dentro de él.
- La fotografía lleva margen blanco de 8 px (6 en móvil), borde fino y sombra
  mínima. No se alteran los archivos ni se aplican filtros de color, saturación
  o desenfoque a la comida. El marco es tratamiento de interfaz, no retoque.
- El contenido usa el blanco `superficie` ya existente. El gris azulado se
  reserva para cabecera y pie, sin cambiar la paleta por otra. Acento y fuentes
  se conservan. Los tokens locales son una instantánea para esta maqueta;
  `globals.css` sigue siendo la fuente de verdad de la aplicación.
- Se elimina el bloque personal y su titular «Empecé esto por una persona
  concreta». No se sustituye por otra declaración del autor. Queda la firma.
- Se retira el rótulo visible «El cuaderno». Se conserva únicamente un título
  «Recetas» para lectores de pantalla. El buscador encabeza el listado, sin
  dejar una columna vacía. Al buscar o consultar guardadas,
  se oculta la presentación de la destacada y se muestran solo las filas que
  coinciden. Sin filtros, no se repite la destacada en el listado inferior.
- Guardar sigue siendo una demostración local y sincroniza los controles.

## Contenido y recursos

La selección procede de las recetas públicas consultadas en
`https://recetario-36ok.vercel.app/api/recetas` el 17 de septiembre de 2026:

- **Katsu curry de proteína vegetal**, publicada el 27 de agosto: 60 minutos,
  4 raciones. Su fotografía real se descarga de ImageKit y queda en
  `assets/katsu-curry.jpg`. Solo se aplica recorte de composición con CSS;
  no se retoca ni se sustituye por comida generada.
- **Guacamole casero**, publicada el 26 de agosto: 5 minutos. No tenía imagen
  de portada; la entrada del archivo es deliberadamente tipográfica.

La API también mostraba una publicación posterior, `arroz-con-quejas`, sin
fotografía ni preparación completa. No se ha incluido ni modificado. Por
eso esta maqueta es una **selección editorial**, no una representación literal
del último registro de producción. Antes de conectar la nueva portada a datos
reales debe resolverse esa publicación incompleta; no se propone ocultarla
mediante una regla arbitraria del diseño.

Logo y acuarela referencian los originales de `public/`. Las tres fuentes son
las ya utilizadas por la aplicación: Bricolage Grotesque, Instrument Sans y
Pinyon Script. Se incluyen sus archivos latinos locales y licencias OFL
obtenidas del repositorio oficial `google/fonts`, sin añadir dependencias.
No se carga Google Fonts ni ImageKit al abrir la maqueta.

## Límites explícitos

- Guardadas solo vive en memoria: recargar reinicia el estado. No se crean
  cookies, cuentas ni almacenamiento persistente y no se hacen peticiones.
- El clic normal en foto o título abre la ficha de demostración. Sin JavaScript
  o con clic modificado, el enlace público original sigue disponible. La ficha
  publicada no cambia. No se envían acciones de guardado a producción.
- Búsqueda solo incluye las dos recetas de esta propuesta; no consulta MongoDB.
- El pie no representa la lista legal definitiva. Se evita enlazar páginas
  locales todavía no desplegadas. «Escríbeme» abre el cliente de correo.
- No se han integrado autenticación, rutas Next.js, metadatos de publicación,
  políticas ni cambios en la app. Esto no certifica que la web esté lista
  para publicar.
- Las cantidades de ingredientes se escalan; los números escritos dentro de
  los pasos conservan el texto original. Un aviso aparece cuando se cambian
  raciones para no prometer que la narración se ha escalado también.
- La maqueta no solicita wake lock, no implementa gestos ni navegación de
  historial para los diálogos. Escape y botones cierran los diálogos nativos;
  foco, scroll y retorno requieren revisión en un navegador real.

## Contenido por completar y próximas ideas

1. Revisar el katsu antes de integrar: azúcar y vinagre aparecen en un paso,
   pero no en ingredientes; el prensado y marinado requieren comprobar si los
   60 minutos declarados representan el tiempo total. No se han corregido datos
   de producción. Los pasos conservan su texto; títulos y erratas de etiquetas
   se normalizan en la muestra. Los títulos de los tres pasos del guacamole
   se proponen para facilitar la lectura; no existían en el documento original.
2. Aportar una foto real del guacamole y fotos de pasos solo donde ayuden a
   reconocer una textura, un corte o un punto de cocción. No añadir huecos por
   ocupar espacio.
3. Diseñar acceso y cuenta con la misma cabecera, escala y estados. No inventar
   formularios que parezcan autenticar al usuario en esta maqueta.
4. Más adelante, agrupar recetas por una necesidad concreta cuando el archivo
   lo permita. Con dos recetas no conviene fingir colecciones abundantes.

La nota de conservación del guacamole no se amplía ni se muestra en esta
propuesta: su formulación sobre duración en nevera queda pendiente de revisión.

## Validación

Desde la raíz, con el entorno `recetario` activado:

```bash
node --check docs/diseno/portada.js
node --check docs/diseno/movimiento-portada.js
node --check docs/diseno/ficha.js
node --check docs/diseno/estado-cocina.js
node --check docs/diseno/recetas-demo.js
node --test docs/diseno/portada.test.mjs docs/diseno/ficha.test.mjs
git diff --check
```

Las veinticuatro pruebas pasan: referencias locales (incluida la cubierta móvil),
identificadores únicos, sintaxis CSS, fuentes, búsqueda, recuperación de vacíos,
guardado sincronizado, foco al ocultar una receta guardada, navegación a las
recetas y ausencia de red/persistencia. Se comprueba también que no hay botones
dentro de enlaces, que se eliminan los rótulos descartados y que el marco no
aplica filtros a la foto. También se prueban scroll pasivo,
parallax acotado, bucle de la banda, redimensionado y activación/desactivación
del movimiento reducido. La lógica se prueba con un DOM y APIs de ventana
simulados. Las fichas tienen pruebas del controlador sobre DOM simulado:
abrir ambas recetas, escalar, marcar, pasar a cocina, retomar, cambiar de
receta, guardar, terminar y reiniciar. **No es una prueba de navegador**.

La comprobación visual automática sigue pendiente: la política del navegador
bloqueó anteriormente la apertura de la URL local y no se ha reintentado
mediante otra vía. No se ha certificado el
renderizado a 320/390 px, el teclado, zoom al 200 % ni Safari real. La maqueta
incorpora esas anchuras para facilitar la revisión manual. Las pruebas de
lógica no certifican fluidez del movimiento, contraste sobre la imagen ni
ausencia de solapamientos.

Próxima revisión, antes de trasladar nada a la app:

1. A 390 px y en escritorio, ¿la cubierta recupera la identidad original y la
   transición a las recetas llega a tiempo? Probar scroll y «Recetas» en cabecera.
2. Buscar «limón», «tofu» y algo inexistente; guardar, abrir Guardadas y quitar
   la última. Repetir con teclado y foco visible.
3. Revisar 320 px, escritorio y zoom al 200 %: sin recortes, solapamientos ni
   controles inaccesibles. ¿El formato de foto con pie elimina el vacío anterior?
   ¿El marco mejora la integración sin competir con la comida? ¿Se reconoce el
   marcador de guardar, también sin hover?
   Comprobar movimiento reducido y teléfono real antes de integrar.
4. Revisar las fichas y el modo cocina: cambiar raciones, marcar dos ingredientes,
   avanzar un paso, salir y retomar. Probar ambas recetas, teclado, Escape y
   foco al cerrar. Aprobar esas vistas antes de trasladarlas a la aplicación.
