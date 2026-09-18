# Recetario: dirección de diseño y recorrido completo

17 de septiembre de 2026. Propuesta para Alejandro; no modifica la aplicación
ni las decisiones de `CLAUDE.md`. Los cambios de producto requieren aprobación.

## La decisión principal

El [recorrido 04](./presentacion.html) extiende la portada 03 aceptada con
fichas, ingredientes escalables y modo cocina compartido. El logo es circular.
La portada conserva la cubierta
ilustrada y su scroll. Retira el botón de apertura, el rótulo «El cuaderno» y
el titular personal; las fotos llevan marco fino y datos al pie, sin la
columna vacía de la destacada.
Incluye selector de escritorio, 390 y 320 px y sigue separada de la aplicación.
Véase [dirección vigente de la propuesta, alcance y validación](./README.md).
La crítica inicial que sigue se conserva como contexto: la propuesta de
eliminar la cubierta quedó descartada tras revisarla con el autor.

**Entrar por un plato, quedarse por Alejandro, volver porque cocinar aquí resulta fácil.**

La web ya tiene material propio: ilustración, una historia personal, recetas
reales y un ritmo de publicación pequeño. Lo diluye con una presentación de
landing page: cubierta larga, promesas, dos entradas, marquesina y tarjetas
idénticas. No necesita más personalidad decorativa; necesita dejar que se vea
antes el contenido que solo puede aportar su autor.

No propongo convertirla en una revista de lujo, un catálogo comercial ni una
app con gamificación. Tampoco cambiar el gris azulado por el beige/terracota
de tantos supuestos rediseños «editoriales».

## Qué se ha revisado y qué no

- Código actual de portada, ficha, modo cocina, ingredientes, cuenta,
  guardadas, acceso, editor y componentes de movimiento; tokens y contexto.
- Portada local en Chrome de escritorio: cubierta, cabecera y árbol accesible.
  La instancia de desarrollo mostraba dos recetas visibles; no se extrapola
  ese inventario a producción.
- Repositorios de instrucciones de diseño, consultados como referencias,
  sin instalar scripts, hooks ni modificar instrucciones globales.
- No se han hecho entrevistas, mediciones de conversión ni tests con lectores.
  Las necesidades y emociones descritas abajo son hipótesis, no hallazgos de
  investigación. El acceso a DevTools falló: móvil se ha analizado en código,
  pero todavía requiere prueba visual y en dispositivo real.

Leyenda: **C** comprobado en código, **V** observado en escritorio, **H** hipótesis
que necesita validación. Los bocetos adjuntos representan estructura y
comportamiento propuestos, no un diseño visual terminado.

Abrir [recorrido-mobile.html](./recorrido-mobile.html) en un navegador. Muestra
tres láminas en escritorio y las apila en móvil. Raciones, ingredientes y pasos
funcionan como demostración; no simula acceso real ni almacenamiento. Su lógica
se ha comprobado con un DOM simulado, no con una prueba visual móvil completa.

## Herramientas y otro enfoque para trabajar

Puedo preparar prototipos HTML/CSS interactivos, variantes de composición,
mapas de recorridos, revisión de tokens y estados, y utilizar generación de
imágenes para explorar ilustración o dirección artística. Para esta web no
usaría imágenes generadas como prueba de cómo quedó un plato o un paso.

Chrome permite inspección visual cuando el control del navegador responde.
La emulación no sustituye pruebas de Safari/iPhone, teclado real, gestos o una
persona cocinando. No hay integración Figma activa; no presupongo acceso.

