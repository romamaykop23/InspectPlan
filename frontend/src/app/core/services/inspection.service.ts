import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, ApiListResponse } from '../models/api-response.model';
import { Inspection, InspectionPayload, InspectionListParams } from '../models/inspection.model';

/**
 * Основной сервис работы с проверками.
 */
@Injectable({ providedIn: 'root' })
export class InspectionService {
  private readonly api = inject(ApiService);

  /** Список проверок с фильтрами и пагинацией. */
  list(params: InspectionListParams): Observable<ApiListResponse<Inspection>> {
    return this.api.get<ApiListResponse<Inspection>>('/inspection', params as any);
  }

  /** Одна проверка по id. */
  get(id: number): Observable<ApiResponse<Inspection>> {
    return this.api.get<ApiResponse<Inspection>>(`/inspection/${id}`);
  }

  /** Создание. */
  create(payload: InspectionPayload): Observable<ApiResponse<Inspection>> {
    return this.api.post<ApiResponse<Inspection>>('/inspection', payload);
  }

  /** Обновление. */
  update(id: number, payload: InspectionPayload): Observable<ApiResponse<Inspection>> {
    return this.api.put<ApiResponse<Inspection>>(`/inspection/${id}`, payload);
  }

  /** Мягкое удаление. */
  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/inspection/${id}`);
  }

  /**
   * Импорт из Excel.
   * Файл передаём как FormData — HttpClient сам выставит нужный Content-Type.
   */
  import(file: File): Observable<ApiResponse<{ imported: number; total: number }>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<ApiResponse<{ imported: number; total: number }>>(
      '/inspection/import',
      formData,
    );
  }

  /**
   * Возвращает URL для скачивания экспорта.
   * Браузер сам скачает файл по этой ссылке, потому что nginx отдаёт
   * заголовок Content-Disposition: attachment.
   */
  buildExportUrl(params: InspectionListParams): string {
    const base = '/api/v1/inspection/export';
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      query.set(key, String(value));
    });
    const qs = query.toString();
    return qs ? `${base}?${qs}` : base;
  }

  /** URL для скачивания шаблона импорта. */
  buildTemplateUrl(): string {
    return '/api/v1/inspection/import/template';
  }
}