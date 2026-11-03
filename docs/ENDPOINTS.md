# Contratos de API

## API (`api`)

### Estado del contrato

- **Contrato observado:** lo descrito en esta sección se deriva del código actual de `api/app/main.py`, `api/app/services/task_service.py` y `api/app/repositories/task_repository.py`. Los ejemplos de respuesta se capturaron con una base SQLite temporal el 2026-11-02; IDs, marcas de tiempo y rutas de archivo cambian entre ejecuciones.
- **Contrato acordado:** no se encontró un contrato previamente acordado en el repositorio. Este documento registra lo observado, no una aprobación de cambios de comportamiento.
- **Riesgos y preguntas abiertas:** el token es un formato Base64 legado, no JWT; no está documentado su emisor ni la distribución del secreto. Los parámetros/campos `owner` pueden elegir datos de otra identidad. La carga no limita extensión ni tamaño y usa el nombre recibido como ruta. Los errores internos pueden exponer detalles distintos según su causa y el servidor.

En los ejemplos HTTP, `${TOKEN}` representa un token que el consumidor ya obtuvo por un mecanismo externo. La API no ofrece una ruta para emitirlo y el repositorio no documenta de forma segura ese mecanismo. La forma que espera el código es `Authorization: Bearer <Base64(username|role|unix_expiry|secret)>`; no es un JWT. No se incluye un token reutilizable ni un secreto en esta documentación.

## Política CORS

No hay orígenes de navegador autorizados. Las respuestas no incluyen permiso `Access-Control-Allow-Origin` para solicitudes cross-origin y las preflight desde esos orígenes se rechazan. Esta política no cambia las solicitudes directas a la API ni sustituye el requisito de autenticación de cada endpoint.

## `GET /api/tasks`

### 1. Qué hace

Devuelve las tareas registradas para el propietario seleccionado.

### 2. Autenticación

Requiere el header `Authorization: Bearer <token>` con el formato legado descrito arriba. El código también acepta el valor Base64 sin el prefijo `Bearer ` porque elimina esa cadena si está presente; los consumidores deben usar el formato con prefijo.

### 3. Request

No recibe cuerpo.

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `owner` (query) | string | No | Propietario por el que filtrar. Si falta o está vacío, se usa `username` del token. Si se envía, el código lo usa directamente, incluso cuando pertenece a otra identidad. |

Ejemplo completo:

```http
GET /api/tasks?owner=student HTTP/1.1
Host: localhost:8000
Authorization: Bearer ${TOKEN}
```

### 4. Response exitosa

Estado `200 OK`. Devuelve una lista; puede ser vacía. Cada elemento contiene:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer | Identificador SQLite de la tarea. |
| `title` | string | Título. |
| `description` | string | Descripción. |
| `status` | string | Estado almacenado. |
| `owner` | string | Propietario almacenado. |
| `priority` | string | Prioridad almacenada. |
| `createdAt` | string | Fecha/hora guardada por SQLite en formato `YYYY-MM-DD HH:MM:SS`. |

Ejemplo capturado localmente:

```json
[
  {
    "id": 1,
    "title": "Refactor login",
    "description": "Separar responsabilidades en frontend",
    "status": "TODO",
    "owner": "student",
    "priority": "HIGH",
    "createdAt": "2026-11-02 22:14:55"
  },
  {
    "id": 2,
    "title": "Review API",
    "description": "Revisar seguridad de endpoints",
    "status": "IN_PROGRESS",
    "owner": "student",
    "priority": "MEDIUM",
    "createdAt": "2026-11-02 22:14:55"
  }
]
```

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| `401 Unauthorized` | Header ausente o token que no supera la validación. El texto exacto de `detail` puede variar según el error de decodificación. | `{"detail":"Invalid token: invalid token"}` |
| `405 Method Not Allowed` | Se usa un método no registrado para la ruta. | `{"detail":"Method Not Allowed"}` |
| `500 Internal Server Error` | Falla no capturada durante el acceso a SQLite u otra operación interna. El siguiente cuerpo se observó en una ejecución local con la conexión SQLite cerrada; otras configuraciones del servidor podrían mostrar un cuerpo distinto. | `Internal Server Error` |