| Referencia | Qué tomaría | Qué no adoptaría automáticamente |
|---|---|---|
| [Impeccable](https://github.com/pbakaus/impeccable) | Separar contexto del producto, dirección visual, crítica, simplificación y adaptación; distinguir descubrir/leer/operar | Su instalador incorpora herramientas y hooks: revisar alcance y versión antes de instalar; una prohibición automática no decide si algo sirve aquí |
| [Frontend Design de Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | Partir del tema real y hacer que composición y contenido expliquen la página; crítica del primer resultado | Tratar todos los recursos frecuentes como malos: una tipografía, una línea o una etiqueta pueden estar justificadas |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Explicitar intención, expresividad, densidad y movimiento antes de dibujar | Sus valores iniciales de expresividad/movimiento y orientación a landing pages no encajan directamente con cocinar |

Mi elección: la estructura de trabajo de Impeccable, con un criterio propio
de Recetario. No apilar tres skills enteras ni instalar nada global por ahora.
Una instrucción puede orientar mi trabajo, pero no garantiza buen diseño:
hay que evaluar el resultado con contenido y tareas reales.

Las guías de crítica, investigación, accesibilidad y sistema de diseño de la
sesión se usaron como lentes de revisión. La consistencia sirve a la lectura
y al uso; no obliga a que portada, ficha y editor tengan la misma composición.

## Crítica del estado actual

| Hallazgo y evidencia | Consecuencia | Propuesta | Prioridad |
|---|---|---|---|
| C/V. Portada con cubierta de `160svh`, dos bloques y marquesina antes de la rejilla | Se pide atención antes de mostrar un plato; penaliza especialmente volver al sitio | La receta más reciente abre la portada. La ilustración firma la cabecera o el cierre, no bloquea el recorrido | Alta |
| C. «Lo último que hice» y explicación enlazan al mismo plato que la primera tarjeta | Navegación y contenido duplicados | Convertir ese espacio en la receta real; no repetirla inmediatamente debajo | Alta |
| C. Hay consultas `q`, pero no input/formulario de búsqueda visible en portada | Se puede buscar técnicamente, no descubrir cómo hacerlo | Búsqueda explícita por plato o ingrediente; conservarla al filtrar y al volver | Alta |
| C. Píldoras de categorías descartan `q`; el estado vacío dice «Pídenosla» sin acción vinculada | Se pierde contexto o se promete una salida inexistente | Filtros combinables y visibles; cero resultados ofrece editar búsqueda, quitar filtros o un contacto real | Alta |
| C. `minmax(320px,1fr)` dentro de una sección con padding | A 320 CSS px la columna mínima supera el ancho disponible; el recorte no arregla el layout | Columna fluida desde 320; probar títulos largos, zoom y categorías extensas | Alta |
| C. Raciones y marcas viven en IngredientesEscalables; ModoCocina recibe los valores originales | La misma receta puede mostrar cantidades distintas al cambiar de vista | Un único estado de preparación por receta compartido por ficha y modo cocina | Alta |
| C. Abrir modo cocina ejecuta `setActual(0)` | Salir y volver pierde el punto; H: interrupciones frecuentes al cocinar | Reanudar paso y raciones, con «Empezar de nuevo» explícito. Persistencia limitada y compatible con privacidad | Alta |
| C. Guardar sin sesión solo redirige y no guarda al regresar | H: se interpreta como acción hecha o se abandona al pedir cuenta | Conservar intención y confirmar después del acceso. Alternativa futura: guardado solo en dispositivo, explicando su límite | Alta |
| C. Cuenta reúne guardadas y ajustes; su acceso es una silueta | H: quien busca recetas guardadas puede no pensar en perfil | «Guardadas» como destino reconocible; ajustes secundarios. Evitar abrir una cuenta solo para mostrar un vacío sin salida | Media |
| C/V. Script, display, sans y mono; muchas mayúsculas espaciadas y metadatos minúsculos | Todo intenta tener carácter a la vez; datos útiles pierden legibilidad | Roles claros, reducir mono/mayúsculas, no añadir más fuentes. Marca expresiva, instrucciones sobrias | Media |
| C. Gradientes sobre todas las tarjetas, revelados, parallax y marquesina | Recursos distintos compiten; comida y texto comparten el mismo plano | Fotos limpias y títulos fuera cuando convenga; movimiento principalmente como respuesta a una acción | Media |
| C. «Quién cocina» tiene dos huecos y varias declaraciones de autenticidad | Se dice personal pero falta evidencia personal | Foto real o una nota breve con firma; no rellenar obligatoriamente dos bloques | Media |
| C. Número de receta calculado según lo visible para cada rol | «La receta 01» puede no ser la misma para todos; frágil como memoria del cuaderno | Retirar numeración decorativa o convertirla en dato editorial estable sin revelar contenido restringido | Media |
| C. «Sigue por aquí» selecciona las dos publicaciones más recientes | No demuestra relación culinaria entre recetas | Mantener como continuidad cronológica o seleccionar relaciones editoriales explícitas; no llamarlas recomendaciones personalizadas | Baja |

También hay que revisar mi incorporación reciente de Contacto: la página
envuelve `Logo` en otro `Link`, aunque `Logo` ya contiene un enlace. Es un
anidamiento incorrecto, no una cuestión de gusto. Al unificar cabeceras, el
contrato del componente debe distinguir marca visual de enlace navegable.

## Recorridos: seis situaciones, no un embudo comercial

| Situación | Intención y entrada | Fricción actual / riesgo | Experiencia que propongo | Cómo comprobarla |
|---|---|---|---|---|
| Primera visita | Enlace a portada de alguien conocido; H: curiosidad y poco compromiso | Mucha cubierta, ningún plato al principio | Plato protagonista, nombre, tiempo y fotografía; autor reconocible sin biografía introductoria | Mostrar cinco segundos y preguntar qué se puede hacer y qué cocinaría |
| Enlace directo | Llega de WhatsApp o buscador a una receta | Hero alto antes de cantidades; posible competencia en cabecera estrecha | Título, tiempo, raciones y acceso a ingredientes desde el primer tramo; nada obliga a pasar por portada | Encontrar cantidades y decidir si tiene tiempo sin abrir modo cocina |
| Volver a una conocida | Recuerda «la de tomate» o una favorita | Buscador ausente; guardadas detrás de cuenta | Buscar por ingrediente y reconocer por miniatura/título; regreso conserva filtros/posición | Localizar receta, entrar y volver sin reconstruir la búsqueda |
| Preparar | Dos personas en vez de cuatro; comprobar despensa | Cantidades y marcas aisladas del modo cocina | Raciones compartidas; distinguir «lo tengo preparado» de «paso terminado» | Cambiar raciones, marcar dos ingredientes y entrar/salir del modo sin diferencias |
| Cocinar | Móvil en encimera, distracciones, manos ocupadas | Controles superiores, reinicio del paso, ingredientes separados | Paso amplio, acción siguiente accesible, ingredientes consultables sin perder posición; salida clara | Interrumpir en paso 3, consultar ingredientes, volver y continuar |
| Publicar | Alejandro escribe, sube fotos y corrige desde móvil | Editor denso, datos editoriales/técnicos compiten; guardado puede fallar | Escritura primero; metadatos en segundo plano; estado de guardado visible; vista previa móvil antes de publicar | Crear borrador con foto, simular red lenta, reabrir y comprobar qué se guardó |

Tras cocinar no hace falta pedir valoración, crear una racha o captar un email.
La recompensa puede ser simplemente recordar dónde estaba la receta. Una nota
privada de «la próxima vez» es una hipótesis útil, no un requisito inicial.

## Tres direcciones, con una elección

1. **Cuaderno abierto — recomendada.** Receta reciente protagonista, archivo
   compacto, pequeñas huellas del autor. Se conserva ilustración y paleta,
   desaparece la larga antesala. Equilibra descubrimiento y regreso.
2. **Mesa de trabajo.** Índice, búsqueda y guardadas casi desde arriba;
   fotografía más pequeña. Muy eficaz para quien vuelve, menos íntima al entrar.
3. **Álbum personal.** Imágenes grandes, ritmo libre y notas dispersas.
   Expresiva, pero exige fotografías reales excelentes y puede dificultar
   comparar recetas. No la usaría como interfaz de cocina.

No mezclar las tres por miedo a elegir. Usar Cuaderno abierto para descubrir
y la sobriedad de Mesa de trabajo dentro de la receta y el editor.

## Nueva estructura y economía de palabras

### Portada

Cabecera breve → receta reciente grande → archivo de recetas anteriores →
una intervención personal corta → contacto y privacidad.

El archivo se adapta al inventario: con dos recetas, no fingir tres categorías
editoriales ni una plataforma inmensa. Con muchas, búsqueda y filtros ganan
peso. El bloque personal no necesita aparecer entre cada tarea.

| Hoy | En el diseño propuesto | Qué comunica sin explicarlo |
|---|---|---|
| «Lo último que hice» + un párrafo | Fecha real discreta, foto y nombre del plato protagonista | Orden cronológico y jerarquía |
| «La receta… entera: cantidades, pasos…» | Ingredientes y pasos visibles en la ficha | El propio contenido demuestra qué incluye |
| «Todas las recetas» como bloque y luego «Las recetas» | Archivo continuo con búsqueda y filtros | Continuidad; un único destino |
| Marquesina con tres promesas | Se retira | Menos competencia con el plato |
| «Nota personal» sobre cualquier nota | Nota del autor con tratamiento consistente o firma cuando aporta | Autoría sin un rótulo repetido |
| «Cocinar paso a paso» en cabecera cargada | «Cocinar» junto a «Ingredientes» en un contexto inequívoco | Acción directa; ampliar etiqueta si las pruebas lo necesitan |

No todo texto sobra. Conservar títulos semánticos aunque alguno sea solo para
lector de pantalla, nombres accesibles, estados de guardado, cantidades,
unidades, filtros activos, errores, privacidad y acciones destructivas.
Una foto grande significa protagonismo; **no demuestra por sí sola que sea
la última publicación**. Fecha y orden aportan esa información sin un párrafo.
Si en pruebas sigue siendo ambiguo, «Esta semana» es mejor que exigir adivinar.

### Ficha y modo cocina: una receta, dos densidades

- Ficha: primero reconocer y decidir; foto sin imponer una pantalla de espera.
  Tiempo, raciones, ingredientes y preparación con jerarquía legible.
- Modo cocina: el mismo estado, menos elementos. Paso actual y progreso real;
  consulta de ingredientes reversible; cantidades siempre coherentes.
- Una barra inferior contextual puede reunir Ingredientes / Cocinar en móvil.
  Dentro del modo pasa a Anterior / Siguiente; no mantener dos barras apiladas.
- En escritorio: ingredientes junto a pasos y navegación estable, sin simular
  un teléfono ampliado. El editor comparte lenguaje, no decoración de portada.

## Unificar y ampliar el estilo sin uniformar

| Sistema compartido | Regla propuesta | Variación permitida |
|---|---|---|
| Tipografía | Script para marca; display para platos; sans para lectura. Mono solo si mejora datos | Portada expresiva; pasos y editor tranquilos |
| Color | Conservar gris azulado, tinta y acento rojo anaranjado | Superficies funcionales para formularios; la fotografía aporta otros colores |
| Espaciado | Escala corta común; separar contenido por relaciones, no por bloques iguales | Más aire al descubrir, menos desplazamiento al cocinar |
| Acciones | Mismo verbo, icono y respuesta para guardar, volver y cocinar | Icono solo si es inequívoco; etiqueta visible cuando evita duda |
| Imágenes | Foto real, encuadre que explique el plato o el punto de cocción | Portada protagonista, miniatura de archivo, detalle técnico en paso |
| Movimiento | Mostrar cambio de estado, no retrasar lectura | Un gesto de identidad en portada; ninguno obligatorio durante preparación |
| Estados | Pendiente, confirmado, error y reintento definidos | Tono personal en contenido, claridad directa en fallos |

Elegir una sola «firma» fuerte: la ilustración y voz de Alejandro ya lo son.
No sumar pegatinas, post-its, manchas, cinta adhesiva o escritura manuscrita
por todas partes para demostrar que es un cuaderno.

## Qué ampliaría y qué no

**Primero:** búsqueda accesible, continuidad ficha/cocina, guardadas encontrables,
estado recuperable del editor, y una nota/foto personal real. Reducen fricción
sin exigir producir más contenido cada semana.

**Después, si hay material:** relaciones como «con lo que sobró» o «otra forma
de hacerlo», escritas y comprobadas por Alejandro; fotos del punto crítico
de una receta; pequeñas selecciones por ocasión cuando haya suficientes platos.
Cada selección necesita criterio, mantenimiento y una salida si queda vacía.

**Solo tras observar necesidad:** lista de compra, notas privadas, temporizador
asociado a un paso y funcionamiento sin conexión. Implican modelo/estado,
privacidad, accesibilidad y fiabilidad; no son adornos para llenar espacio.

**No añadiría ahora:** carruseles automáticos, recetas de relleno, contadores de
popularidad inventados, testimonios, newsletter, rachas, perfil público o un
panel estadístico del lector. No convertir el regalo en una obligación.

## Mobile: criterios concretos

- Probar 320, 360, 390 y 430 CSS px; horizontal y zoom. No ocultar overflow
  como solución a un elemento demasiado ancho.
- Primer tramo: identificar un plato y acceder a él. No medir calidad por
  cuántas pantallas se ha obligado a desplazar al visitante.
- Navegación discreta pero reconocible: reducir palabras no significa sustituir
  cada destino por un icono que exige aprendizaje.
- Objetivo de área táctil 44 px, separación entre acciones y soporte de foco;
  es un criterio de diseño, no una declaración de cumplimiento WCAG completo.
- Datos e instrucciones legibles sin depender de etiquetas diminutas. Títulos
  largos, 30 ingredientes y pasos de varios párrafos son casos de prueba.
- Barra inferior respeta safe-area, teclado y el contenido final. No tapa notas
  ni botones; no acumular header, filtros sticky y footer fijo.
- Gestos opcionales: siempre hay botones equivalentes. Evitar pasar de paso
  por un deslizamiento vertical o lateral accidental al leer.
- Reanudar tras WhatsApp, bloqueo y cambio de orientación. No prometer wake
  lock ni offline cuando el navegador o la conexión no lo permitan.
- Persistencia: versionar el progreso por receta, ofrecer reinicio, tratar
  modificaciones de pasos y no conservar contenido restringido tras salir.
- Fotografías dimensionadas; no cargar ambas portadas ni añadir un vídeo como
  dependencia del primer contenido útil. Medir en red lenta y móvil real.

## Metodología reproducible

| Fase | Trabajo | Entregable / condición de paso |
|---|---|---|
| 1. Inventario | Rutas, contenido, estados, componentes y autoridad de cada dato; mapa de duplicidades | Evidencia separada de hipótesis. Realizado a nivel de código; móvil visual pendiente |
| 2. Observar tareas | 5–6 personas variadas: nueva, recurrente, principiante, habitual; incluir necesidades de acceso. Alejandro prueba publicación | Registro de tareas, dudas y abandonos, sin preguntas dirigidas. Muestra cualitativa, no estadística |
| 3. Arquitectura | Qué necesita ver antes de actuar, qué se puede retirar y qué debe persistir | Un recorrido para cada situación de la tabla, incluidos error, vuelta y sesión caducada |
| 4. Divergir | Tres composiciones con el mismo contenido real; empezar en móvil | Elegir por intención y tareas, no «cuál parece más moderna» |
| 5. Prototipar | Portada → ficha → cocinar → reanudar; búsqueda → ficha → volver; guardar → acceso → confirmar | Prototipo sin backend primero, con límites declarados. Boceto móvil adjunto como comienzo |
| 6. Sistema | Extraer roles tipográficos, acciones, estados y espaciado del concepto elegido | Contrato breve, no colección interminable de componentes |
| 7. Probar y criticar | Una ronda de tareas, lista priorizada de problemas, corrección y comprobación posterior | Resolver todas las fricciones críticas; no pulido infinito |
| 8. Implementar | Cambios por recorrido, controles de visibilidad intactos, revisión móvil y regresiones | Preview revisable antes de producción; no sustituir interfaz y backend a la vez sin pruebas |

En cada prueba: escenario, primer intento sin ayuda, puntos de duda, errores,
recuperación y comentario final. Medir tiempo para localizar una receta,
cantidad de retrocesos y éxito de la tarea; no perseguir más permanencia.
Puede hacerse con sesiones voluntarias y notas, sin analítica comercial.

### Guion de prueba inicial

1. «Tienes media hora y tomate. ¿Qué prepararías?» No señalar el buscador.
2. «Esta receta es para cuatro; vais a ser dos. Prepárala.» Comprobar cantidades.
3. «Vas por el tercer paso y necesitas consultar un ingrediente.» Ver retorno.
4. Interrumpir y volver: ¿continúa donde esperaba? ¿Distingue reiniciar de salir?
5. «Quieres cocinarla el domingo.» Observar si guarda, comparte o usa su solución.
6. Volver al archivo: comprobar filtros/posición y reconocimiento visual.
7. Con Alejandro: foto de móvil, ingrediente largo, red fallida y publicación.

Objetivos del prototipo, no resultados actuales: reconocer el propósito tras
cinco segundos; localizar ingredientes sin ayuda; ninguna discrepancia de
raciones; ningún reinicio accidental; tareas completables con teclado y sin
gestos obligatorios. Una duda repetida cambia la propuesta, aunque nos guste.

## Instrucciones de proyecto que propondría adoptar

Este bloque es una propuesta, no modifica `AGENTS.md` ni instrucciones globales.

> Antes de diseñar, declara la tarea y el contexto de uso, no un adjetivo como
> «premium». Separa hechos, observaciones e hipótesis. Usa contenido real.
> Diseña el recorrido móvil antes de ampliar a escritorio. Propón composiciones
> distintas y elige una con motivos. Cada sección debe justificar qué permite
> entender o hacer; si repite otra, fusiónala o retírala. Antes de añadir texto,
> prueba jerarquía, orden y proximidad; no elimines nombres accesibles ni estados.
> No presupongas hero, tarjetas, carrusel, marquesina o animaciones. Conserva
> la identidad cuando aporta, aunque una lista anti-IA la prohíba. Comparte
> estado entre vistas de una misma tarea. Revisa vacío, error, regreso, teclado,
> red lenta, sesión y contenido largo. No llames probado a lo que solo has leído.

## Secuencia que recomiendo aprobar

1. **Portada sin antesala:** plato real protagonista, archivo, búsqueda y poda
   de bloques repetidos. Mantener identidad; retirar promesas redundantes.
2. **Cocinar sin perder contexto:** raciones, ingredientes y paso compartidos;
   navegación móvil contextual y reanudación.
3. **Volver y publicar:** guardadas reconocibles, intención de guardado y editor
   móvil recuperable. Perfil/seguridad permanecen disponibles, secundarios.
4. **Contenido distintivo:** fotos y notas reales; selecciones solo cuando el
   inventario y el tiempo del autor las sostengan.

La propuesta no reabre pagos, anuncios o newsletter ni relaja privacidad,
seguridad o filtrado por rol. Cuestiona convenciones visuales y de recorrido.
