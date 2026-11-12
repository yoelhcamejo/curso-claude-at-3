import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import { tableErrorMessage } from '../../models/table-error-messages'
import type { TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.css',
})
export class TableListComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  restaurantId = ''
  readonly deleteError = signal<string | null>(null)

  readonly statusLabels: Record<TableStatus, string> = {
    libre: 'Libre',
    ocupada: 'Ocupada',
    reservada: 'Reservada',
  }

  ngOnInit(): void {
    // Angular reutiliza el componente al cambiar de restaurante, así que hay que reaccionar a los params
    this.route.parent?.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.restaurantId = params.get('restaurantId') ?? ''
      this.deleteError.set(null)
      if (this.restaurantId) {
        this.store.loadByRestaurant(this.restaurantId)
      }
    })
  }

  async onDelete(id: string, number: number): Promise<void> {
    if (!this.restaurantId) return
    if (confirm(`¿Estás seguro de eliminar la mesa ${number}?`)) {
      this.deleteError.set(null)
      try {
        await this.store.delete(this.restaurantId, id)
      } catch (err) {
        this.deleteError.set(tableErrorMessage(err, 'Error al eliminar la mesa.'))
      }
    }
  }
}
