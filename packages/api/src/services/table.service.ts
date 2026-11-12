import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    DuplicatedTableNumberError,
    InvalidPeopleCountError,
    InvalidTableCapacityError,
    InvalidTableNumberError,
    RestaurantIdRequiredError,
    RestaurantNotFoundError,
    TableNotAvailableError,
    TableNotFoundError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    restaurantId: string
    number: unknown
    description?: unknown
    capacity: unknown
}

export interface UpdateTableDTO {
    number: unknown
    description?: unknown
    capacity: unknown
    status?: unknown
}

const isPositiveInteger = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 1

const normalizeDescription = (value: unknown): string =>
    value === undefined || value === null ? '' : String(value).trim()

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        if (!dto.restaurantId || dto.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }
        const number = this.validateNumber(dto.number)
        const capacity = this.validateCapacity(dto.capacity)

        if (!await this.restaurantRepository.findById(dto.restaurantId)) {
            throw new RestaurantNotFoundError()
        }
        await this.ensureNumberIsFree(dto.restaurantId, number)

        const now = new Date().toISOString()
        const table: Table = {
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            number,
            description: normalizeDescription(dto.description),
            capacity,
            status: 'libre',
            createdAt: now,
            updatedAt: now
        }

        await this.tableRepository.save(table)
        return table
    }

    async getById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async getByRestaurant(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    async update(restaurantId: string, id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const number = this.validateNumber(dto.number)
        const capacity = this.validateCapacity(dto.capacity)
        const status = dto.status === undefined ? existing.status : normalizeTableStatus(dto.status)

        await this.ensureNumberIsFree(restaurantId, number, existing.id)

        const updated: Table = {
            ...existing,
            number,
            description: normalizeDescription(dto.description),
            capacity,
            status,
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const existing = await this.getById(restaurantId, id)
        if (existing.status === 'ocupada') {
            throw new TableOccupiedError()
        }
        await this.tableRepository.delete(existing.id)
    }

    async changeStatus(restaurantId: string, id: string, status: unknown): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const updated: Table = {
            ...existing,
            status: normalizeTableStatus(status),
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    async listAvailable(restaurantId: string, people: unknown): Promise<Table[]> {
        return this.tableRepository.findAvailable(restaurantId, this.parsePeople(people))
    }

    async occupy(restaurantId: string, id: string): Promise<Table> {
        const table = await this.getById(restaurantId, id)
        if (!await this.tableRepository.occupyIfFree(table.id)) {
            throw new TableNotAvailableError()
        }
        return this.getById(restaurantId, id)
    }

    private parsePeople(value: unknown): number {
        if (isPositiveInteger(value)) {
            return value
        }
        if (typeof value === 'string' && /^\d+$/.test(value) && Number(value) >= 1) {
            return Number(value)
        }
        throw new InvalidPeopleCountError()
    }

    private validateNumber(value: unknown): number {
        if (!isPositiveInteger(value)) {
            throw new InvalidTableNumberError()
        }
        return value
    }

    private validateCapacity(value: unknown): number {
        if (!isPositiveInteger(value)) {
            throw new InvalidTableCapacityError()
        }
        return value
    }

    private async ensureNumberIsFree(restaurantId: string, number: number, exceptTableId?: string): Promise<void> {
        const existing = await this.tableRepository.findByRestaurantAndNumber(restaurantId, number)
        if (existing && existing.id !== exceptTableId) {
            throw new DuplicatedTableNumberError()
        }
    }
}
