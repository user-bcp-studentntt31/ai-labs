# Plan

## api

Este plan cubre `H-API-01` a `H-API-05`, que aparecen como `Aprobado` en `HALLAZGOS.md`. No existe `docs/ENDPOINTS.md`; las rutas, métodos, estados HTTP y formas de respuesta observados se mantienen. Cuando una corrección de seguridad cambie el comportamiento vulnerable, se indica explícitamente y debe confirmarse el contrato antes de implementarla. Las pruebas siguientes son propuestas, no resultados ejecutados.

### Aprobación humana

`H-API-01` a `H-API-05`: aprobados por instrucción explícita del usuario en esta conversación, el 2026-11-02. Esta aprobación registra la decisión sobre los hallazgos y su planificación; no afirma que se hayan ejecutado pruebas ni resuelve las confirmaciones de contrato externo indicadas en los apartados correspondientes.

### Estado de ejecución — componente `api` (2026-11-02)

- `H-API-01`: implementado y validado; ver resultados y comandos en su apartado.
- `H-API-02`: sin cambios ni pruebas. Falta que el emisor confirme algoritmo, claves, `issuer`, `audience` y claims JWT; no se mantiene el token Base64 como fallback.
- `H-API-03`: sin cambios ni pruebas. Falta acordar el comportamiento de compatibilidad cuando el `owner` solicitado no coincide con la identidad (ignorar el parámetro o responder 403).
- `H-API-04`: sin cambios ni pruebas. El contrato no define extensiones permitidas ni tamaño máximo y el plan prohíbe inventar esos límites.
- `H-API-05`: sin cambios ni pruebas SCA. El escáner CVE disponible no acepta el ecosistema Python; el flujo alternativo de análisis requiere una ruta de artefacto que no fue proporcionada. No se afirma que las dependencias tengan o no tengan CVE.

### H-API-01 — Filtros e inserts concatenados en SQL

**Hallazgo:** Vulnerabilidad de severidad alta; consultas de tareas concatenan valores de entrada (`api/app/main.py:70-71`, `api/app/main.py:84-87`, `api/app/main.py:93`).

**Problema:** valores de filtros y campos de creación pueden modificar la consulta SQL; las comillas en datos ordinarios también pueden romperla. La consulta de lectura posterior al insert concatena además `lastrowid`.

**Cambio propuesto:** antes de cambiar producción, escribir pruebas de caracterización para listar y resumir por propietario, crear una tarea con campos y valores por defecto observados, y comprobar estados y JSON. Después, mover SQL desde las rutas a un repositorio, delegando reglas a un servicio pequeño. Parametrizar filtros, inserts y la consulta por ID con placeholders de SQLite; no interpolar valores. Mantener rutas, métodos, estados y estructura de respuesta. No introducir modelos Pydantic en este cambio, pues el tipado de cuerpos pertenece a `H-API-07`.

**Archivos a tocar:** `api/app/main.py`; crear `api/app/services/task_service.py` y `api/app/repositories/task_repository.py`; `api/tests/test_api.py`.

**Pruebas de caracterización y regresión:** caracterizar los flujos existentes antes de tocar producción. Luego añadir casos con apóstrofos como datos ordinarios en `owner`, `title` y `description`; comprobar que se almacenan/filtran como valores literales, no alteran la consulta y conservan la forma de respuesta. Ejecutar con SQLite temporal local.

**Ejecución — componente `api`, H-API-01 (2026-11-02):**

- Antes del cambio: `python -m pytest -q tests/test_api.py::test_task_sql_values_with_apostrophes_are_preserved` desde `api/`: 1 fallida; la creación devolvió HTTP 500 en vez de 201.
- Después del cambio: la misma prueba pasó (1 passed); el valor con apóstrofo se conservó en creación, listado y resumen.
- Suite completa: `python -m pytest --cov=app --cov-report=term-missing` desde `api/`: 5 passed. Cobertura total 92%; `api/app/main.py` 89%, `api/app/repositories/task_repository.py` 89% y `api/app/services/task_service.py` 100%. Se observaron advertencias deprecadas de Starlette/FastAPI ajenas a este cambio.
- Resultado: H-API-01 resuelto mediante placeholders SQLite y separación de repositorio/servicio. No se ejecutaron pruebas para H-API-02 a H-API-05.

