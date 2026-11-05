# Informe de seguridad — H-AUTH-01

**Componente:** `auth`  
**Alcance:** autenticación mediante `POST /auth/login` y consulta de credenciales.  
**Base de la revisión:** contexto e fragmentos proporcionados; no se inspeccionó el repositorio ni se ejecutaron comandos.  
**Conclusión:** el código presentado muestra una corrección estática adecuada para la inyección SQL. No es posible confirmar que ese código esté en el repositorio actual, que compile o que las pruebas pasen. La revisión de autorización sobre recursos, almacenamiento de contraseñas y configuración del token queda limitada por la falta de código y configuración pertinentes.

## Hallazgos y riesgos

### 1. Inyección SQL en la consulta de credenciales

**Severidad:** alta en la implementación original.  
**Estado:** corregida en el fragmento presentado; pendiente de verificar en el repositorio y en ejecución.

- **Ubicación:** `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java`, `findByCredentials`. El contexto identifica la evidencia original en `LegacyDatabase.java:32`. No se proporcionaron números de línea para el fragmento actualizado.
- **Evidencia:** el hallazgo de origen indica que la consulta concatenaba `username` y `password`, lo que permitía alterar el SQL. En cambio, el fragmento actualizado usa `username = ? AND password = ?` y asigna los valores con `statement.setString(1, username)` y `statement.setString(2, password)`.
- **Impacto:** con la implementación vulnerable, una entrada manipulada podría cambiar la consulta y permitir autenticación no autorizada, con posible emisión de un token.
- **Corrección concreta:** mantener la consulta parametrizada y no concatenar valores de usuario o contraseña en el SQL. La corrección aparece en el fragmento suministrado, pero no se ha confirmado en el árbol actual.
- **Comprobación reproducible pendiente:** desde `auth/`, ejecutar `mvn -Dtest=AuthResourceTest test` y `mvn test`. La prueba mostrada envía `' OR '1'='1` como usuario y como contraseña, y espera `401` sin la clave `token`. También debe revisarse el archivo real para confirmar que no haya otra consulta de login construida mediante concatenación.
- **Resultado real:** no ejecutado.

### 2. Posible comparación con contraseña sin hash

**Severidad:** potencialmente alta; no confirmada con la evidencia disponible.  
**Estado:** pendiente de revisar el almacenamiento y el flujo completo de autenticación.

- **Ubicación:** `LegacyDatabase.findByCredentials`, en la asignación `statement.setString(2, password)` y el predicado SQL `password = ?`.
- **Evidencia:** el fragmento compara directamente el valor recibido con la columna `password`. No se muestra una transformación ni una verificación de hash en este método. No se proporcionaron el esquema, el código que llama al método ni el proceso de almacenamiento de contraseñas.
- **Impacto:** si la columna contiene contraseñas en texto claro, una exposición de la base de datos revelaría las credenciales de los usuarios. La evidencia disponible no permite confirmar que ese sea el caso.
- **Corrección concreta:** verificar la contraseña mediante un hash de contraseñas adecuado —por ejemplo, Argon2id, bcrypt o PBKDF2— almacenado con su salt y parámetros. Recuperar el hash por nombre de usuario y comprobarlo en la aplicación; no comparar la contraseña recibida directamente con una columna que contenga el valor original.
- **Comprobación reproducible pendiente:** inspeccionar el esquema y el flujo de registro/actualización de contraseñas; comprobar que la base de datos solo almacena hashes; probar un login correcto y uno incorrecto contra esos hashes, y confirmar que la contraseña original no se persiste ni se registra en logs.
- **Resultado real:** pendiente; no se proporcionó evidencia sobre almacenamiento.

### 3. Autorización para acceder a recursos de otras personas

**Estado:** no evaluable en este alcance; no se confirma una vulnerabilidad.

- **Evidencia:** los fragmentos cubren la búsqueda de credenciales y el login. No se proporcionaron endpoints que consulten o modifiquen recursos de usuarios, ni la lógica de autorización que valida la identidad del token frente al propietario del recurso.
- **Impacto potencial:** si otros endpoints aceptan un identificador de recurso sin comprobar que pertenece al usuario autenticado, podría producirse acceso entre cuentas. No hay evidencia suficiente para afirmar que ocurra.
- **Corrección concreta:** en cada endpoint que acceda a recursos de usuario, derivar la identidad del sujeto desde un token validado y comprobar del lado servidor que el recurso pertenece a ese sujeto o que el usuario tiene un permiso explícito.
- **Comprobación reproducible pendiente:** cuando se disponga de esos endpoints, crear dos usuarios y comprobar que el token del primero no permite leer ni modificar los recursos del segundo, incluso cambiando identificadores en la solicitud.
- **Resultado real:** no evaluado; endpoints y lógica no proporcionados.

