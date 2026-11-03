# Pruebas de API

## API (`api`)

Pruebas con `fastapi.testclient.TestClient`, SQLite temporal (`tmp_path`) y llamadas HTTP locales. El endpoint de backend health se prueba con una respuesta simulada; no se llama al servicio de autenticación ni a otro servicio remoto. Los casos de autorización fallidos son defectos observados, no expectativas adaptadas para hacer pasar la suite.

| endpoint | caso | tipo | resultado esperado | resultado observado |
|---|---|---|---|---|
| `GET /api/tasks` | Listar tareas semilla | Camino feliz | `200`, lista con campos documentados | Cubierto por `test_lists_seeded_tasks`; pasa |
| `GET /api/tasks` | Propietario sin tareas | Borde | `200`, `[]` | `test_list_tasks_with_unknown_owner_is_empty`; pasa |
| `GET /api/tasks` | Header ausente o token inválido | Error `401` | `401` con `detail` de token inválido | Parametrizado en `test_endpoints_reject_missing_or_invalid_authentication`; pasa |
| `GET /api/tasks` | Método no soportado | Error `405` | `405`, `{"detail":"Method Not Allowed"}` | Parametrizado en `test_endpoints_reject_unsupported_methods`; pasa |
| `GET /api/tasks` | SQLite no disponible | Error `500` | `500`, `Internal Server Error` | Parametrizado en `test_database_errors_return_500_for_task_routes`; pasa |
| `GET /api/tasks` | Consultar `owner=trainer` con token `student` | Seguridad / H-API-03 | `200` filtrado a la identidad o `403`, sin datos de otro propietario | `test_list_tasks_cannot_read_another_owner`; **falla: devuelve tareas de `trainer`** |
| `POST /api/tasks` | Crear con todos los campos | Camino feliz | `201`, objeto de tarea persistido | Cubierto por `test_creates_task_and_summary`; pasa |
| `POST /api/tasks` | Objeto vacío | Borde | `201`, defaults `title/description=""`, `status=TODO`, `priority=MEDIUM`, `owner` de identidad | `test_create_task_with_empty_payload_uses_defaults`; pasa |
| `POST /api/tasks` | Header ausente o token inválido | Error `401` | `401` | Parametrizado en `test_endpoints_reject_missing_or_invalid_authentication`; pasa |
| `POST /api/tasks` | Método no soportado | Error `405` | `405` | Parametrizado en `test_endpoints_reject_unsupported_methods`; pasa |
| `POST /api/tasks` | Cuerpo ausente, JSON malformado o JSON no objeto | Error `422` | `422` con error de validación FastAPI | `test_create_task_without_body_returns_422`, `test_create_task_with_invalid_json_returns_422` y `test_create_task_with_non_object_json_returns_422`; pasan |
| `POST /api/tasks` | SQLite no disponible | Error `500` | `500`, `Internal Server Error` | Parametrizado en `test_database_errors_return_500_for_task_routes`; pasa |
| `POST /api/tasks` | Enviar `owner=trainer` con token `student` | Seguridad / H-API-03 | Tarea atribuida a `student` o rechazo; nunca asignada al otro owner | `test_create_task_cannot_assign_another_owner`; **falla: la tarea queda asignada a `trainer`** |
| `GET /api/summary` | Resumir tareas semilla y creadas | Camino feliz | `200`, total y conteos conforme a tareas persistidas | Cubierto por `test_creates_task_and_summary`; pasa |
| `GET /api/summary` | Propietario sin tareas | Borde | `200`, total `0`, `byStatus={}`, `highPriorityOpen=0` | `test_summary_with_unknown_owner_is_empty`; pasa |
| `GET /api/summary` | Header ausente o token inválido | Error `401` | `401` | Parametrizado en `test_endpoints_reject_missing_or_invalid_authentication`; pasa |
| `GET /api/summary` | Método no soportado | Error `405` | `405` | Parametrizado en `test_endpoints_reject_unsupported_methods`; pasa |
| `GET /api/summary` | SQLite no disponible | Error `500` | `500`, `Internal Server Error` | Parametrizado en `test_database_errors_return_500_for_task_routes`; pasa |
| `GET /api/summary` | Consultar `owner=trainer` con token `student` | Seguridad / H-API-03 | Resumen limitado a la identidad o `403` | `test_list_tasks_cannot_read_another_owner`; **falla: devuelve el resumen de `trainer`** |
| `POST /api/requirements` | Cargar archivo de texto | Camino feliz | `201`, metadatos y bytes almacenados | Cubierto por `test_uploads_requirement`; pasa |
| `POST /api/requirements` | Archivo vacío y sin extensión | Borde | `201`, `size=0`; el código no impone extensión mínima | `test_upload_requirement_without_extension_and_empty_content`; pasa |
| `POST /api/requirements` | Header ausente o token inválido | Error `401` | `401` | Parametrizado en `test_endpoints_reject_missing_or_invalid_authentication`; pasa |
| `POST /api/requirements` | Método no soportado | Error `405` | `405` | Parametrizado en `test_endpoints_reject_unsupported_methods`; pasa |
| `POST /api/requirements` | Multipart malformado | Error `400` | `400`, `{"detail":"There was an error parsing the body"}` | `test_upload_requirement_with_malformed_multipart_returns_400`; pasa |
| `POST /api/requirements` | Campo `file` ausente | Error `422` | `422`, ubicación `body/file` | `test_upload_requirement_without_file_returns_422`; pasa |
| `POST /api/requirements` | Fallo al escribir en disco | Error `500` | `500`, `Internal Server Error` | `test_upload_requirement_write_error_returns_500`; pasa |
| `POST /api/requirements` | Límite de tamaño | Borde / pendiente | No definido: el contrato no fija un máximo, por lo que no se inventa una expectativa de rechazo | **No probado** hasta que se acuerde un límite y se implemente |
| `GET /api/backend-health` | Backend simulado responde `200` | Camino feliz | `200`, `requestedBy`, estado upstream y body | `test_backend_health_success_response`; pasa, sin llamada remota |
| `GET /api/backend-health` | Backend simulado responde `503` | Borde | HTTP `200`, campo interno `status=503` y body recibido | `test_backend_health_preserves_upstream_non_success_status`; pasa |
| `GET /api/backend-health` | Header ausente o token inválido | Error `401` | `401` | Parametrizado en `test_endpoints_reject_missing_or_invalid_authentication`; pasa |
| `GET /api/backend-health` | Método no soportado | Error `405` | `405` | Parametrizado en `test_endpoints_reject_unsupported_methods`; pasa |
| `GET /api/backend-health` | Excepción de dependencia upstream | Fallback documentado | HTTP `200`, `status=0` y texto de excepción en `body` | `test_backend_health_dependency_exception_returns_status_zero`; pasa, excepción simulada |

