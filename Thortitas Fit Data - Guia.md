# Thortitas Fit Data

Aplicación implementada en inglés, con diseño oscuro y verde y una interfaz adaptada a móvil y escritorio.

Incluye rutinas configurables, 117 ejercicios, registro de series con resultados anteriores, cardio, historial, gráficos, pasos, peso, objetivos, retos, feed privado, recetas, fotos y exportación. El servidor utiliza autenticación, base de datos y almacenamiento de archivos de Sites.

Las cuatro rutinas iniciales quedan vacías para introducir vuestros programas reales. No se conservan estadísticas personales ficticias.

## Verificación completada

- 90 comprobaciones del servidor superadas: persistencia, separación de cuentas, lectura compartida con la pareja, edición exclusiva del propietario, validación, pasos sin duplicados, objetivos, retos, comentarios, comidas, fotos privadas y exportación.
- Pruebas de interfaz superadas: guardar una rutina y una sesión, recargar y recuperar los datos, repetir un ejercicio desde otra rutina y ver la marca anterior, completar series explícitamente, corregir el historial y recalcular gráficos.
- Comprobado que introducir pasos dos veces para la misma fecha actualiza un único registro. Verificados los valores manuales de una comida, me gusta, comentarios y recetas guardadas.
- Corregido y verificado el orden de dos sesiones del mismo día. El historial y los gráficos usan la fecha y la hora de creación; una edición posterior no altera su orden.
- Diseño revisado a 390 píxeles sin desplazamiento horizontal en las pantallas principales y el registro de series.
- Compilación final y comprobación de tipos superadas.

Las pruebas usaron únicamente la base local y cuentas ficticias autorizadas. Se eliminaron las tres cuentas de prueba, todos sus registros, la foto de prueba y los cinco registros creados desde la interfaz. La rutina original Upper Body 1 volvió a su estructura vacía. La comprobación final confirmó cero registros de prueba pendientes, cero fotos de prueba y cero errores de integridad. Ningún dato de prueba se copió a producción.

## Archivos entregados

- thortitas-fit-data-source.zip: código completo, configuración del proyecto privado e instrucciones de desarrollo en README.md.
- thortitas-fit-data-deployment.tar.gz: versión compilada actualizada con la corrección del historial.
- thortitas-fit-data-preview.jpg: captura del panel después de limpiar los ejemplos, con la cuenta local de pruebas Seedy.
- thortitas-fit-data-verification.json: resultados de comprobaciones y limpieza.

## Publicación y acceso — actualización del 24 de octubre de 2026

Carla (carlaalcalm@gmail.com) ya está autorizada como visitante externa. El modo de acceso sigue siendo privado, restringido al propietario y a Carla; no se ha hecho público.

Las credenciales nuevas ya llegan con una caducidad válida. Se ha encontrado además un fallo de conexión en el componente Schannel de Windows; la conexión desde el entorno de ejecución funciona usando OpenSSL con verificación de certificados activada.

Sin embargo, la política de esta sesión rechaza la entrada interactiva requerida por la herramienta oficial de sincronización y no permite solicitar la aprobación de ejecución correspondiente. La alternativa con entrada directa mediante el entorno de JavaScript no consigue conectarse al repositorio. No se han eludido las restricciones ni la verificación de certificados.

El proyecto sigue sin una versión publicada y sin un enlace utilizable. El código completo y el paquete probado se conservan para publicar cuando la sincronización pueda ejecutarse en un entorno compatible.

Cuando el sitio esté publicado, cada persona deberá entrar con su cuenta de ChatGPT. Después podréis vincular los perfiles mediante el código de Settings. La autorización de acceso a Carla no sustituye ese vínculo dentro de la aplicación.

La autenticación con dos cuentas reales, la persistencia en producción y la instalación en pantalla de inicio quedan pendientes de verificar tras el despliegue. Las notificaciones son internas; no se ha implementado push ni sincronización sin conexión.
