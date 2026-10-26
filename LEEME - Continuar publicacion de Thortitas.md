# Continuar la publicación de Thortitas Fit Data

Fecha del traspaso: 25 de octubre de 2026.

## Solicitud del propietario

Publicar la aplicación existente en Sites para usarla desde móviles y otros ordenadores, conservando acceso privado para el propietario y Carla. El usuario ya ha autorizado la publicación y el acceso de Carla. Este paquete no es una web publicada ni crea un enlace de producción.

## Archivos del paquete

- `thortitas-fit-data-source.zip`: 130 archivos de código fuente, incluidos el manifiesto de Sites, lockfile y migración de datos.
- `thortitas-fit-data-deployment.tar.gz`: paquete de despliegue compilado correspondiente al código entregado. Mantenerlo sin cambios hasta guardarlo con Sites.
- Este documento de continuación. No se incluyen credenciales ni el estado local de las pruebas.

## Sitio que se debe conservar

- Project ID: `appgprj_6adb0cdf539481918c4da27f9ac47086`.
- Slug: `thortitas-fit-data`.
- Propietario: `eleazar.mr01@gmail.com`.
- Segunda cuenta: `carlaalcalm@gmail.com`, autorizada como visitante.
- Audiencia: `custom`, para ambas cuentas. No hacer pública la aplicación ni cambiar el público por defecto.
- Última consulta nativa: cero versiones y ningún enlace activo. Consultar de nuevo; este dato puede cambiar.
- Storage bindings: D1 `DB`, R2 `BUCKET`.

## Continuación con Sites

1. Confirmar que el chat dispone de las herramientas de Sites y leer su habilidad vigente. Si faltan, comunicarlo antes de afirmar que se publica.
2. Extraer el código y leer `.openai/hosting.json`. Reutilizar su `project_id`: no crear otro Site. Consultar el estado y la audiencia actuales.
3. Pedir nuevas credenciales temporales al servicio y mantenerlas solo en memoria. No trasladar credenciales de otros chats ni escribirlas en archivos.
4. Sincronizar la fuente mediante el flujo oficial de Sites. El commit realmente enviado debe corresponder al código del paquete. El helper de Sites debe devolver los datos verificados para el guardado; no inventar un commit ni guardar código que no se haya enviado.
5. Reutilizar las comprobaciones exitosas con código sin cambios. Si es necesario reconstruir, usar el helper y la versión de plugin del nuevo entorno; no mezclar un build nuevo con manifiestos de otro build.
6. Guardar la versión enviada con su paquete de despliegue y desplegarla conservando la audiencia personalizada. Usar las operaciones adecuadas a esa audiencia; no imponer acceso exclusivo al propietario eliminando a Carla.
7. Seguir el despliegue hasta un resultado terminal. Entregar únicamente la URL que Sites confirme como publicada.
8. Comprobar, cuando sea posible, acceso real, persistencia alojada y uso desde móvil. No afirmar verificaciones de cuentas o dispositivos que no se hayan realizado. Después del primer inicio de sesión, cada persona puede vincular la pareja mediante el código de Settings.

## Comprobaciones ya realizadas

La compilación, TypeScript y las 90 comprobaciones de API se aprobaron tanto en el entorno Windows original como en la revisión en nube del 25 de octubre. Se probaron identidades separadas, aislamiento, permisos de pareja, persistencia, sesiones, historial, nutrición y medios privados, entre otros. Las pruebas fueron locales; su estado ficticio se retiró. No se hicieron pruebas ni escrituras de datos de producción.

La revisión en nube conservó los 130 archivos de fuente idénticos al ZIP, instaló con lockfile congelado y completó de nuevo las comprobaciones. No hizo una nueva revisión visual. La revisión visual anterior incluyó móvil sin desbordamiento horizontal. Los builds nuevos pueden tener identificadores y nombres de chunks distintos; no se afirma igualdad binaria entre compilaciones realizadas en entornos diferentes.

## Límites observados en los entornos anteriores

En Codex local, el flujo de entrada al helper fue rechazado por la política efectiva `sandbox_approval=false`, incluso con entrada vacía sin credenciales y con permisos de red y escritura concedidos. No evitar ni modificar controles para sortear esa restricción.

En el chat en nube «Configurar PortEmr.github.io», las herramientas de Sites no estaban disponibles. Ese entorno no observó el fallo de entrada del entorno Windows; su bloqueo era la falta de conexión con Sites.

La configuración/publicación de un entorno de desarrollo no publica esta aplicación. El servidor local usa una identidad de prueba y no debe exponerse como alojamiento definitivo. GitHub Pages no ejecuta el backend y la autenticación de esta aplicación; usar otro alojamiento requeriría una adaptación adicional.