### 6. Notas de seguridad

- El filtro se ejecuta con SQL parametrizado en `api/app/repositories/task_repository.py`.
- La autorización no queda ligada exclusivamente a la identidad: un `owner` de query puede seleccionar otro propietario. No tratar este parámetro como control de acceso.
- El token no verifica firma, emisor ni audiencia; el secreto está fijado en el código.

## `POST /api/tasks`

### 1. Qué hace

Crea una tarea y devuelve el registro creado.

### 2. Autenticación

Requiere `Authorization: Bearer <token>` con el formato legado descrito en el estado del contrato.

### 3. Request

El cuerpo debe ser un objeto JSON. Los valores presentes se convierten a string mediante `str()`; no existe validación de modelo Pydantic para estos campos.

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `title` | any JSON | No | Se convierte a string. Si falta, queda `""`. |
| `description` | any JSON | No | Se convierte a string. Si falta, queda `""`. |
| `status` | any JSON | No | Se convierte a string. Si falta, queda `"TODO"`. |
| `priority` | any JSON | No | Se convierte a string. Si falta, queda `"MEDIUM"`. |
| `owner` | any JSON | No | Se convierte a string. Si falta, se usa `username` del token; si se envía, puede sobrescribirlo. |

Ejemplo completo:

```http
POST /api/tasks HTTP/1.1
Host: localhost:8000
Authorization: Bearer ${TOKEN}
Content-Type: application/json

{
  "title": "Add supplier",
  "description": "Register new supplier",
  "status": "TODO",
  "priority": "HIGH",
  "owner": "student"
}
```

### 4. Response exitosa

Estado `201 Created`. Devuelve los mismos campos que cada elemento de `GET /api/tasks`.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer | Identificador SQLite generado. |
| `title` | string | Título después de convertir el valor de entrada a string. |
| `description` | string | Descripción después de convertir el valor de entrada a string. |
| `status` | string | Estado después de convertirlo; por defecto `TODO`. |
| `owner` | string | Propietario después de convertirlo; por defecto, `username` del token. |
| `priority` | string | Prioridad después de convertirla; por defecto `MEDIUM`. |
| `createdAt` | string | Fecha/hora de SQLite en formato `YYYY-MM-DD HH:MM:SS`. |

Ejemplo capturado localmente:

```json
{
  "id": 4,
  "title": "Add supplier",
  "description": "Register new supplier",
  "status": "TODO",
  "owner": "student",
  "priority": "HIGH",
  "createdAt": "2026-11-02 22:14:55"
}
```

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| `401 Unauthorized` | Header ausente o token inválido. | `{"detail":"Invalid token: invalid token"}` |
| `405 Method Not Allowed` | Se usa un método no registrado para la ruta. | `{"detail":"Method Not Allowed"}` |
| `422 Unprocessable Entity` | Falta el cuerpo. | `{"detail":[{"type":"missing","loc":["body"],"msg":"Field required","input":null}]}` |
| `422 Unprocessable Entity` | El cuerpo no contiene JSON válido. | `{"detail":[{"type":"json_invalid","loc":["body",1],"msg":"JSON decode error","input":{},"ctx":{"error":"Expecting property name enclosed in double quotes"}}]}` |
| `422 Unprocessable Entity` | El JSON es válido, pero su valor superior no es un objeto compatible con el parámetro `dict`. El cuerpo exacto depende del valor recibido. | `{"detail":[{"type":"dict_type","loc":["body"],"msg":"Input should be a valid dictionary","input":[]}]}` |
| `500 Internal Server Error` | Falla no capturada de SQLite u otra operación interna. El cuerpo genérico observado localmente fue `Internal Server Error`; puede variar con la configuración del servidor. | `Internal Server Error` |

### 6. Notas de seguridad

