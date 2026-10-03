import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ConfirmService } from '../../core/services/confirm.service';

/**
 * Модальный диалог подтверждения.
 * Показывается, когда ConfirmService.state() не null.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (confirm.state(); as st) {
      <!-- Тёмная подложка -->
      <div class="modal-backdrop-custom" (click)="confirm.resolve(false)"></div>

      <!-- Окно диалога -->
      <div class="modal-custom" role="dialog" aria-modal="true">
        <div class="card shadow">
          <div class="card-header">
            <h5 class="mb-0">{{ st.title }}</h5>
          </div>
          <div class="card-body">
            <p class="mb-0">{{ st.message }}</p>
          </div>
          <div class="card-footer d-flex justify-content-end gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary"
              (click)="confirm.resolve(false)"
            >
              {{ st.cancelLabel }}
            </button>
            <button
              type="button"
              class="btn"
              [ngClass]="st.danger ? 'btn-danger' : 'btn-primary'"
              (click)="confirm.resolve(true)"
            >
              {{ st.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Затемнение фона */
    .modal-backdrop-custom {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1090;
    }
    /* Центрируем окно */
    .modal-custom {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1091;
      width: min(480px, calc(100% - 2rem));
    }
  `],
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
}