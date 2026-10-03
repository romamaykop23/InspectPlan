import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError, takeUntil, tap } from 'rxjs';
import { SmpService } from '../../../core/services/smp.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Smp } from '../../../core/models/smp.model';
import { SmpCreateService } from '../../../core/services/smp-create.service';

/**
 * Autocomplete для выбора СМП.
 *
 * Особенности:
 *  - работает как FormControl<number | null> через ControlValueAccessor
 *    (наружу отдаёт только id выбранного СМП);
 *  - показывает человекочитаемый label (имя СМП + ИНН);
 *  - не спамит сервер: debounce 300мс, минимум 2 символа, без дублей.
 */
@Component({
  selector: 'app-smp-autocomplete',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './smp-autocomplete.component.html',
  styleUrl: './smp-autocomplete.component.scss',
  providers: [
    // Регистрируем компонент как ControlValueAccessor,
    // чтобы можно было писать <app-smp-autocomplete formControlName="smp_id">
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SmpAutocompleteComponent),
      multi: true,
    },
  ],
})
export class SmpAutocompleteComponent implements ControlValueAccessor, OnDestroy {
  private readonly smpService = inject(SmpService);
  private readonly notifications = inject(NotificationService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly smpCreate = inject(SmpCreateService);

  /** Разрешено ли создание нового СМП (кнопка «Создать СМП» показывается, если true)*/
  readonly allowCreate = input<boolean>(true);

  /** Поле ввода — здесь пользователь набирает текст*/
  readonly searchControl = new FormControl<string>('', { nonNullable: true });

  /** Найденные варианты (для дропдауна)*/
  readonly options = signal<Smp[]>([]);

  /** Открыт ли дропдаун*/
  readonly opened = signal(false);

  /** Идёт ли сейчас загрузка (показываем спиннер)*/
  readonly loading = signal(false);

  /** Текущее выбранное значение*/
  readonly selectedId = signal<number | null>(null);

  /** Метка выбранного СМП (то, что показываем, когда поле не в фокусе)*/
  readonly selectedLabel = signal<string | null>(null);

  /** Флаг "сейчас пишем в input, не трогай" */
  private suppressSearch = false;

  /** Уничтожитель подписок*/
  private readonly destroy$ = new Subject<void>();

  // CVA: колбэки, которые регистрирует Angular

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  // CVA: методы

  /**
   * Angular вызывает этот метод, когда родительская форма задаёт значение.
   * Если пришёл id — нужно подгрузить label (на случай, если мы открыли форму edit).
   */
  writeValue(value: number | null): void {
    this.selectedId.set(value ?? null);

    if (value == null) {
      // Пусто — очищаем
      this.selectedLabel.set(null);
      this.searchControl.setValue('', { emitEvent: false });
      return;
    }

    // Если у нас уже есть label для этого id — просто ставим его в input.
    if (this.selectedId() === value && this.selectedLabel()) {
      this.searchControl.setValue(this.selectedLabel()!, { emitEvent: false });
      return;
    }

    // Иначе грузим СМП по id и заполняем label.
    this.loadLabelById(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Синхронизируем disabled-состояние с полем ввода.
    if (isDisabled) {
      this.searchControl.disable({ emitEvent: false });
    } else {
      this.searchControl.enable({ emitEvent: false });
    }
  }

  // Lifecycle

  constructor() {
    // Основной поток поиска: input, потом debounce, потом API
    this.searchControl.valueChanges
      .pipe(
        tap(() => {
          // Если значение поставили программно (writeValue), не ищем.
          if (this.suppressSearch) return;
          // Пользователь печатает — считаем поле «изменённым».
          this.selectedId.set(null);
          this.selectedLabel.set(null);
          this.onChange(null);
        }),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = (term ?? '').trim();
          if (q.length < 2) {
            return of({ data: [] as Smp[] });
          }
          this.loading.set(true);
          return this.smpService.search(q, 20).pipe(
            catchError((err) => {
              this.notifications.error(err?.error?.message ?? 'Ошибка поиска');
              return of({ data: [] as Smp[] });
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((res) => {
        this.loading.set(false);
        this.options.set(res.data);
        // Открываем дропдаун только если поле в фокусе и есть результаты.
        if (this.opened() && res.data.length > 0) {
          // уже открыт
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Публичные методы для шаблона

  /** Фокус на поле — открываем дропдаун, показываем варианты*/
  onFocus(): void {
    this.opened.set(true);

    if (this.selectedId() !== null) {
      return;
    }

    const term = this.searchControl.value.trim();

    if (term.length >= 2) {
      // setValue с тем же значением не эмитит valueChanges
      this.searchControl.setValue(term, { emitEvent: false });
      this.searchControl.updateValueAndValidity({ emitEvent: true });
    }
  }

  /** Клик вне компонента — закрываем дропдаун и помечаем touched*/
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  /** Выбор варианта*/
  selectOption(smp: Smp): void {
    this.selectedId.set(smp.id);
    this.selectedLabel.set(this.formatLabel(smp));

    // Ставим label в input без запуска нового поиска
    this.suppressSearch = true;
    this.searchControl.setValue(smp.name, { emitEvent: false });
    this.suppressSearch = false;

    this.onChange(smp.id);
    this.opened.set(false);
    this.onTouched();
  }

  /** Очистить выбор*/
  clearSelection(): void {
    this.selectedId.set(null);
    this.selectedLabel.set(null);
    this.suppressSearch = true;
    this.searchControl.setValue('', { emitEvent: false });
    this.suppressSearch = false;
    this.onChange(null);
    this.onTouched();
  }

  /** Закрыть дропдаун (например, при клике вне)*/
  private closeDropdown(): void {
    if (this.opened()) {
      this.opened.set(false);
      this.onTouched();
    }
  }

  // Утилиты

  /** Формирует отображаемую метку: «ООО Ромашка (ИНН 1234567890)»*/
  formatLabel(smp: Smp): string {
    return smp.inn ? `${smp.name} (ИНН ${smp.inn})` : smp.name;
  }

  /** Грузит СМП по id и подставляет label в input*/
  private loadLabelById(id: number): void {
    this.loading.set(true);
    // Используем search — там есть и поиск по id? Нет, по name/inn.
    // Заведём отдельный endpoint /smp/{id} — он уже есть.
    // Но чтобы не плодить зависимости, пойдём через подписку на API.
    // (SmpService.get у нас нет — добавим в сервисе.)
    this.smpService.get(id).subscribe({
      next: (res) => {
        this.loading.set(false);
        const smp = res.data;
        this.selectedId.set(smp.id);
        this.selectedLabel.set(this.formatLabel(smp));
        this.suppressSearch = true;
        this.searchControl.setValue(this.formatLabel(smp), { emitEvent: false });
        this.suppressSearch = false;
      },
      error: () => {
        this.loading.set(false);
        // Если СМП не найден — просто оставляем пусто.
        this.selectedLabel.set(null);
        this.searchControl.setValue('', { emitEvent: false });
      },
    });
  }

  /** Открывает модалку создания СМП; при успехе сразу подставляет выбранное*/
  protected async openCreateDialog(): Promise<void> {
    const created = await this.smpCreate.ask();
    if (created) {
      this.selectOption(created);
    }
  }
}