# Tasks

Alcance: Issue #23 (H-AUTH-01), solo `auth/`. Las pruebas se ejecutan desde `auth/` (`mvn test`); desde la raíz, `python tools/lab.py test auth` ejecuta `mvn verify` en `auth/`. Archivos permitidos: `auth/src/test/java/com/bcp/workshop/auth/AuthResourceTest.java` y `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java`.

## 1. Línea base

- [x] 1.1 Ejecutar `mvn test` en `auth/` sin cambios y verificar que la prueba existente `logsInWithWorkshopUser` pasa (si falla por el entorno, registrar la causa antes de continuar).

## 2. Pruebas de caracterización (deben pasar con el código actual)

- [x] 2.1 Agregar a `AuthResourceTest` las pruebas de login válido de `trainer` (`Trainer123!`, `user.role` = `TRAINER`) y de forma de la respuesta 200 de `student` (`token` no vacío, `expiresIn` = 3600, `user.displayName`, `user.role`, `debug`); verificar con `mvn test` que pasan sin modificar código de producción.
- [x] 2.2 Agregar pruebas de rechazo para contraseña incorrecta (`student` / `wrong`), usuario inexistente (`nobody` / `x`, mensaje `Invalid user nobody or password`) y coincidencia exacta (`STUDENT` / `Workshop123!`), todas con 401 y sin `token`; verificar con `mvn test` que pasan.
- [x] 2.3 Agregar pruebas de validación 400 (usuario ausente o en blanco → `Username is required`; contraseña ausente o en blanco → `Password is required`) y de comilla simple legítima (`o'brien` / `x` → 401, sin `token`, sin 500); verificar con `mvn test` que pasan.
- [x] 2.4 Agregar la guarda de regresión del Issue solo en usuario (`' OR '1'='1` / `x` → 401, sin `token`); verificar con `mvn test` que pasa con el código actual.

## 3. Pruebas de inyección (deben fallar antes del arreglo)

- [x] 3.1 Agregar las pruebas de inyección: contraseña `' OR '1'='1` con usuario `student`, usuario `' OR '1'='1' --` con contraseña `x`, y el payload en ambos campos; cada una espera 401 y ausencia de `token`.
- [x] 3.2 Ejecutar `mvn test` y verificar que exactamente esas tres pruebas fallan porque la respuesta es 200 con `token` (evidencia de la falla); registrar el resultado y confirmar que las demás pruebas de los grupos 1 y 2 siguen pasando.

## 4. Corrección

- [x] 4.1 En `LegacyDatabase.findByCredentials`, reemplazar la concatenación y el `Statement` por una consulta con marcadores de posición y `PreparedStatement`, enlazando `username` y `password`; conservar la proyección, el mapeo a `UserRecord`, el valor `null` si no hay coincidencia y el manejo de excepciones existente. No modificar `AuthResource`, `LegacyTokenUtil`, `pom.xml` ni configuración.
- [x] 4.2 Ejecutar `mvn test` en `auth/` y verificar que todas las pruebas pasan, incluidas las tres de inyección del 3.1; confirmar con una búsqueda en `LegacyDatabase.java` que ningún valor de entrada se concatena en SQL.

## 5. Verificación de calidad

- [x] 5.1 Ejecutar `python tools/lab.py test auth` desde la raíz (`mvn verify`) y verificar que termina sin errores y genera el reporte JaCoCo.
- [x] 5.2 Revisar el reporte JaCoCo (`auth/target/site/jacoco`) y verificar que `findByCredentials` queda cubierto por los caminos de coincidencia y no coincidencia (meta: 85 % o más del código modificado).
- [ ] 5.3 Revisar `git diff` desde la raíz y verificar que solo cambiaron `AuthResourceTest.java` y `LegacyDatabase.java` (más las marcas de `tasks.md`), sin exclusiones de CodeQL, Dependency Review ni JaCoCo.
- [x] 5.4 Ejecutar `openspec validate "parameterize-auth-login" --type change` y verificar que el cambio sigue siendo válido.
