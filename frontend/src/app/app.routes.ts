import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'inspections',
        pathMatch: 'full',
    },
    {
        // Ленивая загрузка раздела проверок
        path: 'inspections',
        loadComponent: () =>
            import('./features/inspections/inspection-list/inspection-list.component').then(
                (m) => m.InspectionListComponent,
            ),
    },
    {
        path: 'inspections/new',
        loadComponent: () =>
        import('./features/inspections/inspection-form/inspection-form.component')
            .then(m => m.InspectionFormComponent),
    },
    {
        path: 'inspections/:id/edit',
        loadComponent: () =>
        import('./features/inspections/inspection-form/inspection-form.component')
            .then(m => m.InspectionFormComponent),
    },
    {
        // Ловим все несуществующие URL и уводим на список
        path: '**',
        redirectTo: 'inspections',
    },
];
