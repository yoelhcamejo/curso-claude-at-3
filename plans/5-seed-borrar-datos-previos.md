# 5 - Seed no borra datos previos

- **Tipo:** bugfix
- **Issue:** #5

## Objetivo

Que `npm run seed` deje la base de datos exactamente en el estado de los datos de prueba.

- **Comportamiento actual:** `packages/api/src/scripts/seed.ts` solo inserta (`INSERT OR IGNORE`) y omite los empleados que ya existen (`findByEmail`), así que los datos añadidos o modificados a mano en `resttek.db` se conservan tras ejecutarlo.
- **Comportamiento esperado:** el seed vacía primero todas las tablas y después las rellena como hasta ahora.

## Alcance

**Incluye:**
- Una función `clearDatabase(db)` que vacía las 7 tablas de la API (`order_items`, `orders`, `dish_ingredients`, `dishes`, `ingredients`, `employees`, `restaurants`) en un orden compatible con las claves foráneas y dentro de una transacción.
- Tests con Vitest de esa función, contra la base de datos en memoria (`NODE_ENV=test`).
- Llamar a `clearDatabase` al principio de `seed.ts` y quitar las comprobaciones de "ya existe" de los empleados, que dejan de tener sentido.
- Actualizar la documentación que dice que el seed es idempotente / que no borra datos (`README.md` y `CLAUDE.md`).

