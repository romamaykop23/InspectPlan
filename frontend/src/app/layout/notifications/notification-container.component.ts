import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { NotificationService, NotificationType } from '../../core/services/notification.service';

/**
 * Компонент-контейнер для всплывающих уведомлений (toasts).
 * Размещается один раз в корневом шаблоне приложения.
 * Рендерит список активных уведомлений из NotificationService.
 */
@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [NgClass],
  template: `
    <!--
      Позиционирование: правый верхний угол, поверх всего.
      Каждое уведомление — Bootstrap alert соответствующего цвета.
    -->
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1080;">
      @for (n of notifications.items(); track n.id) {
        <div
          class="alert shadow-sm d-flex align-items-start mb-2"
          [ngClass]="{
            'alert-success': n.type === 'success',
            'alert-danger':  n.type === 'error',
            'alert-info':    n.type === 'info'
          }"
          role="alert"
        >
          <div class="flex-grow-1 me-2">{{ n.text }}</div>
          <button
            type="button"
            class="btn-close btn-sm"
            aria-label="Закрыть"
            (click)="notifications.dismiss(n.id)"
          ></button>
        </div>
      }
    </div>
  `,
})
export class NotificationContainerComponent {

  protected readonly notifications = inject(NotificationService);
}