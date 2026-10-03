import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { SmpCreateService } from '../../core/services/smp-create.service';
import { SmpService } from '../../core/services/smp.service';
import { NotificationService } from '../../core/services/notification.service';
import { ApiError } from '../../core/models/api-response.model';

/**
 * Модальное окно создания СМП.
 * Используется, когда в форме проверки пользователь хочет создать нового СМП, не покидая форму.
 */
@Component({
  selector: 'app-smp-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  template: `
    @if (state.state(); as st) {
      <!-- Затемнение фона -->
      <div class="modal-backdrop-custom" (click)="cancel()"></div>

      <!-- Окно модалки -->
      <div class="modal-custom" role="dialog" aria-modal="true">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="card shadow">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Создать СМП</h5>
              <button type="button" class="btn-close" aria-label="Закрыть" (click)="cancel()"></button>
            </div>

            <div class="card-body">
              <!-- Наименование -->
              <div class="mb-3">
                <label for="smp-name" class="form-label">
                  Наименование <span class="text-danger">*</span>
                </label>
                <input
                  id="smp-name"
                  type="text"
                  class="form-control"
                  [ngClass]="{ 'is-invalid': invalid('name') }"
                  formControlName="name"
                  placeholder="ООО Ромашка"
                  autocomplete="off"
                >
                @if (invalid('name')) {
                  <div class="invalid-feedback">{{ errorFor('name') }}</div>
                }
              </div>

              <!-- ИНН -->
              <div class="mb-0">
                <label for="smp-inn" class="form-label">
                  ИНН <span class="text-danger">*</span>
                </label>
                <input
                  id="smp-inn"
                  type="text"
                  class="form-control"
                  [ngClass]="{ 'is-invalid': invalid('inn') }"
                  formControlName="inn"
                  placeholder="10 или 12 цифр"
                  inputmode="numeric"
                  autocomplete="off"
                >
                @if (invalid('inn')) {
                  <div class="invalid-feedback">{{ errorFor('inn') }}</div>
                }
                <div class="form-text">Только цифры, 10 или 12 знаков.</div>
              </div>
            </div>

            <div class="card-footer d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-outline-secondary" (click)="cancel()">
                Отмена
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                @if (saving()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                }
                Создать
              </button>
            </div>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop-custom {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1092;
    }
    .modal-custom {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1093;
      width: min(480px, calc(100% - 2rem));
    }
  `],
})
export class SmpCreateModalComponent {
  protected readonly state = inject(SmpCreateService);
  private readonly smpService = inject(SmpService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  /** Флаг сохранения (блокирует кнопку). */
  protected readonly saving = signal(false);

  /** Ошибки валидации, пришедшие с бэкенда (поле, после сообщение) */
  private readonly serverErrors = signal<Record<string, string>>({});

  /** Форма создания СМП */
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    inn: ['', [Validators.required, Validators.pattern(/^\d{10}$|^\d{12}$/)]],
  });

  /** Отмена — закрываем модалку без результата */
  cancel(): void {
    this.state.close(null);
  }

  /** Отправка формы на бэкенд */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.serverErrors.set({});

    this.smpService.create(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.notifications.success(`СМП «${res.data.name}» создан`);
        this.state.close(res.data);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        // Ошибки валидации — показываем inline
        const details = err.error.details as Record<string, string> | undefined;
        if (details && typeof details === 'object') {
          this.serverErrors.set(details);
        }
        this.notifications.error(err.error.message);
      },
    });
  }

  /** Проверка: показывать ли ошибку для поля */
  protected invalid(field: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[field];
    return !!(c.invalid && (c.touched || c.dirty)) || !!this.serverErrors()[field];
  }

  /** Сообщение об ошибке для поля */
  protected errorFor(field: keyof typeof this.form.controls): string {
    if (this.serverErrors()[field]) return this.serverErrors()[field];

    const c = this.form.controls[field];
    if (c.errors?.['required']) {
      return field === 'name' ? 'Укажите наименование' : 'Укажите ИНН';
    }
    if (c.errors?.['maxlength']) return 'Слишком длинное значение';
    if (c.errors?.['pattern']) return 'ИНН должен содержать 10 или 12 цифр';
    return 'Некорректное значение';
  }
}