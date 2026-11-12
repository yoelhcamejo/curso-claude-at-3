import { describe, it, expect } from 'vitest'
import { normalizeTableStatus } from '@models/table.model.js'

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
