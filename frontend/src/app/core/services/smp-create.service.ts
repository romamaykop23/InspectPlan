import { Injectable, signal } from '@angular/core';
import { Smp } from '../models/smp.model';

/** Состояние открытой модалки. */
export interface SmpCreateState {
  resolve: (smp: Smp | null) => void;
}

/**
 * Сервис открытия модалки «Создать СМП».
 * Возвращает Promise<Smp | null>: сам созданный СМП или null при отмене.
 */
@Injectable({ providedIn: 'root' })
export class SmpCreateService {
  private readonly _state = signal<SmpCreateState | null>(null);

  /** Публичный стейт для компонента модалки. */
  readonly state = this._state.asReadonly();

  /** Открыть модалку и дождаться результата. */
  ask(): Promise<Smp | null> {
    return new Promise<Smp | null>(resolve => {
      this._state.set({ resolve });
    });
  }

  /** Закрыть модалку с результатом (вызывается компонентом). */
  close(smp: Smp | null): void {
    const st = this._state();
    if (st) {
      st.resolve(smp);
      this._state.set(null);
    }
  }
}