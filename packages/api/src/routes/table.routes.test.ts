import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'
const tokenFor = (role: string) => `Bearer ${jwt.sign({ id: `${role}-id`, role }, JWT_SECRET)}`

const BASE = '/api/v1/restaurants/r1/tables'
const PUBLIC = '/api/v1/public/restaurants/r1/tables/available'

describe('Rutas de mesas (HTTP)', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        const now = new Date().toISOString()
        for (const id of ['r1', 'r2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurante ${id}`, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
    })

    beforeEach(async () => {
        await dbConfig.run('DELETE FROM restaurant_tables')
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    const createTable = (body: object, restaurant = 'r1') =>
        request(app).post(`/api/v1/restaurants/${restaurant}/tables`).set('Authorization', tokenFor('admin')).send(body)

    it('should create, list, get, update and delete a table as admin', async () => {
        const created = await createTable({ number: 2, description: ' Terraza ', capacity: 4 })
        expect(created.status).toBe(201)
        expect(created.body).toMatchObject({ restaurantId: 'r1', number: 2, description: 'Terraza', capacity: 4, status: 'libre' })
        await createTable({ number: 1, capacity: 2 })

        const list = await request(app).get(BASE).set('Authorization', tokenFor('cocinero'))
        expect(list.status).toBe(200)
        expect(list.body.map((t: { number: number }) => t.number)).toEqual([1, 2])

        const id = created.body.id
        const detail = await request(app).get(`${BASE}/${id}`).set('Authorization', tokenFor('camarero'))
        expect(detail.status).toBe(200)

        const updated = await request(app).put(`${BASE}/${id}`).set('Authorization', tokenFor('admin'))
            .send({ number: 3, capacity: 6, status: 'reservada' })
        expect(updated.status).toBe(200)
        expect(updated.body).toMatchObject({ number: 3, capacity: 6, status: 'reservada', description: '' })

        const deleted = await request(app).delete(`${BASE}/${id}`).set('Authorization', tokenFor('admin'))
        expect(deleted.status).toBe(204)
        expect(deleted.text).toBe('')
    })

    it('should respond 401 without token and 403 with a forbidden role', async () => {
        expect((await request(app).get(BASE)).body).toEqual({ error: 'Unauthorized: No token provided' })
        expect((await request(app).get(BASE)).status).toBe(401)

        const forbidden = await request(app).post(BASE).set('Authorization', tokenFor('camarero')).send({ number: 1, capacity: 2 })
        expect(forbidden.status).toBe(403)
        expect(forbidden.body).toEqual({ error: 'Forbidden: Insufficient permissions' })

        expect((await request(app).get(BASE).set('Authorization', tokenFor('cliente'))).status).toBe(403)
    })

    it('should validate the body strictly with 400 and never 500', async () => {
        const asString = await createTable({ number: '3', capacity: 2 })
        expect(asString.status).toBe(400)
        expect(asString.body).toEqual({ error: 'InvalidTableNumberError', message: 'Table number must be a positive integer' })

        expect((await createTable({ number: 1, capacity: 2.5 })).body.error).toBe('InvalidTableCapacityError')

        const noBody = await request(app).post(BASE).set('Authorization', tokenFor('admin'))
        expect(noBody.status).toBe(400)
        expect(noBody.body.error).toBe('InvalidTableNumberError')
    })

    it('should respond 404 RestaurantNotFoundError when creating in an unknown restaurant', async () => {
        const res = await createTable({ number: 1, capacity: 2 }, 'missing')
        expect(res.status).toBe(404)
        expect(res.body).toEqual({ error: 'RestaurantNotFoundError', message: 'Restaurant not found' })
    })

    it('should respond 409 for a duplicated number and for deleting an occupied table', async () => {
        const created = await createTable({ number: 1, capacity: 2 })
        expect((await createTable({ number: 1, capacity: 4 })).status).toBe(409)

        await request(app).patch(`${BASE}/${created.body.id}/status`).set('Authorization', tokenFor('admin')).send({ status: 'ocupada' })
        const deleted = await request(app).delete(`${BASE}/${created.body.id}`).set('Authorization', tokenFor('admin'))
        expect(deleted.status).toBe(409)
        expect(deleted.body.error).toBe('TableOccupiedError')
    })

    it('should respond 404 when the table belongs to another restaurant', async () => {
        const created = await createTable({ number: 1, capacity: 2 }, 'r2')
        const res = await request(app).get(`${BASE}/${created.body.id}`).set('Authorization', tokenFor('admin'))
        expect(res.status).toBe(404)
        expect(res.body).toEqual({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it('should let admin, manager and camarero change the status but not cocinero or cliente', async () => {
        const created = await createTable({ number: 1, capacity: 2 })
        const patch = (role: string, status: unknown) =>
            request(app).patch(`${BASE}/${created.body.id}/status`).set('Authorization', tokenFor(role)).send({ status })

        for (const role of ['admin', 'manager', 'camarero']) {
            const res = await patch(role, 'reservada')
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('reservada')
        }
        expect((await patch('cocinero', 'libre')).status).toBe(403)
        expect((await patch('cliente', 'libre')).status).toBe(403)
        expect((await patch('admin', 'cerrada')).body.error).toBe('InvalidTableStatusError')
    })

    it('should list available tables publicly ordered by capacity and number', async () => {
        await createTable({ number: 1, capacity: 6 })
        await createTable({ number: 2, capacity: 4 })
        await createTable({ number: 3, capacity: 2 })
        await createTable({ number: 4, capacity: 4 })

        const res = await request(app).get(`${PUBLIC}?people=3`)
        expect(res.status).toBe(200)
        expect(res.body.map((t: { number: number }) => t.number)).toEqual([2, 4, 1])

        for (const people of ['3.5', '3abc', '%203%20', '', '0']) {
            const bad = await request(app).get(`${PUBLIC}?people=${people}`)
            expect(bad.status).toBe(400)
            expect(bad.body.error).toBe('InvalidPeopleCountError')
        }
        expect((await request(app).get(PUBLIC)).status).toBe(400)
    })

    it('should let only a cliente occupy a free table, and only once', async () => {
        const created = await createTable({ number: 1, capacity: 2 })
        const occupy = (role: string) =>
            request(app).post(`${BASE}/${created.body.id}/occupy`).set('Authorization', tokenFor(role))

        expect((await occupy('admin')).status).toBe(403)

        const first = await occupy('cliente')
        expect(first.status).toBe(200)
        expect(first.body.status).toBe('ocupada')

        const second = await occupy('cliente')
        expect(second.status).toBe(409)
        expect(second.body).toEqual({ error: 'TableNotAvailableError', message: 'Table is not available' })
    })
})
