import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChangeTableStatusDto, Table } from '../models/table.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/restaurants`;

  getAll(restaurantId: string): Observable<Table[]> {
    return this.http.get<Table[]>(`${this.baseUrl}/${restaurantId}/tables`);
  }

  changeStatus(restaurantId: string, id: string, dto: ChangeTableStatusDto): Observable<Table> {
    return this.http.patch<Table>(`${this.baseUrl}/${restaurantId}/tables/${id}/status`, dto);
  }
}
