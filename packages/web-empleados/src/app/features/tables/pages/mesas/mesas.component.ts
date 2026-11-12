import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { Table, TableStatus } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly statuses: TableStatus[] = ['libre', 'ocupada', 'reservada'];

  // El cocinero puede ver las mesas, pero la API le responde 403 al cambiar su estado.
  readonly canChangeStatus = computed(() => this.authStore.user()?.role !== 'cocinero');

  private get restaurantId(): string | undefined {
    return this.authStore.user()?.restaurantId;
  }

  ngOnInit(): void {
    const restaurantId = this.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  async onStatusChange(table: Table, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const status = select.value as TableStatus;
    const restaurantId = this.restaurantId;
    if (!restaurantId || status === table.status) {
      return;
    }
    const ok = await this.tableStore.changeStatus(restaurantId, table.id, status);
    if (!ok) {
      // La mesa no cambió en la API: se devuelve el <select> a su estado real.
      select.value = table.status;
    }
  }
}
