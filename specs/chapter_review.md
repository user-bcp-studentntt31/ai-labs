VEREDICTO: RECHAZADO

## Matriz criterio x dimensión

| Criterio de aceptación | Arquitectura | Persistencia | Implementación | Pruebas | Seguridad |
|---|---|---|---|---|---|
| **C1.** `findByCredentials` usa `PreparedStatement` para `username` y `password`, sin concatenarlos en el SQL. | El Arquitecto incorpora explícitamente este requisito. No se aporta una decisión de arquitectura adicional ni confirmación contra el código actual. | **Sin cobertura:** no se proporcionó un artefacto aprobado de Datos/Persistencia ni el esquema. El backend declara como supuesto `users(username, password)`. | El fragmento de `LegacyDatabase` usa `username = ? AND password = ?` y `setString(1, username)` / `setString(2, password)`. Evidencia estática, no confirmada en el repositorio. | La prueba de inyección cubre entradas en usuario y contraseña, pero no se ejecutó. No hay resultado de compilación ni de pruebas. | La revisión estática indica que el fragmento corregido está parametrizado. El informe de Seguridad dice que falta confirmar el archivo actual y ejecutar pruebas. |
| **C2.** `POST /auth/login` con `student` y `Workshop123!` responde 200 con `user.username` y `token`. | El Arquitecto define el método, ruta y respuesta esperada. | **Sin cobertura:** no se aportan esquema, datos de prueba ni configuración de persistencia que confirmen que el caso puede ejecutarse. | **Sin cobertura de la implementación del endpoint:** no se proporcionó el código de `AuthResource` ni su manejo de respuesta. | `AuthResourceTest.validCredentialsStillReturnUserAndToken` presenta las aserciones esperadas. **No ejecutado.** | El informe de Seguridad lo deja pendiente de ejecución; no se revisó el código del endpoint ni la emisión del token. |
| **C3.** Si usuario o contraseña contiene `' OR '1'='1`, responde 401 y no devuelve `token`. | El Arquitecto define ambas entradas, el 401 y la ausencia de token. | **Sin cobertura:** no hay evidencia de esquema o persistencia actual. | La consulta parametrizada del fragmento evita concatenar esas entradas. **Sin cobertura del mapeo HTTP:** el endpoint que convertiría el resultado en 401 no fue proporcionado. | `AuthResourceTest.injectionInUsernameOrPasswordIsRejectedWithoutToken` comprueba ambos campos y que no exista `token`. **No ejecutado.** | La revisión estática considera adecuada la parametrización del fragmento; la prueba y la presencia de ese código en el repositorio están pendientes de confirmar. |
| **C4.** `AuthResourceTest` incluye prueba de inyección y `mvn test` pasa desde `auth/`. | El Arquitecto incluye ambos requisitos. | N/A para el requisito de incluir y ejecutar pruebas; la configuración de base de datos requerida por las pruebas no está documentada. | Se presenta una prueba de inyección en el fragmento. La ruta declarada y el `package` no coinciden; no está confirmada como archivo actual del repositorio. | **No satisfecho como verificación:** el informe de Pruebas declara que no se ejecutó ningún comando. `mvn -Dtest=AuthResourceTest test` y `mvn test`, desde `auth/`, están pendientes. | El informe declara verificaciones no ejecutadas. El contexto del informe de Seguridad está truncado en su tabla final; no se presume el contenido faltante. |

## Observaciones

