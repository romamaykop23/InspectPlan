<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

$routes->group('api/v1', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    // Справочники (типы, статусы)
    $routes->get('dictionaries', 'DictionaryController::index');

    // СМП
    $routes->get('smp', 'SmpController::index');
    $routes->post('smp', 'SmpController::create');
    $routes->get('smp/(:num)', 'SmpController::show/$1');

    // Проверки
    $routes->get('inspection', 'InspectionController::index');
    $routes->post('inspection', 'InspectionController::create');
    // Excel
    $routes->get('inspection/export', 'ExcelController::export');
    $routes->get('inspection/import/template', 'ExcelController::template');
    $routes->post('inspection/import', 'ExcelController::import');

    $routes->get('inspection/(:num)', 'InspectionController::show/$1');
    $routes->put('inspection/(:num)', 'InspectionController::update/$1');
    $routes->delete('inspection/(:num)', 'InspectionController::delete/$1');
});