**No incluye:**
- Cambiar los datos de prueba que inserta el seed ni sus credenciales.
- Sustituir `INSERT OR IGNORE` por `INSERT` en el resto de inserciones del seed.
- Borrar y recrear el fichero `resttek.db` o el esquema (las tablas se mantienen; solo se borran sus filas).
- Cambios en los frontends o en los endpoints de la API.

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/src/scripts/clearDatabase.ts` | crear | Función `clearDatabase(db: Database)` con la lista ordenada de tablas y el borrado en transacción. Separada de `seed.ts` porque `seed.ts` se ejecuta al importarse y no se puede testear. |
| `packages/api/src/scripts/clearDatabase.test.ts` | crear | Tests: vacía todas las tablas, respeta las claves foráneas y cubre todas las tablas que existen en `sqlite_master`. |
| `packages/api/src/scripts/seed.ts` | modificar | Llamar a `clearDatabase(dbConfig)` tras `initialize()` y simplificar la creación del admin y los empleados (sin `findByEmail`). |
| `README.md` | modificar | La línea 113 dice que el seed usa `INSERT OR IGNORE` y se puede ejecutar varias veces sin duplicar; pasará a avisar de que borra todos los datos. |
| `CLAUDE.md` | modificar | El comando `npm run seed` se describe como "INSERT OR IGNORE, idempotente". |

## Tareas

Cada tarea debe poder hacerse en 5-10 minutos. Las tareas están agrupadas por aplicación (paquete del monorepo). Los bloques A y B son independientes (no comparten archivos) y pueden hacerse en paralelo; la verificación final se hace cuando ambos estén terminados.

### A. API (`packages/api`)

- [x] 1. Test (rojo): en `clearDatabase.test.ts`, inicializar un `Database` en memoria, insertar un restaurante, un empleado, un ingrediente, un plato con su `dish_ingredients`, un pedido y un `order_item`, llamar a `clearDatabase` y comprobar que `SELECT COUNT(*)` es 0 en las 7 tablas.
- [x] 2. Implementar `clearDatabase.ts` (verde): `BEGIN`, `DELETE FROM` de cada tabla en orden hijo → padre (`order_items`, `orders`, `dish_ingredients`, `dishes`, `ingredients`, `employees`, `restaurants`), `COMMIT`, y `ROLLBACK` + relanzar el error si algo falla.
- [x] 3. Test: comprobar que la lista de tablas de `clearDatabase` incluye todas las tablas de usuario de `sqlite_master` (excluyendo `sqlite_%`), para que el test falle si se añade una tabla nueva y no se incluye. Exportar la lista (p. ej. `TABLES_IN_DELETE_ORDER`) si hace falta.
- [x] 4. Test: con la base de datos vacía, `clearDatabase` no lanza error (el seed sobre una BD nueva debe funcionar).
- [ ] 5. Modificar `seed.ts`: importar `clearDatabase` y llamarlo justo después de `dbConfig.initialize()`, con un `console.log('Database cleared.')`.
- [ ] 6. Simplificar en `seed.ts` la creación del admin y de los empleados: quitar los `findByEmail` y las ramas "already exists", ya que la tabla siempre está vacía.
- [ ] 7. Verificar el seed real: ejecutar `npm run seed` dos veces seguidas, añadiendo antes de la segunda un dato a mano (p. ej. un ingrediente), y comprobar con `sqlite3` o un script que tras la segunda ejecución el dato no existe y los conteos coinciden con la primera (2 restaurantes, 10 empleados, 8 ingredientes, 7 platos, 1 pedido).
- [ ] 8. Verificación de la API: `npx tsc --noEmit -p tsconfig.json` sin errores y `npm test` en verde.

### B. Documentación (raíz del monorepo)

- [ ] 9. Actualizar `README.md` (sección del seed, línea "`seed` usa `INSERT OR IGNORE`…"): el seed borra todos los datos de la BD local antes de poblarla.
- [ ] 10. Actualizar `CLAUDE.md` (comando `npm run seed`): sustituir "INSERT OR IGNORE, idempotente" por que vacía las tablas y vuelve a poblarlas.

### Frontends (`web-admin`, `web-empleados`, `web-clientes`, `web-shared`)

Sin cambios: el bug solo afecta al script de seed de la API.

### Verificación final

- [ ] 11. Con los bloques A y B integrados: `npm test` en verde, comprobación de tipos de la API sin errores y documentación coherente con el nuevo comportamiento del seed.

## Criterios de aceptación

- [ ] Tras ejecutar `npm run seed`, cualquier fila añadida o modificada a mano antes desaparece y la BD contiene solo los datos de prueba.
- [ ] Ejecutar `npm run seed` varias veces seguidas deja siempre los mismos conteos por tabla (sin duplicados de platos, ingredientes ni pedidos).
- [ ] `npm run seed` funciona sobre una base de datos nueva (sin `resttek.db` previo).
- [ ] El seed imprime las mismas credenciales y todas siguen siendo válidas para iniciar sesión (contraseña = email).
- [ ] Los tests de `clearDatabase.test.ts` pasan y fallan si se añade una tabla al esquema sin incluirla en el borrado.
- [ ] `npm test` y la comprobación de tipos de la API pasan (jobs del CI en verde).
- [ ] `README.md` y `CLAUDE.md` ya no describen el seed como idempotente/no destructivo.

## Dudas y decisiones tomadas

### Dudas
- Ninguna que bloquee la implementación.

### Decisiones tomadas
- La issue menciona `api/src/scripts/seed.py`, pero el script real es `packages/api/src/scripts/seed.ts` — *Motivo:* no existe ningún `seed.py` en el repositorio.
- Borrar filas con `DELETE FROM` en orden hijo → padre, en lugar de borrar el fichero `resttek.db` o desactivar `PRAGMA foreign_keys` — *Motivo:* mantiene el esquema y las claves foráneas activas, y una transacción garantiza que no se quede la BD a medio vaciar.
- Extraer el borrado a `clearDatabase.ts` — *Motivo:* `seed.ts` se ejecuta al importarse (`seed()` al final del módulo) y no se puede testear con Vitest; la función aislada sí.
- Lista de tablas explícita más un test contra `sqlite_master`, en lugar de calcularla dinámicamente — *Motivo:* el orden de borrado depende de las claves foráneas; el test avisa si se añade una tabla nueva.
- No añadir una confirmación interactiva ni un flag `--force` antes de borrar — *Motivo:* la issue pide que el seed resetee siempre la BD, y solo actúa sobre la base de datos local de desarrollo. Revisar si se quiere esa protección.
- Agrupar las tareas por aplicación (API y documentación, más una verificación final) — *Motivo:* petición del usuario; permite repartir los bloques entre agentes con `implement-plan`, ya que no comparten archivos.
- Mantener `INSERT OR IGNORE` en el resto del seed — *Motivo:* tras el borrado es inofensivo y cambiarlo queda fuera del alcance del bug.

