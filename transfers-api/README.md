# transfers-api

Template inicial de API REST con Clean Architecture.

## Estructura

- `src/transfers_api/domain/`: entidades, reglas y contratos del dominio.
- `src/transfers_api/application/`: casos de uso, DTOs y puertos.
- `src/transfers_api/infrastructure/`: adaptadores de persistencia e integraciones.
- `src/transfers_api/presentation/`: rutas y esquemas de API.
- `tests/`: pruebas unitarias, de integración y end-to-end.

Las dependencias apuntan hacia el dominio. `main.py` es el composition root
y conecta las implementaciones con sus contratos.