### H-API-02 — Token Base64 con secreto embebido

**Hallazgo:** Vulnerabilidad de severidad alta; Base64 y secreto fijo en `api/app/main.py:14`, `api/app/main.py:17-25`.

**Problema:** Base64 no garantiza integridad ni autenticidad. Aunque se valida expiración, no hay firma, emisor ni audiencia; los errores de validación también se devuelven en el detalle HTTP.

**Cambio propuesto:** sustituir la decodificación casera por una biblioteca JWT mantenida, por ejemplo PyJWT, justificada para no implementar criptografía propia. Verificar firma con algoritmo explícito, `issuer`, `audience` y expiración; leer la clave y valores esperados desde configuración de entorno; traducir claims acordados a la identidad interna y devolver un 401 genérico para tokens inválidos. Incorporar PyJWT en `api/requirements.txt` solo tras acordar algoritmo y distribución de claves; una variante que requiera extras criptográficos deberá justificarlos también.

**Bloqueo de compatibilidad:** el formato observado es Base64 con `username`, `role`, expiración y secreto. Aceptarlo como fallback mantendría la vulnerabilidad; rechazarlo cambia el contrato de credenciales, aunque las rutas y respuestas de negocio sigan iguales. Antes de implementar, el emisor externo debe confirmar algoritmo, distribución de claves, `issuer`, `audience` y nombres de claims. No se debe leer ni modificar otro componente como parte de este alcance.

**Archivos a tocar:** `api/app/main.py`; crear `api/app/security.py`; `api/requirements.txt`; `api/tests/test_api.py`.

**Pruebas de caracterización y regresión:** antes de tocar producción, registrar con pruebas locales que el token legado válido permite una petición y que un token inválido o expirado recibe 401; capturar también la forma de respuesta protegida. Esas pruebas documentan el comportamiento actual, no justifican conservar el mecanismo vulnerable. Tras acordar el contrato JWT, probar token firmado válido y rechazos por firma, expiración, emisor, audiencia o formato inválidos con claves ficticias; confirmar 401 genérico y respuestas de negocio sin cambios.

### H-API-03 — Acceso a datos de otro propietario

**Hallazgo:** Vulnerabilidad de severidad alta; el `owner` de cliente prevalece sobre la identidad en `GET /api/tasks` y `GET /api/summary` (`api/app/main.py:68-71`, `api/app/main.py:91-93`). El cuerpo de creación también admite `owner` (`api/app/main.py:78-85`).

**Problema:** un usuario autenticado puede leer o crear datos atribuidos a otro propietario, porque el alcance de datos depende de un valor controlado por el cliente.

**Cambio propuesto:** antes de modificar rutas, caracterizar las respuestas de listado y resumen para la identidad autenticada y el comportamiento actual cuando se pasa otro `owner`; caracterizar también la propiedad asignada al crear. Después, derivar siempre el propietario desde `identity["username"]` para consultas y asignación de nuevas tareas. Mantener temporalmente el parámetro opcional `owner` para no romper la forma de la ruta, pero no usarlo como autoridad; confirmar con el responsable del contrato si una discrepancia se ignora o responde 403. No se observan reglas de rol que justifiquen acceso administrativo, así que no inventarlas.

**Compatibilidad:** conservar rutas, métodos, estado y claves JSON. Cambiar el resultado para consultas entre propietarios y la posibilidad de asignar otro `owner` es intencional para cerrar la vulnerabilidad; no puede preservarse el comportamiento inseguro. Registrar esta diferencia como riesgo/decisión de contrato antes de implementar.

