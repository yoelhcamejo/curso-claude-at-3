import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TableService } from '../../core/services/table.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { Restaurant } from '../../core/models/restaurant.model';
import { Table } from '../../core/models/table.model';

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>{{ restaurant()?.name || 'Elige tu mesa' }}</h1>
          <p>Indica cuántas personas sois para ver las mesas disponibles</p>
        </div>
      </div>

      <form class="search card" (submit)="$event.preventDefault(); search()">
        <label for="people">Número de personas</label>
        <input
          id="people"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          [value]="peopleInput()"
          (input)="onPeopleInput($event)"
        />
        <button type="submit" class="btn btn-primary" [disabled]="loading()">Buscar mesas</button>
      </form>

      @if (validationError()) {
        <div class="alert-error">{{ validationError() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (error()) {
        <div class="alert-error">{{ error() }}</div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state">
            <p>No hay mesas libres para {{ searchedPeople() }} personas</p>
          </div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button
                type="button"
                class="table-card card"
                [class.selected]="selectedId() === table.id"
                (click)="select(table)"
              >
                <strong>Mesa {{ table.number }}</strong>
                <span class="capacity">Capacidad: {{ table.capacity }}</span>
                @if (table.description) {
                  <span class="description">{{ table.description }}</span>
                }
              </button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 1200px;
        margin: 0 auto;
      }
      .back-link {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 8px;
        display: inline-block;
      }
      .search {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .search input {
        width: 100px;
      }
      .tables-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      .table-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 16px;
        text-align: left;
        cursor: pointer;
        transition: all var(--transition);
      }
      .table-card:hover,
      .table-card.selected {
        border-color: var(--green-medium);
      }
      .table-card.selected {
        background: var(--bg-hover);
      }
      .capacity,
      .description {
        color: var(--text-muted);
        font-size: 13px;
      }
    `,
  ],
})
export class TableSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tableService = inject(TableService);
  private readonly restaurantService = inject(RestaurantService);

  readonly restaurantId = this.route.snapshot.paramMap.get('id')!;

  readonly restaurant = signal<Restaurant | null>(null);
  readonly peopleInput = signal('');
  readonly tables = signal<Table[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly searchedPeople = signal(0);
  readonly searched = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly validationError = signal<string | null>(null);

  ngOnInit(): void {
    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => this.restaurant.set(null),
    });
  }

  onPeopleInput(event: Event): void {
    this.peopleInput.set((event.target as HTMLInputElement).value);
  }

  search(): void {
    const raw = this.peopleInput().trim();
    if (!/^\d+$/.test(raw) || Number(raw) < 1) {
      this.validationError.set('Indica un número de personas entero mayor que 0');
      return;
    }
    this.validationError.set(null);
    this.loadAvailable(Number(raw));
  }

  select(table: Table): void {
    this.selectedId.set(table.id);
  }

  private loadAvailable(people: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.selectedId.set(null);
    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        this.tables.set(tables);
        this.searchedPeople.set(people);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar las mesas disponibles');
        this.loading.set(false);
      },
    });
  }
}
