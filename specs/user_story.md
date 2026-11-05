**Historia de usuario — H-AUTH-01: Consultas parametrizadas en el login**

Como usuario del servicio de autenticación, quiero que mis credenciales se validen mediante una consulta SQL parametrizada, para impedir que entradas maliciosas alteren la consulta y permitan un acceso no autorizado.

**Criterios de aceptación**

- `LegacyDatabase.findByCredentials` usa un `PreparedStatement` y parámetros para `username` y `password`; no concatena esos valores en el SQL.
- En `POST /auth/login`, las credenciales `student` y `Workshop123!` siguen respondiendo `200`, con `user.username` y `token`.
- Si el usuario o la contraseña contiene `' OR '1'='1`, el login responde `401` y no devuelve `token`.
- `AuthResourceTest` incluye una prueba del intento de inyección y `mvn test` pasa ejecutado desde `auth/`.