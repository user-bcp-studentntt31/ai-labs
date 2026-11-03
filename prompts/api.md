AMBITO
Workspace ai-labs abierto en su raíz. Lee código solo en auth/.
Todas las rutas parten de la raíz. Lee README.md, RETO.md y docs/
generales. Este pedido es de solo lectura: no escribas archivos ni ejecutes
pruebas. Git se ejecuta desde la raíz; las pruebas propuestas usarían cwd auth/.
No leas ni modifiques código de api/ ni web/. Usa IDs H-AUTH-NN y componente auth.

CONTEXTO
Analiza la autenticación implementada por el componente auth. Lee README.md,
RETO.md y docs/ENDPOINTS.md si existe. Descubre en el código cuáles son los
puntos de entrada y sigue el flujo de autenticación hasta sus dependencias:
validación de credenciales, consulta a SQLite y, si corresponde, creación o
validación de tokens. No des por cierta la lista de funcionalidades de RETO.md
ni supongas que existen rutas o mecanismos que no encuentres en el código.

OBJETIVO
Determinar cómo procesa el componente auth las entradas no confiables durante
la autenticación y si alguna llega concatenada a una consulta SQL. Describe
también el manejo de tokens solo si el código lo implementa.

RESTRICCIONES
No edites código ni ejecutes ataques contra servicios remotos. Usa solo el
código existente y, al proponer pruebas, datos ficticios locales. Si falta un
archivo o no puedes verificar algo, indícalo. No cambies contratos ni leas
otros componentes.

CRITERIOS DE ACEPTACIÓN
- Identifica las rutas y el recorrido de la autenticación que encuentres,
  desde la entrada HTTP hasta la consulta SQL y las operaciones de token
  que estén implementadas.
- Sustenta cada recorrido con archivo y línea.
- Distingue entre concatenación, parametrización y aspectos no comprobados;
  no infieras seguridad solo por nombres o documentación.
- Propón pruebas locales para credenciales válidas, inválidas y una entrada
  con comilla, indicando el resultado esperado según el contrato observado.
- Si hay manejo de tokens, propone cómo verificar los comportamientos
  observables relevantes, sin inventar requisitos que no estén en el código.
- No afirmes que una prueba se ejecutó ni que pasó si solo la propones.

FORMATO DE RESPUESTA
Tabla: afirmación | evidencia archivo:línea | comprobado o hipótesis |
prueba propuesta.
Termina con preguntas abiertas y comandos no ejecutados.