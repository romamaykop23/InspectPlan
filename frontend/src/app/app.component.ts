import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { NotificationContainerComponent } from './layout/notifications/notification-container.component';
import { ConfirmDialogComponent } from './layout/confirm-dialog/confirm-dialog.component';
import { SmpCreateModalComponent } from './layout/smp-create-modal/smp-create-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, NotificationContainerComponent, ConfirmDialogComponent, SmpCreateModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
}
