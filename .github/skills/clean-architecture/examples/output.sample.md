# Clean Architecture -> Project Folder Template

## 1. Summary
Template para `transfers-api`: API REST en Python 3.12 con FastAPI,
persistencia SQL (SQLite en desarrollo, PostgreSQL en producción) y
capas domain, application, infrastructure y presentation.
Casos de uso: `CreateTransfer`, `ConfirmTransfer`, `GetTransferSummary`.

## 2. Árbol de carpetas
```text
transfers-api/
├── src/
│   └── transfers_api/
│       ├── domain/
│       │   ├── entities/
│       │   │   ├── transfer.py
│       │   │   └── account.py
│       │   ├── exceptions.py
│       │   └── repositories/
│       │       └── transfer_repository.py      # puerto (interfaz)
│       ├── application/
│       │   ├── use_cases/
│       │   │   ├── create_transfer.py
│       │   │   ├── confirm_transfer.py
│       │   │   └── get_transfer_summary.py
│       │   ├── dto/
│       │   └── ports/
│       ├── infrastructure/
│       │   ├── persistence/
│       │   │   └── sql_transfer_repository.py  # implementa el puerto
│       │   ├── config/
│       │   └── external/
│       ├── presentation/
│       │   ├── api/
│       │   │   └── transfers_router.py
│       │   └── schemas/
│       └── main.py                              # composition root
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
├── pyproject.toml
└── README.md
```

## 3. Responsabilidad por carpeta
| Carpeta | Responsabilidad | Puede depender de | No debe depender de |
|---------|-----------------|-------------------|---------------------|
| `domain/` | Entidades, reglas de negocio, excepciones, puertos | Nada externo | `application/`, `infrastructure/`, `presentation/` |
| `application/` | Casos de uso, DTOs, puertos de salida | `domain/` | `infrastructure/`, `presentation/` |
| `infrastructure/` | Persistencia, clientes externos, configuración | `application/`, `domain/` | `presentation/` |
| `presentation/` | Rutas FastAPI, esquemas de entrada y salida | `application/` | `infrastructure/` directamente |
| `main.py` | Conecta implementaciones con interfaces | Todas las capas | — |
| `tests/` | Pruebas por nivel | Todas las capas | — |

## 4. Regla de dependencias
```text
presentation  ->  application  ->  domain
infrastructure ->  application  ->  domain
main.py       ->  (todas, solo para inyección)
```

## 5. Archivos placeholder
- `domain/entities/__init__.py`, `application/dto/.gitkeep`, `application/ports/.gitkeep`: indicadores vacíos.
- `infrastructure/config/.gitkeep`, `infrastructure/external/.gitkeep`: indicadores vacíos.
- `presentation/schemas/.gitkeep`: indicador vacío.
- `tests/unit/.gitkeep`, `tests/integration/.gitkeep`, `tests/e2e/.gitkeep`: indicadores vacíos.
- `main.py`: solo crea la aplicación FastAPI, sin lógica de negocio.

## 6. Convenciones de nombres
- Módulos y funciones en `snake_case` (`create_transfer.py`, `confirm_transfer`).
- Clases en `PascalCase` (`Transfer`, `CreateTransfer`).
- Puertos sin prefijo de implementación; adaptadores con prefijo del tecnológico (`SqlTransferRepository`).

## 7. Archivos de configuración sugeridos
- `.gitignore`: `.venv/`, `__pycache__/`, `.env`.
- `.env.example`: `DATABASE_URL=sqlite:///./dev.db` (valor ficticio).
- `pyproject.toml`: configuración de ruff y pytest.

## 8. Comandos de verificación
```powershell
tree /F transfers-api
python -m pytest tests -q
```
Resultado esperado: el árbol coincide con la sección 2 y pytest responde `no tests ran` sin errores.

## 9. Preguntas abiertas
- ¿El puerto de persistencia debe ser síncrono o asíncrono?
- ¿La confirmación se guarda como estado de `Transfer` o como entidad separada?
- ¿Se requiere una capa de eventos (`application/events/`) desde el inicio?
- ¿Qué base de datos usará producción y qué versión mínima?