**Archivos a tocar:** `api/app/main.py`; si `H-API-01` se implementa en conjunto, aplicar el alcance de propietario en `api/app/services/task_service.py` y `api/app/repositories/task_repository.py`; `api/tests/test_api.py`.

**Pruebas de caracterización y regresión:** caracterizar primero datos propios y el acceso actual con otro propietario. Después, comprobar que el token de `student` solo obtiene/resume sus tareas incluso si solicita otro `owner`, y que una tarea creada queda asociada al usuario del token, no al `owner` del cuerpo. Verificar que la estructura de las respuestas y los códigos acordados se mantienen.

### H-API-04 — Nombre y contenido de archivos subidos sin límites

**Hallazgo:** Vulnerabilidad de severidad media; `upload.filename` se concatena al directorio y se lee el archivo completo (`api/app/main.py:107-112`).

**Problema:** el nombre puede escapar del directorio previsto y no hay límites visibles de tamaño o extensión; leer todo el contenido antes de validarlo también permite consumo excesivo de memoria.

**Cambio propuesto:** caracterizar una carga válida (estado 201, claves de respuesta, tamaño y archivo almacenado) antes de cambiar producción. Luego validar extensión permitida y tamaño máximo durante la lectura, normalizar/restringir el nombre y comprobar que el destino permanece dentro del directorio configurado. Evitar leer archivos ilimitados en memoria. Mantener ruta, método, estado para cargas válidas y claves de respuesta; conservar `fileName` como dato de nombre recibido si el contrato requiere ese valor y usar el nombre seguro solo para almacenamiento. Rechazar archivos inválidos con error HTTP genérico. Los valores permitidos y el límite máximo deben acordarse/configurarse: no están definidos en el contrato observado y no se deben inventar.

**Archivos a tocar:** `api/app/main.py`; crear `api/app/file_storage.py` si la validación y escritura requieren separación para mantener una responsabilidad por función; `api/tests/test_api.py`.

**Pruebas de caracterización y regresión:** primero, carga local válida y verificación de respuesta y archivo. Después, rechazar extensión no permitida, nombre con componentes de ruta y archivo que supere el límite configurado; comprobar que no se escribe fuera del directorio ni queda un archivo parcial. No enviar archivos a servicios remotos.

### H-API-05 — Versiones de dependencias señaladas por el reto

**Hallazgo:** Sugerencia de severidad media; `urllib3==2.5.0` y `python-multipart==0.0.21` declarados en `api/requirements.txt:4-5`. La presencia de versiones está comprobada, pero no hay CVE confirmado.

**Problema:** sin un análisis SCA actualizado no se sabe si esas versiones están afectadas por avisos aplicables. No debe afirmarse ni corregirse una CVE por la sola presencia de las versiones.

**Cambio propuesto:** ejecutar un escáner de dependencias autorizado sobre el manifiesto y registrar advisories, versiones afectadas y versiones corregidas. Actualizar solo los paquetes con riesgo confirmado, usando una versión corregida compatible; justificar cada cambio y no silenciar avisos. No agregar dependencias. Antes de cambiar versiones, caracterizar con pruebas locales la carga multipart y el manejo de respuesta de `GET /api/backend-health` (mockeando la llamada HTTP para no depender de otro servicio), además de ejecutar la suite existente; repetirlas después.

**Archivos a tocar:** `api/requirements.txt` solo si el análisis confirma una actualización necesaria; `api/tests/test_api.py` solo si faltan las pruebas de caracterización mencionadas. Registrar resultados y componentes/IDs en `docs/TESTING.md` únicamente cuando se ejecute el análisis o las pruebas; actualmente ese documento no existe.

**Pruebas de caracterización y regresión:** registrar primero el resultado del escáner como línea base, sin presentarlo como prueba funcional. Caracterizar carga válida multipart y el formato/status de la ruta de salud con dependencia externa simulada. Después de cualquier actualización justificada, repetir el escáner y las pruebas funcionales; no marcar CVE como resuelto sin evidencia del escaneo.