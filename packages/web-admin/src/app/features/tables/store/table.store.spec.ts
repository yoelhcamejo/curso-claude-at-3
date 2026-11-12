import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Subject, of, throwError } from 'rxjs'
import { TableStore } from './table.store'
import { TableService } from '../services/table.service'
import type { Table } from '../models/table.model'

function makeTable(overrides: Partial<Table> = {}): Table {
  return {
    id: 't-1',
    restaurantId: 'rest-1',
    number: 1,
    description: '',
    capacity: 2,
    status: 'libre',
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
    ...overrides,
  }
}

function setup() {
  const service = {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), { provide: TableService, useValue: service }],
  })
  return { store: TestBed.inject(TableStore), service }
}

describe('TableStore', () => {
  describe('loadByRestaurant', () => {
    it('carga las mesas ordenadas por número', async () => {
      const { store, service } = setup()
      service.getAll.mockReturnValue(
        of([makeTable({ id: 'c', number: 3 }), makeTable({ id: 'a', number: 1 }), makeTable({ id: 'b', number: 2 })]),
      )

      await store.loadByRestaurant('rest-1')

      expect(service.getAll).toHaveBeenCalledWith('rest-1')
      expect(store.tables().map((t) => t.id)).toEqual(['a', 'b', 'c'])
      expect(store.loading()).toBe(false)
      expect(store.error()).toBeNull()
    })

    it('descarta la respuesta de un restaurante que ya no es el actual', async () => {
      const { store, service } = setup()
      const first = new Subject<Table[]>()
      service.getAll.mockImplementation((id: string) =>
        id === 'rest-1' ? first : of([makeTable({ id: 'b-1', restaurantId: 'rest-2' })]),
      )

      const loadingFirst = store.loadByRestaurant('rest-1')
      await store.loadByRestaurant('rest-2')
      first.next([makeTable({ id: 'a-1', restaurantId: 'rest-1' })])
      first.complete()
      await loadingFirst

      expect(store.tables().map((t) => t.id)).toEqual(['b-1'])
      expect(store.loading()).toBe(false)
    })

    it('expone un error si la carga falla', async () => {
      const { store, service } = setup()
      service.getAll.mockReturnValue(throwError(() => new Error('boom')))

      await store.loadByRestaurant('rest-1')

      expect(store.error()).toBe('No se pudieron cargar las mesas.')
      expect(store.tables()).toEqual([])
      expect(store.loading()).toBe(false)
    })
  })

  describe('create', () => {
    it('añade la mesa y mantiene la lista ordenada por número', async () => {
      const { store, service } = setup()
      service.getAll.mockReturnValue(of([makeTable({ id: 'a', number: 1 }), makeTable({ id: 'c', number: 5 })]))
      await store.loadByRestaurant('rest-1')
      service.create.mockReturnValue(of(makeTable({ id: 'b', number: 3 })))

      await store.create('rest-1', { number: 3, description: '', capacity: 2 })

      expect(service.create).toHaveBeenCalledWith('rest-1', { number: 3, description: '', capacity: 2 })
      expect(store.tables().map((t) => t.id)).toEqual(['a', 'b', 'c'])
    })

    it('propaga el error y no modifica la lista', async () => {
      const { store, service } = setup()
      service.getAll.mockReturnValue(of([makeTable({ id: 'a' })]))
      await store.loadByRestaurant('rest-1')
      const err = { error: { error: 'DuplicatedTableNumberError' } }
      service.create.mockReturnValue(throwError(() => err))

      await expect(store.create('rest-1', { number: 1, description: '', capacity: 2 })).rejects.toBe(err)

      expect(store.tables().map((t) => t.id)).toEqual(['a'])
    })
  })

  describe('update', () => {
    it('sustituye la mesa y reordena si cambia el número', async () => {
      const { store, service } = setup()
      service.getAll.mockReturnValue(of([makeTable({ id: 'a', number: 1 }), makeTable({ id: 'b', number: 2 })]))
      await store.loadByRestaurant('rest-1')
      service.update.mockReturnValue(of(makeTable({ id: 'a', number: 9, status: 'reservada' })))

      await store.update('rest-1', 'a', { number: 9, description: '', capacity: 2, status: 'reservada' })

      expect(service.update).toHaveBeenCalledWith('rest-1', 'a', {
        number: 9,
        description: '',
        capacity: 2,
        status: 'reservada',
      })
      expect(store.tables().map((t) => t.id)).toEqual(['b', 'a'])
      expect(store.tables()[1].status).toBe('reservada')
    })
  })

  describe('delete', () => {
    it('elimina la mesa de la lista', async () => {
      const { store, service } = setup()
      service.getAll.mockReturnValue(of([makeTable({ id: 'a', number: 1 }), makeTable({ id: 'b', number: 2 })]))
      await store.loadByRestaurant('rest-1')
      service.delete.mockReturnValue(of(undefined))

      await store.delete('rest-1', 'a')

      expect(service.delete).toHaveBeenCalledWith('rest-1', 'a')
      expect(store.tables().map((t) => t.id)).toEqual(['b'])
    })

    it('propaga el error y conserva la mesa', async () => {
      const { store, service } = setup()
      service.getAll.mockReturnValue(of([makeTable({ id: 'a' })]))
      await store.loadByRestaurant('rest-1')
      const err = { error: { error: 'TableOccupiedError' } }
      service.delete.mockReturnValue(throwError(() => err))

      await expect(store.delete('rest-1', 'a')).rejects.toBe(err)

      expect(store.tables().map((t) => t.id)).toEqual(['a'])
    })
  })
})
