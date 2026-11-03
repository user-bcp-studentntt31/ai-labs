# Hallazgos

## Contrato observado de api

No existe `docs/ENDPOINTS.md`; el siguiente resumen se deriva de `api/app/main.py` y no representa un contrato acordado.

| Ruta | Comportamiento observado |
|---|---|
| `GET /api/tasks` | Requiere `legacy_identity`; acepta `owner` opcional y devuelve tareas de SQLite. `api/app/main.py:67-71` |
| `POST /api/tasks` | Requiere `legacy_identity`; recibe un cuerpo sin modelo Pydantic, inserta una tarea y devuelve el registro con estado 201. `api/app/main.py:77-88` |
| `GET /api/summary` | Requiere `legacy_identity`; acepta `owner` opcional y resume tareas de SQLite. `api/app/main.py:90-104` |
| `POST /api/requirements` | Requiere `legacy_identity`; lee el archivo completo, lo guarda en el directorio configurado y devuelve sus datos con estado 201. `api/app/main.py:107-112` |
| `GET /api/backend-health` | Requiere `legacy_identity`; consulta `AUTH_HEALTH_URL` o `http://localhost:8080/q/health`. `api/app/main.py:114-121` |

Todas las rutas anteriores dependen de `legacy_identity`, que interpreta el token como Base64 y comprueba el secreto embebido y la expiración. `api/app/main.py:14-25`. SQLite crea la tabla `tasks` y carga datos semilla durante `create_app`. `api/app/main.py:29-43`.

## Matriz de seguimiento

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-API-01 | api | Filtros e inserts concatenados en SQL | Vulnerabilidad | Resuelto: filtros, inserts y lectura por ID usan placeholders SQLite en el repositorio; las rutas delegan en servicio y repositorio. La prueba con apóstrofos pasó y conserva el formato observado. | `api/app/repositories/task_repository.py:10-53`; `api/app/services/task_service.py:18-54`; `api/tests/test_api.py:44-68` | alta | Resuelto |
| H-API-02 | api | Token Base64 con secreto embebido | Vulnerabilidad | Base64 no firma ni cifra el token, y el secreto está en el código. Un cliente que conozca el formato y el secreto puede fabricar credenciales; no se observan comprobaciones de firma, emisor o audiencia. Sí hay una comprobación de expiración. | `api/app/main.py:17`; `api/app/main.py:20-28` | alta | Aprobado |
| H-API-03 | api | La identidad puede consultar tareas de otro `owner` | Vulnerabilidad | `owner` proviene de la consulta del cliente y prevalece sobre el nombre de usuario del token. Las pruebas locales del 2026-11-02 confirmaron que `student` lee el listado/resumen de `trainer` y puede crear una tarea atribuida a `trainer`; sigue sin resolver. | `api/app/main.py:60-63`; `api/app/main.py:75-78`; `api/app/main.py:66-73`; `api/tests/test_api.py:151-164`; `api/tests/test_api.py:189-197` | alta | Aprobado |
| H-API-04 | api | El archivo se guarda usando directamente `upload.filename` | Vulnerabilidad | El nombre recibido se combina con el directorio de cargas sin normalización ni validación visible de extensión o tamaño. Esto puede permitir rutas no previstas o cargas excesivas; no se verificó el impacto en ejecución. | `api/app/main.py:81-85` | media | Aprobado |
| H-API-05 | api | Dependencias señaladas por el reto requieren análisis SCA | Sugerencia | El manifiesto declara las versiones citadas por el reto (`urllib3` 2.5.0 y `python-multipart` 0.0.21). La presencia de esas versiones está comprobada, pero no se verificó si tienen CVE aplicables ni su explotabilidad; no se afirma una vulnerabilidad de dependencia confirmada. | `api/requirements.txt:4`; `api/requirements.txt:5` | media | Aprobado |
| H-API-06 | api | Persistencia y flujos restantes concentrados en el módulo de rutas | Refactor | Las rutas de tareas ahora delegan las consultas y el resumen, pero `create_app` sigue inicializando SQLite y las rutas de carga y health mantienen operaciones de persistencia/IO en `main.py`. El hallazgo de arquitectura continúa pendiente para esos flujos. | `api/app/main.py:32-57`; `api/app/main.py:81-96`; `api/app/repositories/task_repository.py:6-53`; `api/app/services/task_service.py:13-54` | baja | Aprobado |
| H-API-07 | api | Tipado genérico, excepciones amplias y duplicación | Refactor | Los cuerpos/respuestas siguen usando `dict[str, Any]`, hay capturas amplias de `Exception` y se repite el fallback `owner or identity["username"]`. La lógica anidada del resumen se simplificó al resolver H-API-01; el hallazgo de calidad permanece pendiente por los problemas restantes. | `api/app/main.py:28`; `api/app/main.py:60-78`; `api/app/main.py:88-93`; `api/app/services/task_service.py:18-54` | baja | Aprobado |
| H-API-08 | api | CORS permite cualquier origen con credenciales | Seguridad / configuración | Resuelto: la allow-list quedó vacía conforme a la decisión del usuario; la preflight no autorizada devuelve 400 sin `Access-Control-Allow-Origin`, y un GET cross-origin no incluye ese header. Las solicitudes directas conservan el estado y la autenticación existentes. | `api/app/main.py:52-58`; `api/tests/test_api.py:145-166`; `docs/ENDPOINTS.md` (Política CORS); `docs/TESTING.md` (H-API-08) | media | Resuelto |
| H-API-09 | api | Fallo del backend de autenticación se representa como HTTP 200 | Funcional / observabilidad | Cuando la consulta upstream falla, el endpoint devuelve HTTP 200 con `status: 0`. Una solicitud local sin servicio en `localhost:8080` confirmó ese resultado; una prueba existente también exige HTTP 200 ante una excepción simulada. Consumidores que evalúan solo el estado HTTP pueden interpretar la respuesta como exitosa. | `api/app/main.py:87-94`; `api/tests/test_api.py:323-339`; comando local con `TestClient` (2026-11-03) | baja | CANDIDATO |
| H-API-10 | api | La ruta de health devuelve al cliente el texto crudo de excepciones upstream | Seguridad / información | La captura de excepciones convierte `str(error)` en el campo `body` de la respuesta. En la solicitud local sin upstream, el cuerpo incluyó detalles de conexión y host/puerto; el endpoint requiere autenticación. | `api/app/main.py:89-94`; `api/tests/test_api.py:323-339`; respuesta de `TestClient` (2026-11-03) | baja | CANDIDATO |

