import type { Database } from '@config/database.js'

/**
 * Tablas en el orden en que hay que vaciarlas: primero las que referencian a
 * otras (hijas) y al final las referenciadas (padres), para no violar las FK.
 */
export const TABLES_IN_DELETE_ORDER = [
    'order_items',
    'orders',
    'dish_ingredients',
    'dishes',
    'ingredients',
    'restaurant_tables',
    'employees',
    'restaurants'
] as const

/** Borra todas las filas de todas las tablas en una única transacción. */
export async function clearDatabase(db: Database): Promise<void> {
    await db.run('BEGIN')
    try {
        for (const table of TABLES_IN_DELETE_ORDER) {
            await db.run(`DELETE FROM ${table}`)
        }
        await db.run('COMMIT')
    } catch (error) {
        await db.run('ROLLBACK')
        throw error
    }
}
