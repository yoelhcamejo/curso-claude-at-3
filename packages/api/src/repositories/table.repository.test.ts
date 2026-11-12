import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'

const now = new Date().toISOString()

const buildTable = (overrides: Partial<Table> = {}): Table => ({
    id: 't1',
    restaurantId: 'r1',
    number: 1,
    description: 'Junto a la ventana',
    capacity: 2,
    status: 'libre',
    createdAt: now,
    updatedAt: now,
    ...overrides
})

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurante ${id}`, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
    })

    beforeEach(async () => {
        await db.run('DELETE FROM restaurant_tables')
    })

    afterAll(async () => {
        await db.close()
    })

    it('should save and find a table by id', async () => {
        await repo.save(buildTable())

        const found = await repo.findById('t1')
        expect(found).toEqual(buildTable())
    })

    it('should return null when the table does not exist', async () => {
        expect(await repo.findById('missing')).toBeNull()
    })

    it('should update an existing table on save', async () => {
        await repo.save(buildTable())
        await repo.save(buildTable({ number: 7, description: 'Terraza', capacity: 4, status: 'reservada', updatedAt: 'later' }))

        const found = await repo.findById('t1')
        expect(found).toMatchObject({ number: 7, description: 'Terraza', capacity: 4, status: 'reservada', updatedAt: 'later', createdAt: now })
    })

    it('should find the tables of a restaurant ordered by number', async () => {
        await repo.save(buildTable({ id: 't3', number: 3 }))
        await repo.save(buildTable({ id: 't1', number: 1 }))
        await repo.save(buildTable({ id: 't2', number: 2 }))
        await repo.save(buildTable({ id: 'other', restaurantId: 'r2', number: 1 }))

        const tables = await repo.findByRestaurantId('r1')
        expect(tables.map(t => t.id)).toEqual(['t1', 't2', 't3'])
    })

    it('should delete a table', async () => {
        await repo.save(buildTable())
        await repo.delete('t1')
        expect(await repo.findById('t1')).toBeNull()
    })

    describe('findAvailable', () => {
        it('should return only free tables with enough capacity ordered by capacity and number', async () => {
            await repo.save(buildTable({ id: 'small', number: 1, capacity: 2 }))
            await repo.save(buildTable({ id: 'big-b', number: 5, capacity: 6 }))
            await repo.save(buildTable({ id: 'big-a', number: 4, capacity: 6 }))
            await repo.save(buildTable({ id: 'mid', number: 9, capacity: 4 }))
            await repo.save(buildTable({ id: 'exact', number: 8, capacity: 3 }))
            await repo.save(buildTable({ id: 'busy', number: 2, capacity: 8, status: 'ocupada' }))
            await repo.save(buildTable({ id: 'booked', number: 3, capacity: 8, status: 'reservada' }))
            await repo.save(buildTable({ id: 'other', restaurantId: 'r2', number: 1, capacity: 10 }))

            const tables = await repo.findAvailable('r1', 3)
            expect(tables.map(t => t.id)).toEqual(['exact', 'mid', 'big-a', 'big-b'])
        })

        it('should return an empty array when no table is big enough', async () => {
            await repo.save(buildTable({ capacity: 2 }))
            expect(await repo.findAvailable('r1', 100)).toEqual([])
        })
    })
})
