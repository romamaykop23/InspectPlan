import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { InspectionService } from '../../../core/services/inspection.service';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { NotificationService } from '../../../core/services/notification.service';

import { InspectionPayload } from '../../../core/models/inspection.model';
import { ApiError } from '../../../core/models/api-response.model';
import { DictionaryItem } from '../../../core/models/dictionary.model';
import { SmpAutocompleteComponent } from '../smp-autocomplete/smp-autocomplete.component';

/**
 * Валидатор: дата окончания не может быть раньше даты начала.
 * Работает на уровне группы.
 */
const dateRangeValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const start = group.get('planned_start_date')?.value;
  const end = group.get('planned_end_date')?.value;
  if (!start || !end) return null; // отдельные required-валидаторы сработают
  return end < start ? { dateRange: true } : null;
};

/**
 * Универсальная форма проверки: используется и для создания, и для редактирования.
 * Режим определяется наличием :id в роуте.
 */
@Component({
  selector: 'app-inspection-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SmpAutocompleteComponent],
  templateUrl: './inspection-form.component.html',
  styleUrl: './inspection-form.component.scss',
})
export class InspectionFormComponent implements OnInit, OnDestroy {
  private readonly inspectionService = inject(InspectionService);
  private readonly dictionaryService = inject(DictionaryService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Состояние

  /** id редактируемой проверки; null — режим создания */
  readonly inspectionId = signal<number | null>(null);

  /** Загрузка исходных данных */
  readonly loading = signal(false);

  /** Отправка формы */
  readonly saving = signal(false);

  /** Справочники */
  readonly statuses = signal<DictionaryItem[]>([]);
  readonly types = signal<DictionaryItem[]>([]);

  /** Ошибки от сервера (поле + сообщение) */
  readonly serverErrors = signal<Record<string, string>>({});

  /** Режим: создание или редактирование */
  readonly isEdit = computed(() => this.inspectionId() !== null);

  /** Заголовок страницы */
  readonly title = computed(() => (this.isEdit() ? 'Редактирование проверки' : 'Добавление проверки'));

  // Форма

  readonly form = this.fb.nonNullable.group(
    {
      smp_id: [null as number | null, [Validators.required]],
      authority: ['', [Validators.required, Validators.maxLength(255)]],
      planned_start_date: ['', [Validators.required]],
      planned_end_date: ['', [Validators.required]],
      inspection_type: ['', [Validators.required]],
      status: ['', [Validators.required]],
      result: ['', [Validators.maxLength(1000)]],
    },
    { validators: [dateRangeValidator] },
  );

  /** Автоматически вычисляемая длительность (для отображения рядом с датами) */
  readonly durationDays = signal<number | null>(null);

  private readonly destroy$ = new Subject<void>();

  // Lifecycle

  ngOnInit(): void {
    // Справочники
    this.dictionaryService.get().subscribe({
      next: (res) => {
        this.statuses.set(res.data.statuses);
        this.types.set(res.data.inspection_types);
        // Ставим значения по умолчанию только в режиме создания
        if (!this.isEdit()) {
          this.form.patchValue({
            inspection_type: res.data.inspection_types[0]?.code ?? '',
            status: res.data.statuses[0]?.code ?? '',
          });
        }
      },
      error: (err: ApiError) => this.notifications.error(err.error.message),
    });

    // Реагируем на изменение дат — пересчитываем длительность
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.recalcDuration();
    });

    // Если в роуте есть :id — это редактирование, грузим проверку
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.inspectionId.set(Number(id));
        this.loadForEdit(Number(id));
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Загрузка

  private loadForEdit(id: number): void {
    this.loading.set(true);
    this.inspectionService.get(id).subscribe({
      next: (res) => {
        const i = res.data;
        this.form.patchValue({
          smp_id: i.smp.id,
          authority: i.authority,
          planned_start_date: i.planned_start_date,
          planned_end_date: i.planned_end_date,
          inspection_type: i.inspection_type,
          status: i.status,
          result: i.result ?? '',
        });
        this.loading.set(false);
        this.recalcDuration();
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.notifications.error(err.error.message);
        this.router.navigate(['/inspections']);
      },
    });
  }

  // Отправка

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.serverErrors.set({});

    const payload = this.buildPayload();

    const request$ = this.isEdit()
      ? this.inspectionService.update(this.inspectionId()!, payload)
      : this.inspectionService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(
          this.isEdit() ? 'Проверка обновлена' : 'Проверка создана',
        );
        this.router.navigate(['/inspections']);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        const details = err.error.details as Record<string, string> | undefined;
        if (details && typeof details === 'object') {
          this.serverErrors.set(details);
        }
        this.notifications.error(err.error.message);
      },
    });
  }

  /** Собирает payload из формы */
  private buildPayload(): InspectionPayload {
    const v = this.form.getRawValue();
    return {
      smp_id: v.smp_id!,
      authority: v.authority.trim(),
      planned_start_date: v.planned_start_date,
      planned_end_date: v.planned_end_date,
      inspection_type: v.inspection_type,
      status: v.status,
      result: v.result?.trim() ? v.result.trim() : null,
    };
  }

  // Утилиты

  /** Пересчитывает длительность на основе выбранных дат */
  private recalcDuration(): void {
    const start = this.form.controls.planned_start_date.value;
    const end = this.form.controls.planned_end_date.value;
    if (!start || !end) {
      this.durationDays.set(null);
      return;
    }
    // Разница в миллисекундах, в дни (включительно)
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (e < s) {
      this.durationDays.set(null);
      return;
    }
    this.durationDays.set(Math.round((e - s) / 86400000) + 1);
  }

  /** Показывать ли ошибку поля */
  invalid(field: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[field];
    return !!(c.invalid && (c.touched || c.dirty)) || !!this.serverErrors()[field];
  }

  /** Показывать ли ошибку диапазона дат */
  dateRangeInvalid(): boolean {
    const err = this.form.errors?.['dateRange'];
    const endTouched = this.form.controls.planned_end_date.touched || this.form.controls.planned_end_date.dirty;
    return !!err && endTouched;
  }

  /** Сообщение об ошибке поля */
  errorFor(field: keyof typeof this.form.controls): string {
    if (this.serverErrors()[field]) return this.serverErrors()[field];

    const c = this.form.controls[field];
    if (c.errors?.['required']) {
      const map: Record<string, string> = {
        smp_id: 'Выберите СМП',
        authority: 'Укажите орган',
        planned_start_date: 'Укажите дату начала',
        planned_end_date: 'Укажите дату окончания',
        inspection_type: 'Выберите тип',
        status: 'Выберите статус',
      };
      return map[field] ?? 'Поле обязательно';
    }
    if (c.errors?.['maxlength']) return 'Слишком длинное значение';
    return 'Некорректное значение';
  }
}