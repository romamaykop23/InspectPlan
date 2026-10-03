/**
 * Справочники (типы проверок, статусы) с бэкенда.
 */

/** Одно значение справочника: код + человекочитаемая подпись. */
export interface DictionaryItem {
  code: string;
  label: string;
}

/** Ответ эндпоинта /dictionaries. */
export interface Dictionaries {
  inspection_types: DictionaryItem[];
  statuses: DictionaryItem[];
}