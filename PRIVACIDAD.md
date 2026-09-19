# Privacidad — borrador pendiente de revisión

No publicar este documento como política definitiva ni usar el enlace de
contacto como sustituto de la información del registro. No constituye una
certificación legal. Los datos de identidad/contacto están confirmados; los
apartados marcados como pendientes requieren decisiones y comprobaciones.

Inventario técnico revisado el 19/09/2026 en
[docs/INVENTARIO-PRIVACIDAD.md](./docs/INVENTARIO-PRIVACIDAD.md): cookies,
almacenamiento local, colecciones, destinatarios y límites del borrado.
Correo y activación del segundo factor del administrador quedan aplazados;
el registro permanece cerrado. Este documento sigue sin publicarse.

## Identidad y contacto confirmados

Responsable: Alejandro Barreche Ruiz.
Correo: alex.barreche@gmail.com.
Sitio: Mi libro de recetas, blog personal sin finalidad comercial.

Estos datos se centralizan para la web en `src/lib/sitio.ts`. `/contacto`
ofrece un canal para dudas, incidencias y solicitudes sobre datos; no envía
correos automáticamente ni recopila datos mediante otro formulario.

## Texto base para completar

### Para qué se utilizan los datos

La cuenta permite acceder a recetas para lectores registrados y guardar
recetas favoritas. Se utilizan los datos necesarios para gestionar el acceso,
proteger la cuenta y atender las solicitudes que se envían al responsable.
Cuando se habilita el correo transaccional, se envían enlaces para confirmar
el correo y recuperar el acceso. No se utiliza como newsletter.

### Qué datos intervienen

- Cuenta: nombre, dirección de correo y contraseña almacenada mediante hash,
  no en texto claro; estado de verificación y rol de acceso.
- Sesión y seguridad: identificadores y fechas de creación/caducidad. El cambio
  de minimización deja IP y navegador a `null` en nuevas sesiones. No se ha
  probado creando sesiones en producción. Las anteriores no se han limpiado. El límite de intentos
  sigue utilizando IP y ruta, y los proveedores pueden conservar logs técnicos.
- Preferencias: referencias a las recetas guardadas.
- Segundo factor, si se activa: datos necesarios para TOTP y recuperación.
- Contacto: remitente, contenido y datos que se incluyan en el correo enviado.
- Navegación: datos técnicos que puedan tratar el alojamiento y la entrega de
  imágenes; las búsquedas forman parte de la URL. **Pendiente:** comprobar
  configuración/retención de logs y cookies autenticadas en HTTPS.
- Dispositivo: intención temporal de guardar tras acceder, avisos técnicos de
  sesión entre pestañas y, solo en administración, borradores locales del editor.
  Estos últimos no tienen caducidad automática ni se borran al cerrar sesión.
- Contenido editorial: textos, fotografías originales, posibles metadatos EXIF
  y referencias al autor o a quien sube la imagen.

### Bases jurídicas — pendientes de validar

Definir por separado la base aplicable a cuenta/guardadas, seguridad y
consultas por correo. Valorar la prestación del servicio solicitado para la
cuenta y documentar, si corresponde, la ponderación del interés legítimo en
seguridad o atención de consultas. No afirmar que todo se basa en consentimiento
ni añadir una casilla genérica de «acepto» como sustituto de este análisis.

### Conservación — pendiente de decidir e implementar

La aplicación permite al lector eliminar su cuenta y sus guardadas. Esto no
demuestra eliminación inmediata en backups, logs o proveedores.
El backup incluye todas las colecciones no internas, con datos de cuentas y
sesiones, además de originales de fotografías. El script no cifra el conjunto
ni elimina copias antiguas. Los avisos técnicos de Better Auth en almacenamiento
local tampoco tienen una caducidad definida.

Antes de publicar, fijar y comprobar plazos o criterios para cuentas activas e
inactivas, sesiones caducadas, verificaciones, contadores de intentos, correos
de contacto, registros técnicos y copias de seguridad. La caducidad de un token
no equivale a que se haya borrado físicamente el registro. Definir también cómo
se respetan las solicitudes de supresión si se restaura una copia antigua.

### Servicios que intervienen — configuración pendiente de comprobar

- Vercel: alojamiento de la web y ejecución de servidor.
- MongoDB Atlas: almacenamiento de recetas, cuentas, sesiones y guardadas.
- ImageKit: almacenamiento y entrega de imágenes.
- Google/Gmail: recepción de consultas en el correo de contacto facilitado.
- Resend: integración preparada para correo transaccional; no describirla
  como servicio activo hasta configurar y comprobar el envío.

Verificar entidades contratantes, condiciones aplicables, roles, regiones,
subencargados y garantías de transferencias internacionales cuando proceda.
No se ha completado la revisión de configuraciones y contratos reales. Usar proveedores
conocidos no demuestra por sí solo cumplimiento o alojamiento dentro de la UE.

### Solicitudes sobre tus datos

Puedes escribir a alex.barreche@gmail.com para solicitar acceso, rectificación,
supresión y, cuando corresponda, portabilidad, limitación u oposición.
También puedes presentar una reclamación ante la Agencia Española de
Protección de Datos (AEPD).

**Procedimiento pendiente de adoptar:** registrar la fecha y el alcance de la
solicitud, comprobar identidad de forma proporcionada, localizar los datos y
responder. El plazo general indicado por la AEPD es un mes, con posible
ampliación de otros dos por complejidad/número de solicitudes e información
al interesado. No pedir documentos de identidad de manera automática.

### Cookies y decisiones automatizadas

No hay publicidad, newsletter ni analítica de conversión añadidas por el
proyecto. Las seis respuestas HTTP anónimas comprobadas en producción no
emitieron cookies, lo que no sustituye revisar el navegador tras ejecutar
JavaScript. El inventario distingue cookies configuradas, observadas localmente
y funciones condicionales; falta contrastar el acceso HTTPS y el almacenamiento
del navegador. No activar TOTP para esta revisión ni añadir un banner por defecto.
No hay decisiones automatizadas de perfilado identificadas en el código
revisado; contrastarlo con la configuración efectiva de servicios externos.

## Criterio para publicar

1. Resolver bases jurídicas, conservación y configuración de proveedores.
2. Contrastar cookies y comportamiento con pruebas de navegador.
3. Revisar el texto con asesoramiento cualificado si corresponde.
4. Convertir el contenido aprobado en `/privacidad`, enlazarlo desde pie,
   contacto y registro, y añadir una primera capa informativa al crear cuenta.
5. Mantener fecha de revisión y actualizar cuando cambien los tratamientos.

Fuentes oficiales consultadas:
[información al recoger datos (AEPD)](https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/6-el-deber-de-informacion/FAQ-0217-que-informacion-debe-facilitarse-cuando-los-datos-se-obtengan-directamente-del-afectado),
[ejercicio de derechos (AEPD)](https://www.aepd.es/derechos-y-deberes/ejerce-tus-derechos),
[RGPD](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=es).
