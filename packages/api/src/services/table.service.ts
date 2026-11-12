import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    DuplicatedTableNumberError,
    InvalidTableCapacityError,
    InvalidTableNumberError,
    RestaurantIdRequiredError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    restaurantId: string
    number: unknown
    description?: unknown
    capacity: unknown
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
