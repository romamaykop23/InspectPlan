import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Оптимизация change detection
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Роутер + привязка параметров URL к @Input() компонентов
    provideRouter(routes, withComponentInputBinding(), withRouterConfig({ onSameUrlNavigation: 'reload' })),

    // HttpClient на основе Fetch API
    provideHttpClient(withFetch()),
  ],
};
