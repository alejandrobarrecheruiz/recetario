# Privacidad — borrador pendiente de revisión

No publicar este documento como política definitiva ni usar el enlace de
contacto como sustituto de la información del registro. No constituye una
certificación legal. Los datos de identidad/contacto están confirmados; los
apartados marcados como pendientes requieren decisiones y comprobaciones.

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
- Sesión y seguridad: identificadores, fechas de creación/caducidad y datos
  técnicos de acceso que registra la autenticación, como IP y navegador.
- Preferencias: referencias a las recetas guardadas.
- Segundo factor, si se activa: datos necesarios para TOTP y recuperación.
- Contacto: remitente, contenido y datos que se incluyan en el correo enviado.
- Navegación: datos técnicos que puedan tratar el alojamiento y la entrega de
  imágenes. **Pendiente:** inventariar exactamente logs y cookies efectivos.

### Bases jurídicas — pendientes de validar

Definir por separado la base aplicable a cuenta/guardadas, seguridad y
consultas por correo. Valorar la prestación del servicio solicitado para la
cuenta y documentar, si corresponde, la ponderación del interés legítimo en
seguridad o atención de consultas. No afirmar que todo se basa en consentimiento
ni añadir una casilla genérica de «acepto» como sustituto de este análisis.

### Conservación — pendiente de decidir e implementar

La aplicación permite al lector eliminar su cuenta y sus guardadas. Esto no
demuestra eliminación inmediata en backups, logs o proveedores.

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
No se han inspeccionado los paneles ni contratos reales. Usar proveedores
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
proyecto. Antes de describir todas las cookies como necesarias, comprobar
nombres, finalidades y duraciones en navegación anónima, acceso y TOTP.
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