- Los valores SQL se parametrizan en el repositorio.
- Si se omite `owner`, se utiliza la identidad; actualmente un `owner` explícito en el cuerpo puede atribuir la tarea a otro usuario.
- El cuerpo se tipa solo como diccionario y cada campo se convierte con `str()`; no hay restricciones de longitud ni enumeraciones observables.
- La autenticación conserva las limitaciones del token legado descritas arriba.

## `GET /api/summary`

### 1. Qué hace

Resume el total de tareas, su distribución por estado y las tareas abiertas de prioridad alta para un propietario.

### 2. Autenticación

Requiere `Authorization: Bearer <token>` con el formato legado descrito en el estado del contrato.

### 3. Request

No recibe cuerpo.

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `owner` (query) | string | No | Propietario del resumen. Si falta o está vacío, se usa `username` del token. Si se envía, se usa directamente, incluso si es de otra identidad. |

Ejemplo completo:

```http
GET /api/summary?owner=student HTTP/1.1
Host: localhost:8000
Authorization: Bearer ${TOKEN}
```

### 4. Response exitosa

Estado `200 OK`.

| Campo | Tipo | Descripción |
|---|---|---|
| `owner` | string | Propietario consultado. |
| `total` | integer | Número total de tareas del propietario. |
| `byStatus` | object<string, integer> | Conteo de tareas por cada estado presente. Puede ser `{}` si no hay tareas. |
| `highPriorityOpen` | integer | Tareas con prioridad `HIGH` cuyo estado no sea `DONE` ni `ARCHIVED`. |

Ejemplo capturado localmente:

```json
{
  "owner": "student",
  "total": 3,
  "byStatus": {
    "TODO": 2,
    "IN_PROGRESS": 1
  },
  "highPriorityOpen": 2
}
```

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| `401 Unauthorized` | Header ausente o token inválido. | `{"detail":"Invalid token: invalid token"}` |
| `405 Method Not Allowed` | Se usa un método no registrado para la ruta. | `{"detail":"Method Not Allowed"}` |
| `500 Internal Server Error` | Falla no capturada durante la consulta SQLite u otra operación interna. El cuerpo genérico observado localmente fue `Internal Server Error`; puede variar con la configuración del servidor. | `Internal Server Error` |

### 6. Notas de seguridad

- El SQL usa un parámetro para `owner`, pero la consulta puede elegir cualquier propietario indicado por el cliente; parametrizar no constituye autorización.
- El comportamiento de autorización es el mismo que en `GET /api/tasks`; el token legado tampoco verifica firma, emisor ni audiencia.

## `POST /api/requirements`

### 1. Qué hace

Guarda un archivo de requerimientos en el directorio de cargas configurado y devuelve sus metadatos observados.

### 2. Autenticación

Requiere `Authorization: Bearer <token>` con el formato legado descrito en el estado del contrato.

### 3. Request

El cuerpo es `multipart/form-data`.

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `file` | archivo (`UploadFile`) | Sí | Contenido que se guarda. El nombre original se usa directamente para construir la ruta de destino. |

Ejemplo completo:

```http
POST /api/requirements HTTP/1.1
Host: localhost:8000
Authorization: Bearer ${TOKEN}
Content-Type: multipart/form-data; boundary=example-boundary

--example-boundary
Content-Disposition: form-data; name="file"; filename="requirements.txt"
Content-Type: text/plain

supplier: Example
--example-boundary--
```

### 4. Response exitosa

Estado `201 Created`.

| Campo | Tipo | Descripción |
|---|---|---|
| `owner` | string | `username` extraído del token. |
| `fileName` | string o null | Nombre que proporcionó el cliente. |
| `storedAt` | string | Ruta creada al combinar el directorio configurado con `file.filename`; el separador depende del sistema operativo. |
| `size` | integer | Número de bytes leídos y escritos. |

Ejemplo capturado localmente en Windows con `upload_dir="./uploads"`:

