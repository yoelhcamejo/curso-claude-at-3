import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { Table, TableStatus } from '../../models/table.model';
import { OrderStore } from '../../../orders/store/order.store';
import { Order } from '../../../orders/models/order.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);
  readonly orderStore = inject(OrderStore);

  readonly statuses: TableStatus[] = ['libre', 'ocupada', 'reservada'];

  // El cocinero puede ver las mesas, pero la API le responde 403 al cambiar su estado.
  readonly canChangeStatus = computed(() => this.authStore.user()?.role !== 'cocinero');

  // Pedidos activos agrupados por mesa: un pedido es de una mesa cuando Order.tableId = Table.id.
  readonly ordersByTable = computed(() => {
    const map = new Map<string, Order[]>();
    for (const order of this.orderStore.orders()) {
      if (!order.tableId) continue;
      const list = map.get(order.tableId) ?? [];
      list.push(order);
      map.set(order.tableId, list);
    }
    return map;
  });

  private get restaurantId(): string | undefined {
    return this.authStore.user()?.restaurantId;
  }

  ngOnInit(): void {
    const restaurantId = this.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
      this.orderStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
    this.orderStore.stopPolling();
  }

  ordersFor(table: Table): Order[] {
    return this.ordersByTable().get(table.id) ?? [];
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
