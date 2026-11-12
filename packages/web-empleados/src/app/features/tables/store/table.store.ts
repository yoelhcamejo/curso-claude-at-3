import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Table, TableStatus } from '../models/table.model';
import { TableService } from '../services/table.service';

const POLLING_MS = 30000;

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly tableService = inject(TableService);

  private readonly _tables = signal<Table[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  readonly tables = this._tables.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly actionError = this._actionError.asReadonly();

  private readonly numbersById = computed(
    () => new Map(this._tables().map(t => [t.id, t.number] as const))
  );

  /** Número de la mesa con ese id, o null si todavía no se ha cargado. */
  tableNumber(tableId: string): number | null {
    return this.numbersById().get(tableId) ?? null;
  }

  async loadTables(restaurantId: string): Promise<void> {
    this._loading.set(true);
    try {
      const tables = await firstValueFrom(this.tableService.getAll(restaurantId));
      this._tables.set([...tables].sort((a, b) => a.number - b.number));
      this._error.set(null);
    } catch (err: any) {
      this._error.set('No se pudieron cargar las mesas.');
    } finally {
      this._loading.set(false);
    }
  }

  async changeStatus(restaurantId: string, tableId: string, status: TableStatus): Promise<boolean> {
    this._actionError.set(null);
    try {
      const updated = await firstValueFrom(this.tableService.changeStatus(restaurantId, tableId, { status }));
      this._tables.update(tables => tables.map(t => (t.id === tableId ? updated : t)));
      return true;
    } catch (err: any) {
      this._actionError.set(this.actionErrorMessage(err?.error?.error));
      return false;
    }
  }

  startPolling(restaurantId: string): void {
    this.stopPolling();
    this.loadTables(restaurantId);
    this.pollingInterval = setInterval(() => {
      this.loadTables(restaurantId);
    }, POLLING_MS);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private actionErrorMessage(code: string | undefined): string {
    switch (code) {
      case 'Forbidden: Insufficient permissions':
        return 'No tienes permiso para cambiar el estado de las mesas.';
      case 'TableNotFoundError':
        return 'La mesa ya no existe.';
      case 'InvalidTableStatusError':
        return 'El estado elegido no es válido.';
      default:
        return 'No se pudo cambiar el estado de la mesa.';
    }
  }
}
