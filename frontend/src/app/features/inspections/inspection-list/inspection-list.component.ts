import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormGroup,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { InspectionService } from '../../../core/services/inspection.service';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../core/services/confirm.service';

import { Inspection, InspectionListParams } from '../../../core/models/inspection.model';
import { ApiError, ImportError } from '../../../core/models/api-response.model';
import { DictionaryItem } from '../../../core/models/dictionary.model';

/**
 * Список проверок:
 *  - фильтры (поиск, статус, тип, диапазон дат)
 *  - таблица с пагинацией
 *  - кнопки: добавить, редактировать, удалить, экспорт, импорт, шаблон
 *
 * Фильтры и пагинация хранятся в URL (query params), поэтому:
 *  - результат поиска можно расшарить ссылкой;
 *  - кнопка «Назад» в браузере работает как ожидается.
 */
@Component({
  selector: 'app-inspection-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  providers: [DatePipe], // DatePipe используется в TS, поэтому в providers
  templateUrl: './inspection-list.component.html',
  styleUrl: './inspection-list.component.scss',
})
export class InspectionListComponent implements OnInit, OnDestroy {
  // ---------- Зависимости ----------
  private readonly inspectionService = inject(InspectionService);
  private readonly dictionaryService = inject(DictionaryService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // ---------- Состояние ----------
  /** Строки текущей страницы. */
  readonly items = signal<Inspection[]>([]);

  /** Метаданные пагинации. */
  readonly total = signal(0);
  readonly page = signal(1);
  readonly perPage = signal(20);
  readonly lastPage = signal(1);

  /** Флаг загрузки (для спиннера и блокировки кнопок). */
  readonly loading = signal(false);

  /** Справочники. */
  readonly statuses = signal<DictionaryItem[]>([]);
  readonly types = signal<DictionaryItem[]>([]);

  /** Типы/статусы — Map для быстрого доступа по коду в шаблоне (для бейджей). */
  readonly statusByCode = computed(() =>
    Object.fromEntries(this.statuses().map(s => [s.code, s.label])),
  );
  readonly typeByCode = computed(() =>
    Object.fromEntries(this.types().map(t => [t.code, t.label])),
  );

  /** Форма фильтров. */
  readonly filterForm: FormGroup;

  /** Текущие параметры фильтрации (то, что ушло в API). */
  private readonly currentParams = signal<InspectionListParams>({ page: 1, per_page: 20 });


  /** Отписки. */
  private readonly destroy$ = new Subject<void>();

  constructor() {
    // Инициализируем форму фильтров.
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      type: [''],
      date_from: [''],
      date_to: [''],
    });
  }

  // ---------- Lifecycle ----------

  ngOnInit(): void {
    // Справочники грузим один раз — они не меняются.
    this.dictionaryService.get().subscribe({
      next: (res) => {
        this.statuses.set(res.data.statuses);
        this.types.set(res.data.inspection_types);
      },
      error: (err: ApiError) => this.notifications.error(err.error.message),
    });

    // Реагируем на изменения query params. Это центральный механизм:
    // пользователь меняет фильтр, то меняется URL, то срабатывает эта подписка, то грузим данные.
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      
      // Формируем параметры для API.
      this.currentParams.set({
        search: params['search'] ?? undefined,
        status: params['status'] ?? undefined,
        type: params['type'] ?? undefined,
        date_from: params['date_from'] ?? undefined,
        date_to: params['date_to'] ?? undefined,
        page: Number(params['page'] ?? 1),
        per_page: Number(params['per_page'] ?? 20),
        sort: params['sort'] ?? 'planned_start_date',
        order: (params['order'] as 'asc' | 'desc') ?? 'desc',
    });

      this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------- Загрузка данных ----------

  /** Загрузить страницу проверок. */
  private load(): void {
    this.loading.set(true);
    this.inspectionService.list(this.currentParams()).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.total.set(res.meta.total);
        this.page.set(res.meta.page);
        this.perPage.set(res.meta.per_page);
        this.lastPage.set(res.meta.last_page);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.notifications.error(err.error.message);
      },
    });
  }

  // ---------- Действия с фильтрами ----------

  /** Применить фильтры из формы: сбрасываем пагинацию на 1. */
  applyFilters(): void {
    const v = this.filterForm.value;
    this.updateQueryParams({
      search: v.search || null,
      status: v.status || null,
      type: v.type || null,
      date_from: v.date_from || null,
      date_to: v.date_to || null,
      page: 1,
    });
  }

  /** Сбросить все фильтры. */
  resetFilters(): void {
    this.filterForm.reset({ search: '', status: '', type: '', date_from: '', date_to: '' });
    this.updateQueryParams({
      search: null,
      status: null,
      type: null,
      date_from: null,
      date_to: null,
      page: 1,
    });
  }

  /** Изменить страницу. */
  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage() || page === this.page()) return;
    this.updateQueryParams({ page });
  }

  /** Изменить размер страницы. */
  changePerPage(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.updateQueryParams({ per_page: value, page: 1 });
  }

  /** Изменить сортировку (клик по заголовку колонки). */
  changeSort(field: string): void {
    const cp = this.currentParams();
    const isSame = (cp.sort ?? '') === field;
    const newOrder = isSame && cp.order === 'asc' ? 'desc' : 'asc';
    this.updateQueryParams({ sort: field, order: newOrder });
  }

  /** Возвращает стрелку для заголовка колонки. */
  sortIcon(field: string): string {
    const cp = this.currentParams();
    if (cp.sort !== field) return '';
    return cp.order === 'asc' ? ' ▲' : ' ▼';
  }

  /**
   * Обновляет query params в URL.
   * null, то удаляем параметр (чистый URL).
   * Остальные значения — как строки.
   */
  private updateQueryParams(changes: Record<string, any>): void {
    const queryParams: Record<string, any> = {};
    // Сохраняем текущие параметры, кроме тех что меняем, и выкидываем null-ы.
    const merged = { ...this.currentParams(), ...changes };
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        queryParams[k] = v;
      }
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '', // полностью заменяем
    });
  }

  // ---------- Удаление ----------

  /** Удалить проверку с подтверждением. */
  async deleteItem(item: Inspection): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Удаление проверки',
      message: `Удалить проверку для «${item.smp.name}» от ${this.formatDate(item.planned_start_date)}?`,
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;

    this.inspectionService.delete(item.id).subscribe({
      next: () => {
        this.notifications.success('Проверка удалена');
        this.load(); // перезагружаем текущую страницу
      },
      error: (err: ApiError) => this.notifications.error(err.error.message),
    });
  }

  // ---------- Импорт / экспорт ----------

  /**
   * Ссылка для скачивания экспорта с текущими фильтрами.
   * computed — чтобы пересчитывать URL при изменении фильтров.
   */
  readonly exportUrl = computed(() => {
  const { page, per_page, ...rest } = this.currentParams();
  return this.inspectionService.buildExportUrl(rest);
});

  /** Ссылка на шаблон импорта. */
  readonly templateUrl = this.inspectionService.buildTemplateUrl();

  /** Открывает системный диалог выбора файла для импорта. */
  openImportDialog(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  /** Обработка выбора файла. */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // сбрасываем, чтобы повторный выбор того же файла сработал

    if (!file) return;

    this.loading.set(true);
    this.inspectionService.import(file).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.notifications.success(
          `Импортировано ${res.data.imported} из ${res.data.total} строк`,
        );
        this.load();
      },
      error: (err: ApiError) => {
        this.loading.set(false);

        // Особый случай: ошибки валидации строк импорта.
        // Бэкенд кладёт их в details.errors.
        const details = err.error.details as { errors?: ImportError[]; total?: number };
        if (err.error.code === 'import_failed' && details?.errors?.length) {
          const preview = details.errors
            .slice(0, 5)
            .map(e => `Строка ${e.row}: ${e.message}`)
            .join('; ');
          const rest = details.errors.length > 5 ? ` и ещё ${details.errors.length - 5}` : '';
          this.notifications.error(`Ошибка импорта. ${preview}${rest}`, 12000);
        } else {
          this.notifications.error(err.error.message);
        }
      },
    });
  }

  // ---------- Утилиты для шаблона ----------

  /** Форматирует ISO-дату в DD.MM.YYYY. */
  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  /**
   * Возвращает Bootstrap-класс бейджа для статуса.
   * Цвета подобраны интуитивно.
   */
  statusBadgeClass(code: string): string {
    switch (code) {
      case 'planned':     return 'text-bg-secondary';
      case 'in_progress': return 'text-bg-info';
      case 'completed':   return 'text-bg-success';
      case 'cancelled':   return 'text-bg-danger';
      default:            return 'text-bg-light';
    }
  }

  /** Список номеров страниц для пагинации (±2 вокруг текущей, + первая/последняя). */
  readonly pageNumbers = computed<number[]>(() => {
    const last = this.lastPage();
    const cur = this.page();
    const result = new Set<number>([1, last]);
    for (let i = cur - 2; i <= cur + 2; i++) {
      if (i >= 1 && i <= last) result.add(i);
    }
    return [...result].sort((a, b) => a - b);
  });

  /** Проверяет, нужно ли показать «…» между номерами. */
  needsEllipsis(prev: number, cur: number): boolean {
    return cur - prev > 1;
  }
}