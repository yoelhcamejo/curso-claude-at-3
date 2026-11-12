# 6 - Gestión de mesas

- **Tipo:** feature
- **Issue:** #6

## Objetivo

Que los restaurantes gestionen sus mesas y que los pedidos queden asociados a una mesa real:

- **Administrador** (`web-admin`): CRUD de las mesas de cada restaurante (id, número, descripción, capacidad y estado: libre, ocupada, reservada).
- **Cliente** (`web-clientes`): al elegir restaurante indica el número de personas, ve las mesas libres con capacidad suficiente, elige una y al pulsar "Continuar" la mesa pasa a ocupada y va a la carta; el pedido se envía con esa mesa.
- **Empleados** (`web-empleados`): ven el estado de las mesas, pueden cambiarlo y ven el estado de los pedidos de las mesas ocupadas.

Hoy `orders.table_id` es un texto libre que la app de clientes siempre envía como `null`, y no existe el concepto de mesa.

## Alcance

**Incluye:**
- API (estilo **por capas**, como `ingredient`): tabla `restaurant_tables`, modelo, repositorio SQLite, servicio, controlador y rutas; ocupación atómica de la mesa; nuevos errores de dominio y su mapeo HTTP; mesas de ejemplo en el seed.
- `web-admin`: feature `tables` (listado, alta, edición y borrado) y enlace "Mesas" en el menú de cada restaurante.
- `web-empleados`: feature `tables` con la página `/mesas` (estado de las mesas, cambio de estado y pedidos activos de las mesas ocupadas) y enlace en el menú.
- `web-clientes`: paso de selección de mesa entre la lista de restaurantes y la carta, y envío del `tableId` al crear el pedido.
- Documentación: `docs/dominio/modelo-datos.md`, `docs/dominio/glosario.md` y la tabla de endpoints de `docs/arquitectura/arquitectura-api.md`.

