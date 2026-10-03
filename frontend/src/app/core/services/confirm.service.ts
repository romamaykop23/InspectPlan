import { Injectable, signal } from '@angular/core';

/** Состояние диалога подтверждения. */
export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;         // красная ли кнопка (для удаления)
  resolve: (value: boolean) => void;
}

/**
 * Сервис модальных подтверждений.
 * Возвращает Promise<boolean> — true если пользователь подтвердил.
 *
 * Пример:
 *   if (await this.confirm.ask({ title, message })) { ... }
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _state = signal<ConfirmState | null>(null);

  /** Публичный стейт для компонента-диалога. */
  readonly state = this._state.asReadonly();

  /** Задать вопрос пользователю. */
  ask(opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  }): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this._state.set({
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Подтвердить',
        cancelLabel: opts.cancelLabel ?? 'Отмена',
        danger: opts.danger ?? false,
        resolve,
      });
    });
  }

  /** Внутренний метод: вызывается компонентом-диалогом. */
  resolve(value: boolean): void {
    const st = this._state();
    if (st) {
      st.resolve(value);
      this._state.set(null);
    }
  }
}