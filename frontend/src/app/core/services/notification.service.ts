import { Injectable, signal } from '@angular/core';

/**
 * Тип уведомления.
 */
export type NotificationType = 'success' | 'error' | 'info';

/** Одно уведомление. */
export interface Notification {
  id: number;
  type: NotificationType;
  text: string;
}

/**
 * Глобальный сервис уведомлений.
 *
 * Уведомления нужны из любой точки приложения (список, форма, импорт).
 * Сервис — единственная точка входа.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  /** Активные уведомления. */
  private readonly _items = signal<Notification[]>([]);

  /** Публичное read-only представление. */
  readonly items = this._items.asReadonly();

  /** Счётчик для уникальных id. */
  private seq = 0;

  /** Показать успех */
  success(text: string, durationMs = 4000): void {
    this.push('success', text, durationMs);
  }

  /** Показать ошибку */
  error(text: string, durationMs = 6000): void {
    this.push('error', text, durationMs);
  }

  /** Показать нейтральное сообщение */
  info(text: string, durationMs = 4000): void {
    this.push('info', text, durationMs);
  }

  /** Убрать уведомление вручную (по кнопке «×») */
  dismiss(id: number): void {
    this._items.update(list => list.filter(n => n.id !== id));
  }

  /** Добавить уведомление и запланировать автоскрытие. */
  private push(type: NotificationType, text: string, durationMs: number): void {
    const id = ++this.seq;
    this._items.update(list => [...list, { id, type, text }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}