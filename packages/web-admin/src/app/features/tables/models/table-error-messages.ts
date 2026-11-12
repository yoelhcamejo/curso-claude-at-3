const MESSAGES: Record<string, string> = {
  DuplicatedTableNumberError: 'Ya existe una mesa con ese número en este restaurante.',
  TableOccupiedError: 'No se puede borrar una mesa ocupada; libérala antes.',
  InvalidTableNumberError: 'El número debe ser un entero mayor que 0.',
  InvalidTableCapacityError: 'La capacidad debe ser un entero mayor que 0.',
  InvalidTableStatusError: 'El estado de la mesa no es válido.',
  TableNotFoundError: 'La mesa no existe.',
  RestaurantNotFoundError: 'El restaurante no existe.',
}

/** Texto en español para un error HTTP de la API de mesas, elegido por el nombre estable `error.error`. */
export function tableErrorMessage(err: unknown, fallback: string): string {
  const name = (err as { error?: { error?: unknown } } | null)?.error?.error
  return typeof name === 'string' ? (MESSAGES[name] ?? fallback) : fallback
}
