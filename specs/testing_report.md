# Informe de pruebas — H-AUTH-01

**Componente:** `auth`  
**Objetivo:** comprobar que el login usa consultas parametrizadas y rechaza intentos de inyección SQL.  
**Estado:** **no probado en ejecución**. No se ejecutaron herramientas ni comandos; por tanto, no hay resultados de compilación, pruebas ni cobertura que puedan verificarse.

## Revisión estática del material proporcionado

En los fragmentos incluidos en el historial:

- `findByCredentials` usa `PreparedStatement` con `username = ? AND password = ?` y asigna ambos valores mediante `setString`.
- La prueba de credenciales válidas espera `200`, `user.username == "student"` y un `token`.
- La prueba de inyección envía el valor `' OR '1'='1` tanto como usuario como contraseña, y espera `401` sin la clave `token`.

Esta revisión se limita a los fragmentos proporcionados: **no confirma que sean los archivos actuales del repositorio ni que compilen o pasen al ejecutarse**.

## Casos de prueba

| Caso | Entrada/escenario | Resultado esperado | Resultado |
|---|---|---|---|
| Camino feliz | Usuario `student`, contraseña `Workshop123!` | `200`, `user.username` igual a `student` y `token` presente | No ejecutado |
| Inyección en usuario | Usuario `' OR '1'='1`, contraseña válida | `401` y sin `token` | No ejecutado |
| Inyección en contraseña | Usuario válido, contraseña `' OR '1'='1` | `401` y sin `token` | No ejecutado |
| Credenciales incorrectas | Usuario o contraseña incorrectos | Rechazo de autenticación; sin `token` | No ejecutado; no aparece en los fragmentos como caso específico |
| Entradas vacías o campos ausentes | Credenciales vacías o incompletas | Rechazo controlado, sin `token` | No ejecutado; comportamiento por verificar |
| Error de base de datos | Fallo al obtener conexión o ejecutar consulta | Error controlado; sin autenticación concedida | No ejecutado; comportamiento por verificar |

## Comandos y resultados

**Comandos ejecutados:** ninguno.

Los siguientes comandos quedan pendientes de ejecución desde el directorio `auth/`:

```bash
mvn -Dtest=AuthResourceTest test
mvn test
```

**Resultado real:** no disponible. No se puede afirmar que `AuthResourceTest` ni `mvn test` pasen. Tampoco se dispone de cobertura ejecutada.

## Criterios de aceptación

- [x] **Revisión estática del fragmento:** muestra `PreparedStatement` y parámetros para usuario y contraseña, sin concatenarlos en el SQL.
- [ ] **Login válido:** respuesta `200` con `user.username` y `token`, pendiente de ejecución.
- [ ] **Inyección en usuario y contraseña:** respuesta `401` sin `token`, pendiente de ejecución.
- [ ] **Prueba de inyección en `AuthResourceTest`:** aparece en el fragmento proporcionado; falta confirmar que corresponda al archivo actual y que se ejecute.
- [ ] **`mvn test` desde `auth/`:** pendiente de ejecución.

## Observaciones y bloqueos

Los fragmentos indican rutas bajo `com/bcp/workshop/auth`, pero declaran el paquete `pe.bcp.login.service`. No se puede determinar con el material disponible si esa diferencia es intencional o si causa un problema de integración; debe contrastarse con el código real y la configuración del proyecto.

**Conclusión:** la implementación y las pruebas presentadas parecen cubrir los criterios principales en una revisión estática, pero la tarea **no puede marcarse como probada** hasta ejecutar los comandos pendientes y registrar sus resultados reales.