### Descubrimiento API (2026-11-03)

H-API-08 fue aprobado e implementado en la rama local `day1/prompting`; H-API-09 y H-API-10 continúan como `CANDIDATO`. No se crearon issues. La ejecución final `python tools/lab.py test api` terminó con `38 passed, 2 failed`, cobertura total `98.43%`; fallaron las dos pruebas ya registradas en H-API-03 (lectura/resumen de otro owner y asignación a otro owner).

- **H-API-08 — CORS permite cualquier origen con credenciales**
  - Estado: Resuelto
  - Evidencia: `api/app/main.py:52-58`; `api/tests/test_api.py:145-166`. La prueba enfocada de preflight no autorizada ahora devuelve 400 sin `Access-Control-Allow-Origin`; la respuesta GET cross-origin tampoco incluye dicho header.
  - Impacto: antes cualquier origen recibía permiso CORS. Ahora ningún origen de navegador está autorizado; el acceso directo a la API y su autenticación permanecen sin cambios.
  - Prioridad propuesta: media
  - Contrato potencialmente afectado: política CORS observable por consumidores browser de todos los endpoints; el usuario decidió que no hay orígenes de navegador permitidos.
  - Validación: `python -m pytest -q tests/test_api.py::test_cors_preflight_rejects_unconfigured_origins tests/test_api.py::test_cors_does_not_authorize_cross_origin_api_response` (2 pasaron); `python tools/lab.py test api` (38 pasaron, 2 fallaron por H-API-03; cobertura 98.43%).

- **H-API-09 — Fallo del backend de autenticación se representa como HTTP 200**
  - Estado: CANDIDATO
  - Evidencia: `api/app/main.py:87-94`; `api/tests/test_api.py:323-339` espera código HTTP 200 y `status: 0` ante una excepción upstream. Solicitud local con el upstream no disponible: `backend_health_without_upstream_status=200`, JSON con `status=0`.
  - Impacto: un consumidor o monitor que solo evalúe el status HTTP puede marcar la verificación como exitosa aunque la dependencia no responda. La respuesta incluye una señal interna `status` que consumidores atentos pueden interpretar, por lo que la gravedad depende de los clientes reales.
  - Prioridad propuesta: baja
  - Contrato potencialmente afectado: formato y semántica HTTP de `GET /api/backend-health`; las pruebas existentes codifican la respuesta 200 y cualquier cambio debe confirmarse.
  - Cómo validarlo: revisar consumidores y sondas que usan este endpoint y comprobar si consideran el campo `status` o solo el status HTTP; acordar el comportamiento esperado para upstream inaccesible y probarlo.

