import { Database } from '@config/database.js'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { clearDatabase } from './clearDatabase.js'

const now = () => new Date().toISOString()

const countRows = async (db: Database, table: string): Promise<number> => {
    const row = await db.get<{ total: number }>(`SELECT COUNT(*) as total FROM ${table}`)
    return row?.total ?? 0
}

const insertOneRowPerTable = async (db: Database): Promise<void> => {
    await db.run(
        'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['r1', 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', now(), now()]
    )
    await db.run(
        'INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['e1', 'Juan', 'García', 'juan@resttek.com', 'hash', 'cocinero', 'r1']
    )
    await db.run(
        'INSERT INTO ingredients (id, name, unit, current_stock, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['i1', 'Tomate', 'kg', 10, 'r1', now(), now()]
    )
    await db.run(
        'INSERT INTO dishes (id, name, description, price, category, restaurant_id, available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['d1', 'Ensalada', null, 9, 'entrante', 'r1', 1, now(), now()]
    )
    await db.run('INSERT INTO dish_ingredients (dish_id, ingredient_id, quantity) VALUES (?, ?, ?)', ['d1', 'i1', 0.3])
    await db.run(
        'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['t1', 'r1', 1, '', 4, 'ocupada', now(), now()]
    )
    await db.run(
        'INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, ?, ?, ?, ?)',
        ['o1', 'r1', 't1', null, now()]
    )
    await db.run(
        'INSERT INTO order_items (id, order_id, dish_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
        ['oi1', 'o1', 'd1', 1, null, 'pendiente']
    )
}

describe('clearDatabase', () => {
    let db: Database

    beforeEach(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
    })

    afterEach(async () => {
        await db.close()
    })

    it('vacía todas las tablas respetando las claves foráneas', async () => {
        await insertOneRowPerTable(db)
        const tables = ['restaurants', 'employees', 'ingredients', 'dishes', 'dish_ingredients', 'restaurant_tables', 'orders', 'order_items']
        for (const table of tables) {
            expect(await countRows(db, table), `${table} antes de borrar`).toBe(1)
        }

        await clearDatabase(db)

        for (const table of tables) {
            expect(await countRows(db, table), `${table} después de borrar`).toBe(0)
        }
    })
})
