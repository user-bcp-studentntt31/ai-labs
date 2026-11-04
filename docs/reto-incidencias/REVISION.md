# Revisión de incidencias

## Pedidos usados

- Seleccionar y analizar `caso-02`, preparar su JSON sin registrarlo y guardarlo en `docs/reto-incidencias/caso-02/incidencia.json`.
- Aprobar explícitamente su registro, consultar el ticket y reenviar exactamente el mismo contenido para comprobar idempotencia.
- Ejecutar el skill una vez sin indicar caso y no elegir ni inventar evidencia.
- Ejecutar el mismo skill sobre un segundo caso hasta preparar el JSON; no registrarlo.

## Resultados observados

- `caso-02`: el log JSONL contiene dos eventos `ERROR` únicos del mismo grupo; una línea repite el mismo `event_id`. El evento `WARN` de credenciales pertenece a otra correlación y quedó excluido. El JSON conserva el HTTP 503, la prioridad `P2` del contrato y redacta los valores de credenciales.
- La conversión de las horas desde `-05:00` a UTC quedó reflejada en `first_seen` y `last_seen`.
- La ejecución del skill sin caso llamó a `listar_casos` y presentó `caso-01`, `caso-02` y `caso-03`. No escogió uno ni produjo JSON o evidencia.
- No se encontró un documento de revisión S2 separado en el repositorio; se aplicaron las reglas y la comprobación del participante incluidas en la respuesta de `obtener_caso`.

## Correcciones al skill

- Se precisó que, en logs JSONL, cada línea se interpreta como un objeto independiente y que `event_id` determina la deduplicación.
- Se indicó excluir eventos de otra correlación de la evidencia y del impacto, no solo de la agrupación. Así, un rechazo de credenciales de otra operación no se presenta como causa.
- Se reforzó conservar el HTTP observado, identificar la dependencia por su campo y redactar credenciales incluso si son ficticias.

## Registro

- ID devuelto al registrar: `INC-3BB5979DDB41`, con `created: true`.
- Consulta por ese ID: el MCP devolvió el ticket y el objeto de incidencia coincide con el contenido preparado.
- Reintento con el mismo objeto aprobado: el MCP devolvió `INC-3BB5979DDB41` con `created: false`; no creó un ticket duplicado.

## Pendientes

- El participante debe elegir `caso-01` o `caso-03` para continuar el segundo análisis. Hasta entonces no se ha obtenido su log ni se ha preparado un JSON.
- Tras la selección, generar únicamente el JSON del segundo caso; no registrarlo.