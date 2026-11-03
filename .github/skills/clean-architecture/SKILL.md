---
name: clean-architecture
description: Genera una estructura de carpetas (template) para iniciar un proyecto con Clean Architecture, separando capas domain, application, infrastructure y presentation, con su regla de dependencias, archivos placeholder y pruebas.
---

# Skill: Clean Architecture -> Project Folder Template

## 1) Metadata
- **Skill ID:** clean-architecture
- **Version:** 0.1.0
- **Purpose:** Generar una estructura de carpetas base (template) para iniciar un proyecto con Clean Architecture, con responsabilidades claras por capa y una regla de dependencias explícita, sin implementar lógica de negocio.
- **Audience (roles):** Tech Lead, Backend, Frontend, QA
- **When to use:** Al iniciar un proyecto nuevo o al reorganizar un proyecto existente hacia capas independientes del framework.
- **When NOT to use:** Scripts triviales, prototipos desechables, o proyectos con una estructura ya establecida que no se desea mover.
- **Sensitive inputs:** No incluyas credenciales, secretos, tokens, cadenas de conexión reales ni URLs internas. Usa placeholders como `{NOMBRE_DEL_PROYECTO}`.
- **Expected output:** Markdown estructurado mediante la sección Output a continuación.

## 2) Inputs
Proporciona la información en este formato:

- **Nombre del proyecto:**
- **Stack / lenguaje:** (p. ej. Python, Java, TypeScript/Angular)
- **Tipo de aplicación:** (API REST, web, CLI, mixta)
- **Persistencia:** (SQL, NoSQL, archivos, ninguna)
- **Entidades o casos de uso principales:** (opcional; si faltan, se usan placeholders)
- **Convenciones existentes:** (naming, paquetes, herramientas de calidad; opcional)
- **Ruta destino del template:**

## 3) Output
Devuelve **solo** un documento Markdown con estas secciones y bullets:

1. **Summary** (stack, tipo de aplicación y capas incluidas)
2. **Árbol de carpetas** (bloque de código con la estructura completa, adaptada al stack)
    - `domain/`: entidades, value objects, interfaces de repositorio (puertos) y excepciones de negocio. Sin dependencias externas.
    - `application/`: casos de uso, servicios de aplicación, DTOs y puertos de salida. Depende solo de `domain/`.
    - `infrastructure/`: implementaciones de persistencia, clientes externos, configuración y adaptadores. Implementa los puertos de `application/`.
    - `presentation/`: controladores o rutas, esquemas de entrada/salida y middlewares. Invoca casos de uso de `application/`.
    - `composition root` (archivo de arranque): único lugar que conecta implementaciones con interfaces.
    - `tests/`: separado en `unit/`, `integration/` y `e2e/` (o equivalente del stack).
3. **Responsabilidad por carpeta** (tabla: carpeta, responsabilidad, puede depender de, no debe depender de)
4. **Regla de dependencias** (diagrama de flechas: `presentation -> application -> domain` e `infrastructure -> application/domain`)
5. **Archivos placeholder** (archivo indicador por carpeta, como `README.md` o `.gitkeep`, y archivo de entrada; sin lógica de negocio)
6. **Convenciones de nombres** (según el stack declarado)
7. **Archivos de configuración sugeridos** (p. ej. `.gitignore`, `.env.example` con valores de ejemplo, configuración de calidad y pruebas)
8. **Comandos de verificación** (cómo listar el árbol y ejecutar la suite de pruebas vacía)
9. **Preguntas abiertas**

## 4) Constraints
- No inventes entidades ni requisitos de negocio: si faltan, usa placeholders (`{Entidad}`) e inclúyelos en **Preguntas abiertas**.
- Genera solo estructura y archivos placeholder; no escribas lógica de negocio ni código funcional.
- No propongas frameworks ni herramientas fuera del stack declarado; si el stack no se indica, pregunta antes de elegirlo.
- Respeta la convención de nombres del lenguaje (p. ej. `snake_case` en Python, paquetes en minúsculas en Java, `kebab-case` en archivos Angular).
- No incluyas datos sensibles ni secretos; en `.env.example` usa solo valores ficticios.
- Mantén la salida en un máximo de 1-2 páginas para que siga siendo usable.

## 5) Validation Rules
La salida es válida si:
- Incluye todas las secciones definidas en Output.
- Contiene las capas `domain`, `application`, `infrastructure` y `presentation`, o explica por qué una capa no aplica.
- La regla de dependencias no admite imports en sentido contrario: `domain` no depende de ninguna otra capa y `application` no depende de `infrastructure` ni de `presentation`.
- Cada carpeta del árbol tiene un archivo indicador (`README.md` o `.gitkeep`) o contenido real.
- Las pruebas están separadas al menos en `unit/` e `integration/`.
- Incluye al menos 3 preguntas abiertas cuando falte información del stack o del dominio; si no falta nada, indícalo explícitamente.
- No contiene datos sensibles ni secretos.
- No contiene supuestos no declarados.

## 6) Evidence
Adjunta o referencia estos elementos en el PR o entrega:
- `SKILL.md` versionado.
- `examples/input.sample.md`: ejemplo de entrada válido. Úsalo como guía para completar los Inputs (sección 2); la entrada completa (`transfers-api`) y la mínima con placeholders muestran cómo tratar los campos vacíos.
- `examples/output.sample.md`: ejemplo de salida válido. Úsalo como guía de formato y contenido para las 9 secciones de Output; la salida generada debe tener la misma estructura de secciones, tablas y bloques de código.
- Árbol de carpetas generado, con la misma forma que el de la sección 2 del ejemplo de salida.
- Salida del comando de verificación del árbol (p. ej. `tree /F` en Windows o `find . -type d` en Unix) y de la suite de pruebas vacía ejecutada sin errores.
- Tag de versión para el Skill, como `skill-clean-architecture-v0.1.0`.