## Código de pruebas

Los tests ejecutables están en [`api/tests/test_api.py`](../api/tests/test_api.py). Los casos de autenticación y método no soportado son parametrizados por endpoint. La prueba IDOR cubre listado y resumen; una prueba separada cubre la asignación de owner al crear. No se usa `xfail` para ocultar el defecto.

## Ejecuciones

Fecha de ejecución: 2026-11-02. El directorio de trabajo de cada comando fue `api/`.

| comando | directorio | código de salida | resultado |
|---|---|---:|---|
| `python -m pytest -q tests/test_api.py::test_list_tasks_cannot_read_another_owner` | `api/` | 1 | `1 failed`; confirmó exposición de tareas y resumen de `trainer` a `student` |
| `python -m pytest --cov=app --cov-report=term-missing` | `api/` | 1 | `36 passed, 2 failed`; fallaron las dos pruebas H-API-03: lectura/resumen de otro owner y asignación a otro owner |
| `python -m pytest --cov=app --cov-report=term-missing -k "not test_list_tasks_cannot_read_another_owner and not test_create_task_cannot_assign_another_owner"` | `api/` | 0 | `36 passed, 2 deselected`; los caminos felices, bordes y errores restantes pasan |

### Cobertura

Medición con `pytest-cov`/Coverage.py, configuración de `api/pyproject.toml` (`source=["app"]`, `branch=true`): cobertura global de `app` **98%**. Informe: 117 sentencias, 1 no cubierta; 10 ramas y 1 parcialmente cubierta. Equivale a 125 de 127 sentencias/ramas cubiertas (98.4%, mostrado redondeado a 98%). Por módulo: `main.py` y `services/task_service.py` completos; `repositories/task_repository.py` 89% (una sentencia y una rama parcial no cubiertas). Esta medición es cobertura global de la aplicación, no cobertura exclusiva de las líneas nuevas de tests.

## Fallos, pendientes y pruebas propuestas

- **Fallo confirmado — H-API-03:** `GET /api/tasks` y `GET /api/summary` usan el owner enviado por el cliente; `POST /api/tasks` también acepta un owner ajeno. Las pruebas fallan con evidencia reproducible. No se modificó producción en esta tarea.
- **Pendiente:** falta acordar en el contrato el tamaño máximo de archivo; no se escribió una prueba que invente el límite. La prueba de archivo sin extensión cubre el borde permitido por el comportamiento actual, no acredita una política de seguridad.
- **Pendiente:** los ejemplos y respuestas de dependencias upstream se probaron con dobles locales; no se verificó la integración real con el servicio de autenticación.
- **Pruebas propuestas:** una vez acordado el límite de carga y corregido H-API-03, ejecutar de nuevo las dos pruebas de autorización y añadir la prueba del tamaño máximo acordado. Mantener el requisito de respuesta sin datos de otros owners.