- **H-API-10 — La ruta de health devuelve texto crudo de excepciones upstream**
  - Estado: CANDIDATO
  - Evidencia: `api/app/main.py:89-94` serializa `str(error)` en `body`; `api/tests/test_api.py:323-339` comprueba que una excepción simulada se expone íntegramente. La respuesta local sin upstream incluyó detalles de conexión y host/puerto.
  - Impacto: un usuario autenticado recibe detalles operativos de la dependencia, que pueden revelar nombres de host, puertos o topología de red. No se afirma acceso no autorizado ni se probó exposición a usuarios anónimos.
  - Prioridad propuesta: baja
  - Contrato potencialmente afectado: campo `body` de `GET /api/backend-health` cuando falla la conexión; la prueba actual exige el texto de la excepción.
  - Cómo validarlo: usar una excepción simulada que contenga un marcador sensible ficticio y comprobar el cuerpo observado; revisar qué consumidores necesitan el detalle y acordar si el contrato requiere mensaje genérico.

## Hallazgos de web (discovery-analysis, 2026-11-03)

Estado actualizado el 2026-11-03: `H-WEB-02` fue aprobado e implementado en la rama local `day1/prompting`; los demás hallazgos de web continúan como `CANDIDATO`. No se crearon issues. Las rutas son relativas a la raíz de ai-labs.

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-WEB-01 | web | Sin pruebas de componentes ni umbral de cobertura | Calidad | Solo existe una prueba (`legacy-format`). `LoginComponent` y `DashboardComponent` no tienen pruebas y `test:coverage` no define umbral; la meta de 85% no se puede verificar. | `web/src/app/utils/legacy-format.spec.ts:1-8`; `web/vitest.config.ts:4-9`; `web/package.json:8-9` | alta | CANDIDATO |
| H-WEB-02 | web | Token vencido o rechazado no limpia la sesión | Funcional | Resuelto: al recibir HTTP 401 de Axios en la carga de tareas, el dashboard reutiliza `logout()` para limpiar token/usuario y navegar a login. Errores distintos conservan el manejo previo. Cuatro pruebas cubren 401, error no auth, éxito y ausencia de token; cobertura de `dashboard.component.ts`: 90.41% de líneas. | `web/src/app/dashboard/dashboard.component.ts:68-71`; `web/src/app/dashboard/dashboard.component.spec.ts:42-87`; `docs/ENDPOINTS.md:78-82`; `docs/TESTING.md` (WEB) | media | Resuelto |
| H-WEB-03 | web | HTML dinámico con usuario y mensaje del backend, sin cabeceras de seguridad | Vulnerabilidad | El mensaje de error se construye como HTML con `this.username` y `backendMessage` y se renderiza con `[innerHTML]`. Angular sanitiza, pero `npm audit` reporta un bypass de sanitización en `@angular/compiler`/`@angular/core` (GHSA-hh8m-fm6v-7cvg). `nginx.conf` no define CSP, por lo que un script inyectado tendría acceso al token en `localStorage`. | `web/src/app/login/login.component.ts:56`; `web/src/app/login/login.component.html:39`; `web/src/app/login/login.component.ts:47`; `web/nginx.conf:1-9` | media | CANDIDATO |
| H-WEB-04 | web | Dependencias directas con alertas en `npm audit` | Vulnerabilidad (SCA) | `axios` 0.31.0 y `lodash` 4.17.21 aparecen como directas con severidad alta en el advisory de npm. Auditoría completa: 43 hallazgos (6 críticos, 10 altos, 27 moderados), incluidos `vitest` y `@angular-devkit/build-angular` críticos en devDependencies. Solo se confirmó la presencia de las alertas; no se verificó su explotabilidad en esta aplicación. | `web/package.json:14-19`; `web/package-lock.json:7583-7585`; comando `npm audit --package-lock-only --audit-level=moderate` ejecutado el 2026-11-03 | alta | CANDIDATO |
| H-WEB-05 | web | Ordenamiento de tareas por prioridad incorrecto | Funcional | El comparador `a.priority > b.priority ? -1 : 1` compara cadenas alfabéticamente y devuelve `1` cuando los valores son iguales, por lo que no es un orden consistente. Con valores de ejemplo `high`, `medium` y `low`, el resultado fue `["medium","low","high"]`, con `high` al final. No se inspeccionaron los valores reales de `priority` que devuelve la API. | `web/src/app/dashboard/dashboard.component.ts:54` | media | CANDIDATO |