```json
{
  "owner": "student",
  "fileName": "requirements.txt",
  "storedAt": "uploads\\requirements.txt",
  "size": 17
}
```

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| `401 Unauthorized` | Header ausente o token inválido. | `{"detail":"Invalid token: invalid token"}` |
| `405 Method Not Allowed` | Se usa un método no registrado para la ruta. | `{"detail":"Method Not Allowed"}` |
| `400 Bad Request` | El cuerpo multipart está malformado y el parser no puede leerlo. | `{"detail":"There was an error parsing the body"}` |
| `422 Unprocessable Entity` | No se envía el campo `file`. | `{"detail":[{"type":"missing","loc":["body","file"],"msg":"Field required","input":null}]}` |
| `500 Internal Server Error` | Falla no capturada al leer/escribir el archivo u otra operación interna. El cuerpo genérico observado para una falla interna fue `Internal Server Error`; puede variar con la configuración del servidor. | `Internal Server Error` |

### 6. Notas de seguridad

- El código utiliza `file.filename` sin normalizarlo ni comprobar que el destino permanezca dentro del directorio de cargas.
- Lee todo el archivo en memoria y no impone tamaño ni extensión permitida.
- No confiar en `fileName` ni en `storedAt` como evidencia de un tipo de archivo validado.

## `GET /api/backend-health`

### 1. Qué hace

Consulta el endpoint de salud de autenticación configurado y devuelve el resultado junto con la identidad solicitante.

### 2. Autenticación

Requiere `Authorization: Bearer <token>` con el formato legado descrito en el estado del contrato.

### 3. Request

No recibe parámetros ni cuerpo. El servicio destino se configura con la variable de entorno `AUTH_HEALTH_URL`; si no está definida, el código usa `http://localhost:8080/q/health`.

Ejemplo completo:

```http
GET /api/backend-health HTTP/1.1
Host: localhost:8000
Authorization: Bearer ${TOKEN}
```

### 4. Response exitosa

Estado HTTP `200 OK`.

| Campo | Tipo | Descripción |
|---|---|---|
| `requestedBy` | string | `username` extraído del token. |
| `status` | integer | Código HTTP recibido del servicio consultado. |
| `body` | string | Cuerpo recibido, decodificado como UTF-8. |

Ejemplo capturado localmente con el servicio destino simulado:

```json
{
  "requestedBy": "student",
  "status": 200,
  "body": "{\"status\":\"UP\"}"
}
```

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| `401 Unauthorized` | Header ausente o token inválido. | `{"detail":"Invalid token: invalid token"}` |
| `405 Method Not Allowed` | Se usa un método no registrado para la ruta. | `{"detail":"Method Not Allowed"}` |

Si falla la consulta al servicio destino, el endpoint **no** responde con un estado HTTP de error: captura la excepción y responde `200 OK` con `status: 0` y el texto de la excepción en `body`. Ejemplo reproducido con una excepción simulada localmente:

```json
{
  "requestedBy": "student",
  "status": 0,
  "body": "stubbed backend failure"
}
```

### 6. Notas de seguridad

- La llamada saliente usa `GET` con timeout de 3 segundos. La respuesta del servicio destino se devuelve al cliente sin filtrar su cuerpo.
- El cuerpo de excepciones del servicio destino también se devuelve al cliente.
- La URL acepta configuración de entorno y, por defecto, apunta a localhost; controlar su valor en despliegues.
- La autenticación es la misma implementación Base64 heredada descrita arriba.

## Preguntas abiertas

- ¿Qué emisor entrega el token, cómo se distribuye el secreto y cuál es el mecanismo acordado para obtenerlo? La API actual no emite tokens.
- ¿Debe `owner` permitir acceso transversal por rol, ignorarse al diferir de la identidad o producir `403`? El comportamiento actual permite elegirlo sin validación de rol.
- ¿Qué extensiones y tamaño máximo deben aceptarse en `POST /api/requirements`?
- ¿El endpoint debe conservar errores del servicio destino como HTTP 200 con `status: 0`, o se acordará otro contrato?
- ¿Qué formato de error y logging se acordará para fallos internos? El documento refleja el comportamiento actual de FastAPI, no un contrato de error aprobado.