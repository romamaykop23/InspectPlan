/**
 * Проверка — основная сущность приложения.
 * Поля соответствуют ответу API.
 */

/** Вложенный объект СМП внутри проверки. */
export interface InspectionSmp {
  id: number;
  name: string;
  inn: string | null;
}

/** Одна проверка. */
export interface Inspection {
  id: number;
  smp: InspectionSmp;
  authority: string;
  planned_start_date: string;    // формат 'YYYY-MM-DD'
  planned_end_date: string;      // формат 'YYYY-MM-DD'
  planned_duration_days: number;
  inspection_type: string;
  inspection_type_label: string;
  status: string;
  status_label: string;
  result: string | null;
  created_at: string;
  updated_at: string;
}

/** Тело запроса на создание/обновление проверки. */
export interface InspectionPayload {
  smp_id: number;
  authority: string;
  planned_start_date: string;
  planned_end_date: string;
  inspection_type: string;
  status: string;
  result: string | null;
}

/** Параметры фильтрации и пагинации списка. */
export interface InspectionListParams {
  search?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}