| ID | severidad | evidencia | responsable | cambio requerido | verificación |
|---|---|---|---|---|---|
| **OBS-01** | Alta — bloqueante para C1 | El fragmento usa SQL parametrizado, pero Pruebas y Seguridad no confirman que sea el archivo actual. La evidencia original del hallazgo se refiere a `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:32`. | Backend | Confirmar que el archivo vigente contiene el `PreparedStatement` con parámetros y que ninguna consulta de login concatena credenciales. | Revisar el archivo real y ejecutar las pruebas desde `auth/`; conservar el resultado. |
| **OBS-02** | Media — incompatibilidad estructural por aclarar | Se identifica `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java`, pero el fragmento declara `package pe.bcp.login.service`. Para `AuthResourceTest` se indica `auth/src/test/java/com/bcp/workshop/auth/AuthResourceTest.java`, con el mismo `package pe.bcp.login.service`. | Backend | Alinear rutas y declaraciones de paquete con la estructura real del módulo y sus imports; confirmar que la prueba corresponde al test objetivo. | Revisar el árbol del módulo e imports; compilar y ejecutar `AuthResourceTest` desde `auth/`. La discrepancia no prueba por sí sola un fallo de compilación, pero no está explicada. |
| **OBS-03** | Alta — bloqueante para C2 y C3 | No se proporcionó el código del recurso que implementa `POST /auth/login`; solo están el contrato del Arquitecto y las aserciones de prueba. | Backend | Aportar la implementación del endpoint y mostrar cómo produce 200 con el contrato esperado y 401 sin token ante credenciales rechazadas. | Inspeccionar el recurso y ejecutar pruebas de integración para ambos escenarios. |
| **OBS-04** | Alta — bloqueante para C4 | El informe de Pruebas dice “no probado en ejecución” y “Comandos ejecutados: ninguno”. `mvn test` no tiene resultado. | Pruebas / persona ejecutora | Ejecutar `mvn -Dtest=AuthResourceTest test` y `mvn test` desde `auth/`; registrar las salidas reales y resolver cualquier fallo. | Verificar las salidas conservadas y confirmar que corresponden al estado final del código. |
| **OBS-05** | Media — persistencia sin confirmar | El backend supone que existen `users(username, password)`. El Arquitecto indica que no se proporcionó esquema ni código actual para confirmar la firma. | Datos y persistencia | Confirmar el esquema, columnas y compatibilidad del acceso JDBC con la base y configuración del módulo. | Contrastar el esquema/migraciones reales y ejecutar la prueba contra la configuración usada por `auth/`. |
| **OBS-06** | Alta — asunto de seguridad abierto, no confirmado | Seguridad señala que el método compara `password = ?`, pero no se aportaron esquema ni flujo de almacenamiento para determinar si se guardan contraseñas en texto claro o hashes. El informe lo deja pendiente de revisión. | Seguridad y Backend; Datos y persistencia si corresponde | Revisar el ciclo de almacenamiento y verificación de contraseñas. Si se almacenan en texto claro, cambiarlo a un esquema apropiado de hash y actualizar el flujo afectado. | Inspeccionar esquema y registro/actualización de contraseñas; demostrar que no se persiste la contraseña original y probar login correcto e incorrecto. |
| **OBS-07** | Media — cobertura de seguridad incompleta | Seguridad deja pendientes la validación de entradas vacías, ausentes o extensas y el mapeo de `PersistenceException`; no se proporcionó el recurso HTTP para verificar el tratamiento de errores. | Backend y Seguridad | Revisar validación y respuestas de error para evitar respuestas no controladas o exposición de detalles internos. | Probar entradas inválidas y fallo de base de datos; verificar respuestas genéricas sin trazas, SQL, credenciales ni token. |

## Contratos incompatibles o sin confirmar

- **Ruta y método:** los fragmentos de prueba y la arquitectura coinciden en `POST /auth/login`. No se proporcionó el recurso real para confirmar su implementación.
- **Respuesta y errores HTTP:** las pruebas esperan 200 para credenciales válidas y 401 para inyección, sin `token` en este último caso. No se aportó el código que implementa esos códigos y respuestas; no se puede confirmar su correspondencia con el contrato.
- **Tabla y columnas:** la consulta del fragmento usa `users(username, password)`, pero el propio backend lo presenta como supuesto. No hay esquema o artefacto de persistencia que lo confirme.
- **Paquetes y rutas:** los archivos se presentan bajo `com/bcp/workshop/auth`, pero declaran `pe.bcp.login.service`. Debe aclararse y alinearse con la estructura real. No se afirma que esto cause necesariamente un error de compilación.
- **Capas hexagonales:** no se proporcionó una decisión de arquitectura ni suficiente código para verificar las capas o sus dependencias.
- La sección rotulada como **Desarrollador frontend** contiene código Java de backend; no constituye evidencia de una entrega frontend. El cambio descrito es de autenticación backend, por lo que frontend no aplica al alcance de estos criterios.

## Criterios sin cobertura y pruebas pendientes

- **C1:** hay evidencia estática en el fragmento, pero falta confirmar el código vigente y contrastarlo con el esquema real.
- **C2:** la prueba presenta las aserciones, pero faltan el código del endpoint y su ejecución.
- **C3:** la prueba cubre estáticamente inyección en ambos campos; faltan el código del endpoint y la ejecución.
- **C4:** no se ha ejecutado `mvn test` desde `auth/`; no se puede afirmar que compile o pase.
- Quedan pendientes los comandos propuestos por Pruebas: `mvn -Dtest=AuthResourceTest test` y `mvn test`, ambos desde `auth/`. **Comandos ejecutados: ninguno; resultados reales: no disponibles.**
- Seguridad también deja pendiente confirmar el almacenamiento de contraseñas y el manejo de entradas inválidas y errores de persistencia.
- El contexto recibido termina truncado durante la tabla final del informe de Seguridad. No se atribuye contenido a la parte faltante.

## Motivos del veredicto y correcciones concretas

Se **rechaza** porque no hay evidencia de ejecución de las pruebas requeridas, no se aportó la implementación actual del endpoint para verificar los contratos HTTP y la persistencia se basa en un esquema supuesto. Además, existe una discrepancia no explicada entre rutas y paquetes, y Seguridad dejó pendiente revisar el almacenamiento de contraseñas. La revisión estática favorable de la consulta parametrizada y de las aserciones de prueba no demuestra que el código esté integrado ni que las pruebas pasen.

Para volver a evaluar:

1. Confirmar y alinear rutas, paquetes, imports y esquema real de persistencia.
2. Aportar el recurso que implementa `POST /auth/login` y verificar su manejo de 200, 401 y ausencia de token ante rechazo.
3. Resolver la revisión de almacenamiento de contraseñas y las observaciones de manejo de entradas y errores.
4. Ejecutar y conservar los resultados de `mvn -Dtest=AuthResourceTest test` y `mvn test` desde `auth/`.
5. Obtener las aprobaciones humanas y la revisión de un compañero; este informe no las reemplaza.