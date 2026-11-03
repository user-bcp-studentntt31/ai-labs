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