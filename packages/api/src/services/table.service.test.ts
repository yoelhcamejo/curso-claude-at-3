import { describe, it, expect, beforeEach } from 'vitest'
import { normalizeTableStatus } from '@models/table.model.js'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'

describe('normalizeTableStatus', () => {
    it('should accept every valid status', () => {
        for (const status of ['libre', 'ocupada', 'reservada']) {
            expect(normalizeTableStatus(status)).toBe(status)
        }
    })

    it('should trim and lowercase the value', () => {
        expect(normalizeTableStatus('  OcUpAdA ')).toBe('ocupada')
    })

    it('should throw InvalidTableStatusError for an unknown status', () => {
        expect(() => normalizeTableStatus('cerrada'))
            .toThrow('Estado inválido: cerrada. Debe ser uno de: libre, ocupada, reservada')
    })

    it('should throw InvalidTableStatusError for an empty status', () => {
        expect(() => normalizeTableStatus('')).toThrow('Estado inválido')
        expect(() => normalizeTableStatus('   ')).toThrow('Estado inválido')
    })

    it('should throw InvalidTableStatusError for non-string values', () => {
        expect(() => normalizeTableStatus(undefined)).toThrow('Estado inválido')
        expect(() => normalizeTableStatus(null)).toThrow('Estado inválido')
        expect(() => normalizeTableStatus(3)).toThrow('Estado inválido')
    })

    it('should throw an error named InvalidTableStatusError', () => {
        expect(() => normalizeTableStatus('cerrada')).toThrow(expect.objectContaining({ name: 'InvalidTableStatusError' }))
    })
})

describe('TableService', () => {
    let tableRepo: MockTableRepository
    let restaurantRepo: MockRestaurantRepository
    let service: TableService

    const validInput = { restaurantId: 'r1', number: 1, description: 'Junto a la ventana', capacity: 2 }
    const invalidIntegers: unknown[] = ['3', null, undefined, 3.5, 0, -1, true, [3]]

    const addRestaurant = async (id: string) => {
        const now = new Date().toISOString()
        await restaurantRepo.save({
            id, name: `Restaurante ${id}`, address: 'Calle Mayor 10', email: `${id}@resttek.com`, phone: '+34 612345678',
            ownerFirstName: 'Carlos', ownerLastName: 'García', logoUrl: null, createdAt: now, updatedAt: now
        })
    }

    beforeEach(async () => {
        tableRepo = new MockTableRepository()
        restaurantRepo = new MockRestaurantRepository()
        service = new TableService(tableRepo, restaurantRepo)
        await addRestaurant('r1')
        await addRestaurant('r2')
    })

    describe('create', () => {
        it('should create a free table and save it', async () => {
            const table = await service.create(validInput)

            expect(table.id).toBeTruthy()
            expect(table).toMatchObject({ restaurantId: 'r1', number: 1, description: 'Junto a la ventana', capacity: 2, status: 'libre' })
            expect(table.createdAt).toBe(table.updatedAt)
            expect(await tableRepo.findById(table.id)).toEqual(table)
        })

        it('should trim the description and default it to an empty string', async () => {
            expect((await service.create({ ...validInput, description: '  Terraza  ' })).description).toBe('Terraza')
            expect((await service.create({ restaurantId: 'r1', number: 2, capacity: 2 })).description).toBe('')
            expect((await service.create({ ...validInput, number: 3, description: null })).description).toBe('')
        })

        it.each(invalidIntegers)('should throw InvalidTableNumberError when number is %j', async (number) => {
            await expect(service.create({ ...validInput, number }))
                .rejects.toMatchObject({ name: 'InvalidTableNumberError', message: 'Table number must be a positive integer' })
        })

        it.each(invalidIntegers)('should throw InvalidTableCapacityError when capacity is %j', async (capacity) => {
            await expect(service.create({ ...validInput, capacity }))
                .rejects.toMatchObject({ name: 'InvalidTableCapacityError', message: 'Table capacity must be a positive integer' })
        })

        it('should throw RestaurantIdRequiredError when restaurantId is empty', async () => {
            await expect(service.create({ ...validInput, restaurantId: ' ' }))
                .rejects.toMatchObject({ name: 'RestaurantIdRequiredError' })
        })

        it('should throw RestaurantNotFoundError when the restaurant does not exist', async () => {
            await expect(service.create({ ...validInput, restaurantId: 'missing' }))
                .rejects.toMatchObject({ name: 'RestaurantNotFoundError' })
            expect(await tableRepo.findByRestaurantId('missing')).toEqual([])
        })

        it('should throw DuplicatedTableNumberError when the number exists in the restaurant', async () => {
            await service.create(validInput)
            await expect(service.create({ ...validInput, capacity: 4 }))
                .rejects.toMatchObject({ name: 'DuplicatedTableNumberError', message: 'Table number already exists in this restaurant' })
        })

        it('should allow the same number in another restaurant', async () => {
            await service.create(validInput)
            const other = await service.create({ ...validInput, restaurantId: 'r2' })
            expect(other.restaurantId).toBe('r2')
        })
    })
})
