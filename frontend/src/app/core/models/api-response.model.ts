/**
 * Универсальные обёртки ответов API.
 */

/** Успешный ответ API. */
export interface ApiResponse<T> {
  data: T;
}

/** Ответ со списком и метаданными пагинации. */
export interface ApiListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
  };
}

/** Ошибка API. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, any> | { errors?: ImportError[] };
  };
}

/** Ошибка одной строки импорта. */
export interface ImportError {
  row: number;
  field: string;
  message: string;
}