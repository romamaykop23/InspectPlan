/**
 * Субъект малого предпринимательства (СМП).
 */
export interface Smp {
  id: number;
  name: string;
  inn: string | null;
}

/** Тело запроса на создание СМП. */
export interface SmpCreatePayload {
  name: string;
  inn: string;
}