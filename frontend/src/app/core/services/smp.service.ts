import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { Smp, SmpCreatePayload } from '../models/smp.model';

/**
 * Сервис для работы со СМП.
 */
@Injectable({ providedIn: 'root' })
export class SmpService {
  private readonly api = inject(ApiService);

  /**
   * Поиск СМП по подстроке. Используется в autocomplete.
   * @param search строка поиска (2+ символа)
   * @param limit максимум результатов (по умолчанию 20)
   */
  search(search: string, limit = 20): Observable<ApiResponse<Smp[]>> {
    return this.api.get<ApiResponse<Smp[]>>('/smp', { search, limit });
  }

  /** Создание нового СМП. */
  create(payload: SmpCreatePayload): Observable<ApiResponse<Smp>> {
    return this.api.post<ApiResponse<Smp>>('/smp', payload);
  }

  /** Получить СМП по id (для восстановления label в autocomplete). */
  get(id: number): Observable<ApiResponse<Smp>> {
    return this.api.get<ApiResponse<Smp>>(`/smp/${id}`);
  }
}