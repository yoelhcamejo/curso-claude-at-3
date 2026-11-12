import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { OrderStore } from '../../store/order.store';
import { TableStore } from '../../../tables/store/table.store';

@Component({
  selector: 'app-barra',
  standalone: true,
  templateUrl: './barra.component.html',
  styleUrl: './barra.component.css'
})
export class BarraComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly orderStore = inject(OrderStore);
  readonly tableStore = inject(TableStore);

  ngOnInit(): void {
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId) {
      this.orderStore.startPolling(restaurantId);
      this.tableStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.orderStore.stopPolling();
    this.tableStore.stopPolling();
  }

  get pendingOrders() {
    return this.orderStore.orders().map(order => ({
      ...order,
      items: order.items.filter(item => 
        item.dishCategory?.toLowerCase() === 'bebida' && item.status === 'pendiente'
      )
    })).filter(order => order.items.length > 0);
  }

  markReady(orderId: string, itemId: string): void {
    this.orderStore.updateItemStatus(orderId, itemId, 'listo');
  }

  getStatusClass(status: string): string {
    return `badge badge-${status}`;
  }
}
