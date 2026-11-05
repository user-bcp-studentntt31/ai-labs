# Design

## Context

Motivación y requisitos: ver `proposal.md` y `specs/user-auth/spec.md` (Issue #23, hallazgo H-AUTH-01). Este documento solo describe el *cómo*.

Estado actual observado en `auth/` (Quarkus 3.27, Java 21, SQLite vía `sqlite-jdbc`):

- `POST /auth/login` está en `AuthResource.login`. Valida cuerpo/usuario/contraseña (400), consulta la base de datos y, si hay usuario, emite el token legado y responde 200; si no, responde 401.
- `LegacyDatabase.findByCredentials` construye el SQL concatenando `username` y `password` dentro de un `Statement`. Es el único punto vulnerable. Cualquier excepción se captura, se imprime y se devuelve `null` (→ 401 en el recurso).
- La tabla `legacy_users` ya existe con `UNIQUE(username)`; el esquema, el seed (`student`, `trainer`) y la URL (`AUTH_DB_URL`) no cambian.
- `docs/ENDPOINTS.md` documenta solo `api/`; no define `/auth/login`. La baseline de comportamiento de este diseño se deriva del código actual de `AuthResource` y de la prueba existente `AuthResourceTest`, no de un contrato previamente acordado.
- Dato relevante para las pruebas: con la consulta actual, `' OR '1'='1` **solo en el usuario** y con contraseña incorrecta devuelve 401, porque `AND` precede a `OR` (`username='' OR ('1'='1' AND password='x')`). Las entradas que hoy sí explotan la falla son, por ejemplo, la contraseña `' OR '1'='1` con un usuario existente, o un usuario con comentario SQL (`' OR '1'='1' --`) con cualquier contraseña. Las pruebas deben cubrir estos casos para que fallen antes del arreglo.

## Goals / Non-Goals

**Goals:**

- Que `username` y `password` lleguen a la base de datos como valores enlazados (parámetros), nunca como parte del texto SQL.
- Mantener sin cambios el resultado observable del login válido y de las credenciales inválidas (ver contratos protegidos).
- Dejar pruebas automatizadas que fallen con el código vulnerable y pasen con el corregido, y que caractericen el comportamiento preservado.

**Non-Goals:**

- Hashear contraseñas, cambiar el almacenamiento de credenciales, o cambiar formato, secreto o expiración del token legado.
- Refactorizar `AuthResource` (anidamiento, capas API/servicio/repositorio, constantes como `3600`) o el manejo de errores/log de `LegacyDatabase`: son cambios separados y revisables según `AGENTS.md`.
- Cambiar mensajes de error, el campo `debug`, CORS, health ni dependencias.
- Tocar `api/` o `web/`; no se verifican ni modifican sus consumidores porque el contrato de `/auth/login` no cambia.

## Contratos protegidos

Deben quedar idénticos antes y después del cambio (verificados por las pruebas de caracterización):

| Elemento | Comportamiento a preservar |
|---|---|
| Ruta y método | `POST /auth/login`, `application/json` de entrada y salida. |
| Request | `username`, `password`; `client` y campos desconocidos se aceptan e ignoran. Los valores no se recortan ni normalizan antes de la consulta (el `trim` solo se usa para detectar vacíos). |
| 200 | `token` (no vacío, formato Base64 legado), `expiresIn` = 3600, `user.username`, `user.displayName` (HTML-escapado), `user.role`, `debug` = `authenticated-with-legacy-flow`. |
| 400 | `{"message": "Username is required"}` / `{"message": "Password is required"}` ante usuario o contraseña ausentes o en blanco. |
| 401 | `{"message": "Invalid user <username> or password"}`, sin `token`. Aplica a contraseña incorrecta, usuario inexistente y entradas con sintaxis SQL. |
| Semántica de coincidencia | Igualdad exacta de usuario y contraseña (misma comparación `=` de SQLite, sensible a mayúsculas) sobre los usuarios sembrados. |
| Errores internos | Una falla de base de datos sigue produciendo `null` → 401, no 500 ni detalle de la excepción. |
| Fuera del código | Esquema `legacy_users`, seed, `AUTH_DB_URL`, `application.properties`, `pom.xml`. |

El único cambio observable intencionado: las entradas que hoy autentican por inyección pasan a responder 401 sin `token`.

## Componentes afectados

| Componente | Cambio |
|---|---|
| `auth/.../LegacyDatabase.java` (`findByCredentials`) | Reemplazar la concatenación y el `Statement` por una consulta con marcadores de posición y `PreparedStatement`, con `username` y `password` enlazados. Misma proyección (`id, username, display_name, role`), mismo mapeo a `UserRecord` y mismo manejo de excepciones. |
| `auth/src/test/.../AuthResourceTest.java` | Agregar pruebas de caracterización e inyección (ver más abajo). |
| `AuthResource`, `LegacyTokenUtil`, `LoginRequest`, `UserRecord`, `application.properties`, `pom.xml` | Sin cambios. |

## Decisions

### 1. Consulta parametrizada con `PreparedStatement`

La consulta conserva su forma y semántica; solo cambia cómo se entregan los valores. Es el control que exige el Issue (criterio 1) y elimina la clase de falla en su origen.

Alternativas consideradas:

- **Escapar o sanear comillas / lista negra de patrones** (`'`, `--`, `OR`): frágil, incompleta y propensa a eludirse; además cambiaría qué contraseñas legítimas son válidas. Descartada.
- **Rechazar en `AuthResource` entradas con comillas o palabras SQL**: altera el contrato (contraseñas válidas con `'` dejarían de funcionar) y deja el SQL concatenado vulnerable a otros llamadores. Descartada.
- **Consultar solo por `username` y comparar la contraseña en Java**: también es seguro, pero cambia la semántica de comparación y mueve lógica de autenticación; encaja mejor en un cambio futuro de hash de contraseñas. Descartada para este alcance.
- **ORM o librería de acceso a datos (Hibernate/Panache, jOOQ)**: introduce dependencia nueva y rediseño no justificado para un método. Descartada.

### 2. Cambio mínimo y localizado en un método

Se corrige `findByCredentials` y se deja `AuthResource` intacto, de modo que el diff sea pequeño y fácil de revisar y que el resto del contrato no se pueda alterar por accidente. Si el método modificado necesita una constante con nombre para el SQL, se extrae solo ese literal (regla 12 de `AGENTS.md`); no se amplía a otras refactorizaciones.

### 3. Pruebas de integración vía HTTP (`@QuarkusTest`)

Se prueba el comportamiento observable de `POST /auth/login` con RestAssured, igual que la prueba existente, en lugar de pruebas unitarias del SQL. Así los escenarios de la spec son las pruebas, y se detecta cualquier regresión de contrato. Las pruebas no cambian la base de datos (solo leen), por lo que pueden compartir `./data/workshop.db`.

## Estrategia incremental

Cada paso es revisable por separado y deja la suite verde, salvo el paso 2, que debe fallar por la razón esperada.

1. **Caracterización (pasa con el código actual).** Agregar pruebas que fijan el comportamiento a preservar, sin tocar código de producción.
2. **Pruebas de inyección (deben fallar antes del arreglo).** Agregar los casos de explotación y confirmar que fallan porque devuelven 200 con `token`, no por un error de prueba.
3. **Corrección.** Reemplazar el SQL concatenado por la consulta parametrizada en `findByCredentials`. Ejecutar `mvn test` desde `auth/` (alias desde la raíz: `python tools/lab.py test auth`) y comprobar que todo pasa.
4. **Verificación de calidad.** Confirmar con JaCoCo que el código modificado alcanza el 85 % o más, revisar que no quede concatenación de entradas en SQL y que no se haya silenciado ningún chequeo (CodeQL, Dependency Review, JaCoCo).

## Pruebas de caracterización necesarias antes de modificar

Pasos 1 y 2, en `AuthResourceTest`. Cada una cubre un escenario de la spec o un contrato protegido.

| Prueba | Entrada | Resultado esperado | Antes del arreglo |
|---|---|---|---|
| Login válido `student` (ya existe) | `student` / `Workshop123!` | 200, `user.username`, `token` | Pasa |
| Login válido `trainer` | `trainer` / `Trainer123!` | 200, `user.role` = `TRAINER` | Pasa |
| Forma de la respuesta 200 | `student` válido | `expiresIn` = 3600, `user.displayName`, `user.role`, `debug`, `token` no vacío | Pasa |
| Contraseña incorrecta | `student` / `wrong` | 401, sin `token` | Pasa |
| Usuario inexistente | `nobody` / `x` | 401, sin `token`, mensaje `Invalid user nobody or password` | Pasa |
| Coincidencia exacta (mayúsculas) | `STUDENT` / `Workshop123!` | 401, sin `token` | Pasa |
| Usuario ausente / contraseña ausente o en blanco | Campos omitidos o `"  "` | 400 con el mensaje correspondiente | Pasa |
| Comilla simple legítima en un valor | `o'brien` / `x` | 401, sin `token`, sin 500 | Pasa |
| Inyección en contraseña | `student` / `' OR '1'='1` | 401, sin `token` | **Falla (200)** |
| Inyección en usuario con comentario | `' OR '1'='1' --` / `x` | 401, sin `token` | **Falla (200)** |
| Payload del Issue solo en usuario | `' OR '1'='1` / `x` | 401, sin `token` | Pasa (guarda de regresión) |
| Payload en ambos campos | `' OR '1'='1` / `' OR '1'='1` | 401, sin `token` | **Falla (200)** |

Las pruebas que hoy pasan sirven como red de seguridad y deben seguir pasando tras el cambio; las que hoy fallan son la evidencia de que el arreglo cierra la falla.

## Risks / Trade-offs

- **Diferencia sutil de coincidencia** (afinidad de tipos, mayúsculas, espacios) al pasar de literal a parámetro → Mitigación: ambos usan `=` sobre columnas `TEXT` con el mismo collation binario; las pruebas de caracterización de usuarios válidos y de mayúsculas/espacios detectarían un cambio.
- **Entradas con comillas dejan de producir un error SQL silenciado** y pasan a ser una simple no coincidencia → Mitigación: el resultado observable sigue siendo 401; se cubre con la prueba de `o'brien`.
- **Otras debilidades en el mismo flujo** (contraseñas en texto plano, token Base64 con secreto fijo en código, mensaje 401 que refleja el usuario, `debug` en la respuesta, excepciones tragadas) quedan sin corregir → Mitigación: están fuera del alcance del Issue y se registran como hallazgos o cambios separados; este cambio no las empeora.
- **Pruebas que comparten un archivo SQLite local** (`./data/workshop.db`, `AUTH_DB_URL` leída como constante estática) → Mitigación: las pruebas solo leen datos sembrados; si apareciera un problema de aislamiento, se resolvería en un cambio propio de infraestructura de pruebas, no aquí.
- **Cobertura del código modificado**: el método es pequeño, pero debe quedar cubierto por ramas de coincidencia y no coincidencia → Mitigación: las pruebas HTTP de la tabla cubren ambas.

## Rollback

El cambio es de un solo método, sin migración de datos, esquema, configuración ni dependencias. Si hubiera una regresión funcional, se revierte el commit que modifica `findByCredentials` y se vuelve a verificar con la suite. Advertencia: revertir **reintroduce la vulnerabilidad**, así que solo se haría de forma temporal mientras se corrige hacia adelante; la mejor opción es un arreglo posterior sobre la consulta parametrizada. Las pruebas agregadas se conservan en ambos casos: tras revertir, las de inyección volverían a fallar, y esa es la señal esperada.
