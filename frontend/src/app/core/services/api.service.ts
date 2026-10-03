import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiError } from '../models/api-response.model';

/**
 * Базовый сервис для работы REST API.
 * Инкапсулирует:
 *  - базовый URL
 *  - приведение ошибок к единому формату
 *  - удобный метод для query-параметров
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /**
   * Базовый префикс. В dev он пойдёт через proxy на localhost:8080,
   * в проде nginx сам проксирует /api/* на php-fpm.
   */
  private readonly baseUrl = '/api/v1';

  /** GET-запрос, возвращающий JSON-объект. */
  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}${path}`, { params: this.buildParams(params) })
      .pipe(catchError(this.handleError));
  }

  /** POST-запрос с JSON-телом. */
  post<T>(path: string, body: any): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}${path}`, body)
      .pipe(catchError(this.handleError));
  }

  /** PUT-запрос с JSON-телом. */
  put<T>(path: string, body: any): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}${path}`, body)
      .pipe(catchError(this.handleError));
  }

  /** DELETE-запрос. Ответ 204 без тела. */
  delete<T = void>(path: string): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}${path}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * POST с multipart/form-data. Нужен для импорта Excel.
   * HttpClient сам выставит правильный Content-Type, если тело — FormData.
   */
  postFormData<T>(path: string, formData: FormData): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}${path}`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Формирует HttpParams, отбрасывая undefined/null/пустые строки,
   * чтобы они не появлялись в query как ?status=&type=
   */
  private buildParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  /**
   * Единый обработчик ошибок.
   * Сервер возвращает { error: { code, message, details } }.
   * Мы просто пробрасываем этот объект дальше — компоненты сами решают,
   * что показать: toast, inline-ошибку в форме, ошибки импорта.
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    // Сетевые ошибки / недоступный сервер
    if (error.status === 0) {
      const apiError: ApiError = {
        error: {
          code: 'network_error',
          message: 'Нет соединения с сервером. Проверьте, что бэкенд запущен.',
          details: {},
        },
      };
      return throwError(() => apiError);
    }

    // Ошибки от framwork'а уже в нужном формате
    if (error.error && typeof error.error === 'object' && 'error' in error.error) {
      return throwError(() => error.error as ApiError);
    }

    // Всё остальное оборачиваем отдельно
    const apiError: ApiError = {
      error: {
        code: 'unknown_error',
        message: `Ошибка ${error.status}: ${error.statusText || 'неизвестная ошибка'}`,
        details: {},
      },
    };
    return throwError(() => apiError);
  };
}