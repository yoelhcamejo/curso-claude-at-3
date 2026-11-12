export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface Table {
  id: string
  restaurantId: string
  number: number
  description: string
  capacity: number
  status: TableStatus
  createdAt: string
  updatedAt: string
}

export interface CreateTableDto {
  number: number
  description: string
  capacity: number
}

export interface UpdateTableDto {
  number: number
  description: string
  capacity: number
  status: TableStatus
}
