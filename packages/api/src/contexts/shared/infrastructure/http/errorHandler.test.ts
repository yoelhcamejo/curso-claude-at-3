import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    DuplicatedTableNumberError,
    InvalidPeopleCountError,
    InvalidTableCapacityError,
    InvalidTableNumberError,
    InvalidTableStatusError,
    RestaurantNotFoundError,
    TableNotAvailableError,
    TableNotFoundError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

const handle = (error: unknown) => {
    const res = { status: vi.fn(), json: vi.fn() }
    res.status.mockReturnValue(res)
    errorHandler(error, {} as Request, res as unknown as Response, vi.fn() as NextFunction)
    return { status: res.status.mock.calls[0]?.[0], body: res.json.mock.calls[0]?.[0] }
}

describe('errorHandler', () => {
    it.each([
        [new TableNotFoundError(), 404],
        [new RestaurantNotFoundError(), 404],
        [new TableNotAvailableError(), 409],
        [new DuplicatedTableNumberError(), 409],
        [new TableOccupiedError(), 409],
        [new InvalidTableNumberError(), 400],
        [new InvalidTableCapacityError(), 400],
        [new InvalidTableStatusError(), 400],
        [new InvalidPeopleCountError(), 400]
    ])('should map %s to %i with { error, message }', (error, status) => {
        expect(handle(error)).toEqual({ status, body: { error: error.name, message: error.message } })
    })

    it('should respond 500 for unknown errors', () => {
        expect(handle(new Error('boom'))).toEqual({ status: 500, body: { error: 'InternalServerError', message: 'Something went wrong' } })
    })
})
