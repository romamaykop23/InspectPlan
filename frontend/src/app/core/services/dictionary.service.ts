import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { Dictionaries } from '../models/dictionary.model';

/**
 * Сервис справочников.
 * Справочники не меняются во время сессии, поэтому кэшируем их через shareReplay(1)
 */
@Injectable({ providedIn: 'root' })
export class DictionaryService {
  private readonly api = inject(ApiService);

  /** Кэш-обёртка над HTTP-запросом. */
  private cache$?: Observable<ApiResponse<Dictionaries>>;

  /**
   * Возвращает справочники. Первый вызов идёт на бэк,
   * последующие — из кэша.
   */
  get(): Observable<ApiResponse<Dictionaries>> {
    if (!this.cache$) {
      this.cache$ = this.api
        .get<ApiResponse<Dictionaries>>('/dictionaries')
        .pipe(shareReplay(1));
    }
    return this.cache$;
  }
}