### 4. Validación de entradas y manejo de errores

**Estado:** cobertura incompleta; no se confirma una vulnerabilidad adicional.

- **Ubicación:** `LegacyDatabase.findByCredentials`; el método recibe `username` y `password` sin validación visible. No se proporcionó el código de `POST /auth/login`, por lo que la validación podría estar en otra capa.
- **Evidencia:** el fragmento muestra parametrización SQL, que mitiga la inyección, pero no muestra límites de longitud ni tratamiento de valores vacíos, nulos o ausentes. También convierte una `SQLException` en una `PersistenceException` con un mensaje genérico, pero no se mostró el mapeo de excepciones HTTP.
- **Impacto potencial:** entradas excesivamente grandes o inválidas podrían causar errores no controlados o consumo innecesario de recursos. Si la respuesta HTTP expone causas o trazas internas, podría filtrar detalles de la base de datos. No se puede confirmar ninguno de esos comportamientos con los fragmentos disponibles.
- **Corrección concreta:** validar campos requeridos y límites de longitud en la capa HTTP; responder con errores genéricos sin incluir SQL, trazas ni datos internos; registrar detalles técnicos solo en logs protegidos.
- **Comprobación reproducible pendiente:** probar campos ausentes, vacíos y excesivamente largos; verificar respuestas controladas y la ausencia de detalles internos. Revisar además el mapeo de `PersistenceException`.
- **Resultado real:** pendiente.

## Secretos y datos sensibles

- No se proporcionó configuración de TLS, firma, expiración o validación del token; no es posible revisarla.
- El token aparece como salida esperada para un login válido y la prueba propuesta comprueba que no aparezca en la respuesta de inyección. Esa prueba no se ha ejecutado.
- `Workshop123!` figura en el fragmento de prueba como credencial del caso válido. No hay evidencia para determinar si corresponde solo a datos de prueba o si se reutiliza fuera de pruebas; se debe confirmar que no sea una credencial de producción.
- No se proporcionaron logs ni configuración de respuestas de error para comprobar si se exponen contraseñas, tokens o detalles de base de datos.

## Verificaciones y criterios de aceptación

**Verificaciones ejecutadas:** ninguna. La revisión de los fragmentos es estática; no se ejecutaron herramientas ni comandos y no se accedió a los archivos actuales.

| Criterio | Estado |
|---|---|
| `findByCredentials` usa parámetros y no concatena credenciales en el SQL | **Aparece satisfecho en el fragmento proporcionado; pendiente de confirmar en el archivo actual.** |
| Credenciales válidas responden `200` con `user.username` y `token` | **Pendiente de ejecución.** |
| La inyección en usuario y contraseña responde `401` sin `token` | **La prueba está presente en el fragmento; pendiente de ejecución.** |
| `AuthResourceTest` incluye una prueba de inyección | **Aparece en el fragmento; pendiente de confirmar y ejecutar contra el repositorio actual.** |
| `mvn test` pasa desde `auth/` | **Pendiente; no ejecutado.** |

Para reproducir las comprobaciones propuestas, ejecutar desde `auth/`:

```bash
mvn -Dtest=AuthResourceTest test
mvn test
```

Los fragmentos muestran rutas bajo `com/bcp/workshop/auth`, pero declaran `package pe.bcp.login.service`. No se puede determinar con la información disponible si esa diferencia es intencional o si afecta la integración. Conviene contrastar la ruta, el paquete y la configuración del proyecto al ejecutar las pruebas.

**Conclusión final:** la solución presentada usa correctamente `PreparedStatement` para evitar que las credenciales alteren el SQL. El riesgo de inyección se considera **corregido en el fragmento**, pero la corrección y los criterios de aceptación siguen **sin verificarse en el repositorio ni en ejecución**. La seguridad del almacenamiento de contraseñas, la autorización sobre recursos de otros usuarios y la configuración del token requieren evidencia adicional.