**No incluye:**
- Liberar la mesa automáticamente al pagar o al entregar el pedido (la liberan los empleados cambiando el estado).
- Reservas con fecha/hora: `reservada` es solo un estado que ponen administradores o empleados.
- Restringir a un manager/camarero a las mesas de su propio restaurante (los endpoints actuales tampoco lo hacen).
- Control de acceso por rol a las páginas de `web-empleados` (es la issue #2).
- Unir mesas o cambiar de mesa un pedido existente.
- Especificación OpenAPI (issue #7).

## Contrato de la API

Fijado aquí para que los bloques de frontend puedan hacerse en paralelo con el de la API.

`Table`: `{ id, restaurantId, number, description, capacity, status, createdAt, updatedAt }`, con `status` ∈ `libre | ocupada | reservada`.

| Método | Ruta | Roles | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/v1/restaurants/:restaurantId/tables` | admin, manager, camarero, cocinero | Listado de mesas (ordenado por `number`) |
| `GET` | `/api/v1/restaurants/:restaurantId/tables/:id` | admin, manager, camarero, cocinero | Detalle |
| `POST` | `/api/v1/restaurants/:restaurantId/tables` | admin | Crear (`number`, `description`, `capacity`; nace `libre`) |
| `PUT` | `/api/v1/restaurants/:restaurantId/tables/:id` | admin | Editar `number`, `description`, `capacity`, `status` |
| `DELETE` | `/api/v1/restaurants/:restaurantId/tables/:id` | admin | Borrar (no se permite si está `ocupada`) |
| `PATCH` | `/api/v1/restaurants/:restaurantId/tables/:id/status` | admin, manager, camarero | Cambiar solo el estado (`{ status }`) |
| `GET` | `/api/v1/public/restaurants/:restaurantId/tables/available?people=N` | público | Mesas `libre` con `capacity >= N`, ordenadas por capacidad y número |
| `POST` | `/api/v1/restaurants/:restaurantId/tables/:id/occupy` | cliente | Ocupa la mesa solo si está `libre`; si no, 409 |

Errores: `TableNotFoundError` → 404; `TableNotAvailableError`, `DuplicatedTableNumberError` y `TableOccupiedError` → 409; validaciones (`InvalidTableStatusError`, `InvalidTableCapacityError`, `InvalidTableNumberError`, `InvalidPeopleCountError`) → 400.

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/src/config/database.ts` | modificar | Nueva tabla `restaurant_tables` en `runInitialMigrations()` con `UNIQUE(restaurant_id, number)`. |
| `packages/api/src/models/table.model.ts` | crear | Interfaz `Table`, `TableStatusType` y `normalizeTableStatus()`. |
| `packages/api/src/errors/DomainErrors.ts` | modificar | Errores de mesa. |
| `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | modificar | `TableNotFoundError` en `NOT_FOUND_ERRORS` y nueva lista `CONFLICT_ERRORS` → 409. |
| `packages/api/src/repositories/table.repository.ts` | crear | Interfaz `TableRepository` + `SqliteTableRepository` (incluye `occupyIfFree` atómico). |
| `packages/api/src/repositories/table.repository.test.ts` | crear | Tests del repositorio contra SQLite en memoria. |
| `packages/api/src/repositories/mocks/MockTableRepository.ts` | crear | Mock en memoria para los tests del servicio. |
| `packages/api/src/services/table.service.ts` | crear | Validación, CRUD, cambio de estado, disponibles y ocupación. |
| `packages/api/src/services/table.service.test.ts` | crear | Tests del servicio. |
| `packages/api/src/controllers/table.controller.ts` | crear | Controlador HTTP de mesas. |
| `packages/api/src/routes/table.routes.ts` | crear | Rutas autenticadas con `authorize`. |
| `packages/api/src/routes/table.public.routes.ts` | crear | Ruta pública de mesas disponibles. |
| `packages/api/src/app.ts` | modificar | Montar las dos rutas nuevas. |
| `packages/api/src/scripts/seed.ts` | modificar | Mesas de ejemplo para `rest-1` y `rest-2` y `table_id` real en el pedido de ejemplo. |
| `packages/web-admin/src/app/features/tables/**` | crear | `models/`, `services/`, `store/`, `pages/table-list`, `pages/table-form` y `tables.routes.ts`. |
| `packages/web-admin/src/app/features/tables/store/table.store.spec.ts` | crear | Tests unitarios del store (Vitest). |
| `packages/web-admin/src/app/app.routes.ts` | modificar | Ruta `restaurants/:restaurantId/tables`. |
| `packages/web-admin/src/app/core/layout/shell.component.html` | modificar | Enlace "Mesas" en el submenú del restaurante. |
| `packages/web-empleados/src/app/features/tables/**` | crear | `models/`, `services/`, `store/` y `pages/mesas`. |
| `packages/web-empleados/src/app/app.routes.ts` | modificar | Ruta `/mesas`. |
| `packages/web-empleados/src/app/core/layout/shell.component.html` | modificar | Enlace "Mesas" en el menú. |
| `packages/web-clientes/src/app/core/models/table.model.ts` | crear | Modelo `Table`. |
| `packages/web-clientes/src/app/core/services/table.service.ts` | crear | `getAvailable(restaurantId, people)` y `occupy(restaurantId, tableId)`. |
| `packages/web-clientes/src/app/core/store/cart.store.ts` | modificar | Guardar la mesa elegida (`tableId`, `tableNumber`) por restaurante. |
| `packages/web-clientes/src/app/features/tables/table-selection.component.ts` | crear | Nº de personas, mesas disponibles, selección y "Continuar". |
| `packages/web-clientes/src/app/app.routes.ts` | modificar | Ruta `restaurants/:id/mesa`. |
| `packages/web-clientes/src/app/features/restaurants/restaurant-list.component.ts` | modificar | El enlace del restaurante va a la selección de mesa. |
| `packages/web-clientes/src/app/features/menu/restaurant-menu.component.ts` | modificar | Si no hay mesa elegida para ese restaurante, redirigir a la selección; mostrar la mesa. |
| `packages/web-clientes/src/app/core/services/order.service.ts` | modificar | Enviar `tableId` en lugar de `null`. |
| `packages/web-clientes/src/app/features/cart/cart.component.ts` | modificar | Pasar el `tableId` del `CartStore` al crear el pedido. |
| `docs/dominio/modelo-datos.md` | modificar | Tabla `restaurant_tables`, relación con `restaurants` y significado de `orders.table_id`. |
| `docs/dominio/glosario.md` | modificar | Término "Mesa" y sección "Estados de Mesa". |
| `docs/arquitectura/arquitectura-api.md` | modificar | Endpoints de mesas y `table` en la lista de dominios por capas. |

## Tareas

Cada tarea debe poder hacerse en 5-10 minutos. Las tareas están agrupadas por aplicación (paquete del monorepo). El bloque A (API) es la base; los bloques B, C y D (frontends) usan el **contrato de la API** de arriba y pueden hacerse en paralelo con A y entre sí, porque no comparten archivos; su verificación con datos reales requiere A terminado. El bloque E (documentación) es independiente. La integración final se hace al terminar todos.

### 0. Contrato de la API (todos los agentes)

- [x] 0. Redactar `docs/api/openapi.yml` (OpenAPI 3) con los endpoints, esquemas y errores de mesas a partir del contrato de arriba, validarlo con Redocly (`bash .claude/skills/actualizar-docs-api/scripts/generar_docs.sh --solo-validar`) y que los cuatro agentes (API, web-admin, web-empleados y web-clientes) den su OK. No se empieza ninguna otra tarea hasta tener el OK de todos.

### A. API (`packages/api`)

- [ ] 1. Test (rojo) de `normalizeTableStatus()` en `services/table.service.test.ts`: acepta `libre`/`ocupada`/`reservada` con trim y lowercase, y lanza `InvalidTableStatusError` con valores vacíos o desconocidos.
- [ ] 2. Crear `models/table.model.ts` (interfaz `Table`, `TableStatusType`, `normalizeTableStatus`) y los errores de mesa en `DomainErrors.ts` (verde).
- [ ] 3. Añadir la tabla `restaurant_tables` en `runInitialMigrations()` (`id`, `restaurant_id` FK, `number` INTEGER, `description`, `capacity` INTEGER, `status` TEXT DEFAULT `'libre'`, `created_at`, `updated_at`, `UNIQUE(restaurant_id, number)`).
- [ ] 4. Test (rojo) de `SqliteTableRepository` en `table.repository.test.ts` (BD en memoria): `save` + `findById`, `findByRestaurantId` ordenado por `number` y `delete`.
- [ ] 5. Implementar `repositories/table.repository.ts` (interfaz + `SqliteTableRepository`) con esos métodos (verde).
- [ ] 6. Test + implementación de `findAvailable(restaurantId, people)`: solo `libre` y `capacity >= people`, ordenado por `capacity` y `number`.
- [ ] 7. Test + implementación de `occupyIfFree(id)`: `UPDATE ... SET status='ocupada' WHERE id = ? AND status = 'libre'` devolviendo `true/false` según `changes`, para que dos clientes no ocupen la misma mesa.
- [ ] 8. Crear `repositories/mocks/MockTableRepository.ts` siguiendo `MockIngredientRepository`.
- [ ] 9. Test + implementación de `TableService.create`: valida `number` entero > 0, `capacity` entero > 0 y `restaurantId`; nace `libre`; lanza `DuplicatedTableNumberError` si el número ya existe en el restaurante.
- [ ] 10. Test + implementación de `TableService.update`, `getById`, `getByRestaurant` y `delete` (404 si no existe; `TableOccupiedError` al borrar una mesa `ocupada`).
- [ ] 11. Test + implementación de `TableService.changeStatus(id, status)` con `normalizeTableStatus`.
- [ ] 12. Test + implementación de `TableService.listAvailable(restaurantId, people)` (`InvalidPeopleCountError` si `people` no es entero > 0) y `occupy(restaurantId, id)` (404 si no existe o es de otro restaurante; `TableNotAvailableError` si `occupyIfFree` devuelve `false`).
- [ ] 13. Mapear errores en `errorHandler.ts`: `TableNotFoundError` → 404 y nueva lista `CONFLICT_ERRORS` (`TableNotAvailableError`, `DuplicatedTableNumberError`, `TableOccupiedError`) → 409, con un test del handler.
- [ ] 14. Crear `controllers/table.controller.ts` siguiendo `ingredient.controller.ts` (CRUD, `changeStatus`, `listAvailable`, `occupy`).
- [ ] 15. Crear `routes/table.routes.ts` (`mergeParams`, roles según el contrato) y `routes/table.public.routes.ts`, y montarlas en `app.ts` (`/api/v1/restaurants/:restaurantId/tables` y `/api/v1/public/restaurants/:restaurantId/tables`).
- [ ] 16. Seed: crear 4 mesas en `rest-1` (capacidades 2, 2, 4, 6) y 3 en `rest-2` (2, 4, 8), dejar una ocupada en cada restaurante y usar el `id` de la mesa ocupada de `rest-1` como `table_id` del pedido de ejemplo. Si el plan de la issue 5 ya está implementado, añadir `restaurant_tables` a la lista de borrado de `clearDatabase` (su test lo exigirá).
- [ ] 17. Verificación manual con la API arrancada: login como admin y como cliente, recorrer los endpoints del contrato (incluido el 409 al ocupar dos veces la misma mesa y los 403 por rol).
- [ ] 18. Verificación del bloque: `npx tsc --noEmit -p tsconfig.json` sin errores y `npm test` en verde.

### B. Web Admin (`packages/web-admin`)

- [ ] 19. Crear `features/tables/models/table.model.ts` (`Table`, `TableStatus`, `CreateTableDto`, `UpdateTableDto`) y `services/table.service.ts` siguiendo `features/ingredients`.
- [ ] 20. Test (rojo) `store/table.store.spec.ts`: `loadByRestaurant` carga y ordena, descarta respuestas de otro restaurante y expone error si falla; `create`/`update`/`delete` actualizan la lista.
- [ ] 21. Implementar `store/table.store.ts` (signals privadas en solo lectura, `firstValueFrom`), siguiendo `ingredient.store.ts` (verde).
- [ ] 22. Crear `pages/table-list` (tabla con número, descripción, capacidad y badge de estado; editar y borrar con confirmación; reacciona a `paramMap` como `ingredient-list`).
- [ ] 23. Crear `pages/table-form` (alta/edición: número, descripción, capacidad y, en edición, estado), con validación y `<label>` asociados.
- [ ] 24. Crear `tables.routes.ts`, registrar `tables` en `app.routes.ts` y añadir el enlace "Mesas" en `shell.component.html`.
- [ ] 25. Verificación: `npm test -w @resttek/web-admin` y `npm run build -w @resttek/web-admin` en verde, y Prettier sobre los archivos nuevos (`npx prettier --check`).

### C. Web Empleados (`packages/web-empleados`)

- [ ] 26. Crear `features/tables/models/table.model.ts` y `services/table.service.ts` (`getAll(restaurantId)` y `changeStatus(restaurantId, id, status)`).
- [ ] 27. Crear `features/tables/store/table.store.ts` con polling (`startPolling`/`stopPolling`) siguiendo `orders/store/order.store.ts`.
- [ ] 28. Crear `pages/mesas`: tarjetas por mesa con número, capacidad y estado, y un `<select>` para cambiar el estado.
- [ ] 29. En `pages/mesas`, para cada mesa ocupada, mostrar sus pedidos activos y el estado de cada item, cruzando `OrderStore.orders()` por `tableId`.
- [ ] 30. Registrar la ruta `/mesas` en `app.routes.ts` y el enlace "Mesas" en `shell.component.html`.
- [ ] 31. Verificación: `npm run build -w @resttek/web-empleados` sin errores (este paquete no tiene tests unitarios).

### D. Web Clientes (`packages/web-clientes`)

- [ ] 32. Crear `core/models/table.model.ts` y `core/services/table.service.ts` (`getAvailable(restaurantId, people)` y `occupy(restaurantId, tableId)`, devolviendo `Observable`).
- [ ] 33. Añadir a `CartStore` la mesa elegida (`tableId`, `tableNumber` y restaurante) con `setTable()`/`clearTable()`, y limpiarla si se cambia de restaurante.
- [ ] 34. Crear `features/tables/table-selection.component.ts`: campo de número de personas y botón para buscar mesas disponibles.
- [ ] 35. En `table-selection`, listar las mesas disponibles, permitir elegir una y, al pulsar "Continuar", llamar a `occupy`, guardar la mesa en `CartStore` y navegar a `/restaurants/:id`; si la API responde 409, avisar y recargar las disponibles.
- [ ] 36. Registrar la ruta `restaurants/:id/mesa` en `app.routes.ts` y hacer que el enlace de `restaurant-list` vaya a ella.
- [ ] 37. En `restaurant-menu`, redirigir a `restaurants/:id/mesa` si no hay mesa elegida para ese restaurante y mostrar "Mesa N".
- [ ] 38. Enviar el `tableId` del `CartStore` en `OrderService.createOrder` desde `cart.component.ts`.
- [ ] 39. Verificación: `npm run build -w @resttek/web-clientes` sin errores y Prettier sobre los archivos tocados.

### E. Documentación (`docs/`)

- [ ] 40. `docs/dominio/modelo-datos.md`: tabla `restaurant_tables` en el diagrama y en "Tablas", relación con `restaurants`, y `orders.table_id` como id de `restaurant_tables` (sin FK). Recordar que hay que borrar `resttek.db` para que se cree la tabla nueva.
- [ ] 41. `docs/dominio/glosario.md`: término "Mesa" en "Entidades de Negocio" y nueva sección "Estados de Mesa" (libre, ocupada, reservada).
- [ ] 42. `docs/arquitectura/arquitectura-api.md`: `table` en la lista de dominios por capas y una sección "Mesas" en "Endpoints" con las rutas y roles del contrato (y la pública en "Públicos").

### Verificación final

- [ ] 43. Con todos los bloques integrados, borrar `resttek.db`, ejecutar `npm run seed` y recorrer el flujo completo: el admin crea una mesa; un cliente elige 3 personas, ve solo mesas libres de capacidad ≥ 3, ocupa una y hace un pedido; en `web-empleados` la mesa aparece ocupada con el pedido y su estado; un camarero la pasa a `libre`.
- [ ] 44. `npm test` y la comprobación de tipos de la API en verde, y builds de los tres frontends y tests de `web-admin` en verde (lo mismo que comprueba el CI).

## Criterios de aceptación

- [ ] Un admin puede crear, listar, editar y borrar mesas de un restaurante desde `web-admin`; no se pueden repetir números en el mismo restaurante ni borrar una mesa ocupada.
- [ ] Cada mesa tiene id, número, descripción, capacidad y estado (`libre`, `ocupada` o `reservada`).
- [ ] En `web-clientes`, tras elegir restaurante se pide el número de personas y solo se muestran mesas `libre` con capacidad ≥ personas.
- [ ] Al elegir una mesa y pulsar "Continuar", la mesa queda `ocupada` y el cliente llega a la carta de ese restaurante.
- [ ] Si dos clientes intentan ocupar la misma mesa, solo uno lo consigue; el otro recibe un 409 y ve un aviso.
- [ ] El pedido creado desde el carrito guarda el `tableId` de la mesa elegida.
- [ ] En `web-empleados`, la página "Mesas" muestra el estado de todas las mesas, permite cambiarlo y, en las ocupadas, muestra sus pedidos activos con el estado de cada item.
- [ ] Los endpoints respetan los roles del contrato (p. ej. un camarero recibe 403 al crear una mesa y un cliente 403 al cambiar el estado).
- [ ] El seed crea mesas de ejemplo en ambos restaurantes.
- [ ] Hay tests de Vitest del modelo, el repositorio y el servicio de mesas en la API, y del store en `web-admin`, y todos pasan.
- [ ] `docs/dominio/modelo-datos.md`, `docs/dominio/glosario.md` y `docs/arquitectura/arquitectura-api.md` describen las mesas y sus endpoints.
- [ ] El CI (tipos y tests de la API, builds de los tres frontends, tests de `web-admin` y Prettier) pasa en la PR.

## Dudas y decisiones tomadas

### Dudas
- Ninguna. Las tres dudas iniciales las ha resuelto el usuario (ver decisiones).

### Decisiones del usuario (antes de implementar)
- Cambiar el estado de una mesa (`PATCH .../status`): **admin, manager y camarero**. El cocinero puede ver las mesas, pero no cambiar su estado.
- La mesa se libera **solo a mano** (los empleados cambian el estado); no hay liberación automática.
- **No se limita** el número de mesas que puede ocupar un cliente.
- Rama base **`main`** y PR contra `main` (`development` va por detrás y no tiene el CI).
- Antes de implementar, los cuatro agentes consensúan el contrato en `docs/api/openapi.yml` (tarea 0).

### Decisiones tomadas
- La API de mesas sigue el estilo **por capas** (como `ingredient`), no el hexagonal — *Motivo:* es el estilo de todos los dominios salvo `employee` (restaurant, dish, ingredient, order), las mesas son datos planos con validaciones simples como los ingredientes y se relacionan con `restaurant` y `order`, que siguen ese estilo.
- Tabla `restaurant_tables` en lugar de `tables` — *Motivo:* evitar la ambigüedad con "tabla" de base de datos en código y documentación.
- `orders.table_id` sigue siendo `TEXT` sin clave foránea — *Motivo:* `CREATE TABLE IF NOT EXISTS` no altera tablas existentes y una FK obligaría a recrear `orders`; basta con guardar el id de la mesa.
- Estados en español (`libre`, `ocupada`, `reservada`) — *Motivo:* coherencia con los estados de pedido (`pendiente`, `preparando`…) y con la issue.
- Ocupación con un `UPDATE ... WHERE status = 'libre'` atómico y 409 si no cambia ninguna fila — *Motivo:* evita que dos clientes ocupen la misma mesa a la vez.
- Mesas disponibles en una ruta **pública** (`/public/restaurants/:restaurantId/tables/available`) y ocupación autenticada con rol `cliente` — *Motivo:* sigue el patrón de la carta pública; ocupar sí cambia datos y debe saberse quién lo hace.
- Nueva lista `CONFLICT_ERRORS` (409) en `errorHandler` — *Motivo:* hoy solo existen 400/401/404 y un conflicto de disponibilidad no es un error de validación.
- La mesa elegida se guarda en `CartStore` de `web-clientes` — *Motivo:* ya guarda el restaurante del pedido en curso y es lo que usa el carrito al crear el pedido.
- Los pedidos de cada mesa en `web-empleados` se obtienen cruzando los pedidos activos por `tableId`, sin endpoint nuevo — *Motivo:* `GET /orders/active` ya devuelve el `tableId` de cada pedido.
- Las tareas se agrupan por aplicación y se fija el contrato de la API en el plan — *Motivo:* petición del usuario; permite repartir los bloques entre agentes con `implement-plan`.
- Si se implementa antes el plan de la issue 5, la tabla nueva debe añadirse a `clearDatabase` (tarea 16) — *Motivo:* el test de esa issue falla si hay tablas sin incluir en el borrado.

