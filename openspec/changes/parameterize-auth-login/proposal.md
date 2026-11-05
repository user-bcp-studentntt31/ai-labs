# Proposal

## Why

El Issue #23 de `user-bcp-studentntt31/ai-labs` identifica una vulnerabilidad alta en el inicio de sesión de `auth`: entradas de usuario manipuladas pueden alterar la consulta de credenciales y permitir autenticarse sin conocer la contraseña. Corregirlo reduce el riesgo de acceso no autorizado sin cambiar el contrato de `POST /auth/login`.

## What Changes

- Evitar que valores de usuario o contraseña alteren la consulta utilizada para autenticar.
- Rechazar credenciales inválidas, incluidas entradas con sintaxis de inyección SQL, con `401` y sin emitir un token.
- Preservar el inicio de sesión válido y la respuesta observable que requiere el Issue.

## Capabilities

### New Capabilities

- `user-auth`: Comportamiento observable del inicio de sesión y rechazo seguro de credenciales inválidas.

### Modified Capabilities

- Ninguna. No hay capacidades existentes en `openspec/specs/` para modificar.

## Impact

- Alcance funcional limitado a `auth/` y sus pruebas.
- Se conserva `POST /auth/login`; un inicio de sesión válido continúa respondiendo `200` e incluye `user.username` y `token`.
- `docs/ENDPOINTS.md` no documenta `/auth/login`, por lo que no define sus respuestas. La compatibilidad observable se acota a la respuesta de inicio válido indicada por el Issue; el rechazo `401` sin token para credenciales inválidas es el comportamiento de seguridad solicitado por el Issue, no un cambio de endpoint.
- Fuera de alcance: `api/`, `web/`, nuevos endpoints, cambios de formato o ciclo de vida del token, y refactorizaciones generales de autenticación.
