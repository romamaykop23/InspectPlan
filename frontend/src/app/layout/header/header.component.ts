import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Шапка приложения
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive], // директивы для ссылок и подсветки активной
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly router = inject(Router);

  goToList(): void {
    this.router.navigateByUrl('/inspections');
  }

  onNavClick(event: MouseEvent): void {
    event.preventDefault();
    this.goToList();
  }
}