### Detalle para revisión

- **H-WEB-01**
  - Estado: CANDIDATO
  - Evidencia: `web/src/app/utils/legacy-format.spec.ts:1-8`; `web/vitest.config.ts:4-9`; `web/package.json:8-9`
  - Impacto: los cambios en login y dashboard no tienen red de seguridad y no se puede demostrar la meta de cobertura del 85%.
  - Prioridad propuesta: alta
  - Contrato potencialmente afectado: flujo UI de `/auth/login` y `/api/tasks`; reglas 3 y 7 de la sección web.
  - Cómo validarlo: ejecutar `npm run test:coverage` dentro de `web/` y comprobar la cobertura de `login/` y `dashboard/`.

- **H-WEB-02**
  - Estado: Resuelto
  - Evidencia: `web/src/app/dashboard/dashboard.component.ts:68-71`; `web/src/app/dashboard/dashboard.component.spec.ts:42-87`; `docs/ENDPOINTS.md:78-82`.
  - Impacto: antes, con un token vencido o alterado, el usuario quedaba en una pantalla de error con la sesión guardada. Ahora una respuesta HTTP 401 limpia ambas claves y redirige a `/login`.
  - Prioridad propuesta: media
  - Contrato potencialmente afectado: flujo login → dashboard y respuesta de `GET /api/tasks`.
  - Validación: `npm test` (5 pruebas, pasa); `npm run test:coverage` (dashboard: 90.41% líneas); `npm run build` (pasa). Resultados registrados en `docs/TESTING.md`, sección WEB.

- **H-WEB-03**
  - Estado: CANDIDATO
  - Evidencia: `web/src/app/login/login.component.ts:47`, `:56`; `web/src/app/login/login.component.html:39`; `web/nginx.conf:1-9`; advisory GHSA-hh8m-fm6v-7cvg en `npm audit`.
  - Impacto: inyección de HTML en el mensaje de error con datos del usuario; el riesgo aumenta si el bypass de sanitización de Angular es explotable en esta versión. El token queda accesible a scripts en la página.
  - Prioridad propuesta: media
  - Contrato potencialmente afectado: mensaje de error de `POST /auth/login` (la forma de la respuesta no cambia).
  - Cómo validarlo: escribir `<b>x</b>` como usuario y observar si se renderiza como HTML; revisar cabeceras de la respuesta de nginx con `curl -I` tras construir la imagen.

- **H-WEB-04**
  - Estado: CANDIDATO
  - Evidencia: `web/package.json:14-19`; `web/package-lock.json:7583-7585`; `npm audit --package-lock-only --audit-level=moderate`.
  - Impacto: alertas de dependencias directas en tiempo de ejecución (`axios`, `lodash`) y de desarrollo (`vitest`, `@angular-devkit/build-angular`). No se confirmó explotabilidad.
  - Prioridad propuesta: alta para `axios` y `lodash`; media para el resto
  - Contrato potencialmente afectado: ninguno de los endpoints; los cambios son de versiones de paquetes.
  - Cómo validarlo: repetir `npm audit` tras actualizar y comprobar que `npm run build` y `npm test` siguen pasando.

- **H-WEB-05**
  - Estado: CANDIDATO
  - Evidencia: `web/src/app/dashboard/dashboard.component.ts:54`
  - Impacto: el listado no siempre se ordena por prioridad; las tareas de mayor prioridad pueden aparecer al final.
  - Prioridad propuesta: media
  - Contrato potencialmente afectado: orden visible del listado de `GET /api/tasks`.
  - Cómo validarlo: extraer el comparador a una función, escribir una prueba unitaria y verificarla con valores reales de `priority` devueltos por la API.

### Observación no incluida

- `web/src/app/dashboard/dashboard.component.ts:43` concatena `this.user.username` en la URL sin `encodeURIComponent`. Un nombre con `&` alteraría la consulta. Queda fuera de los 5 hallazgos por el límite de la salida; conviene revisarlo junto con H-API-03.