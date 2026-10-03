<?php

namespace App\Controllers\Api;

use App\Controllers\Api\Concerns\InspectionFilters;
use App\Libraries\InspectionExcelService;
use App\Libraries\InspectionImportService;
use App\Models\InspectionModel;
use App\Models\SmpModel;

class ExcelController extends BaseApiController
{
    use InspectionFilters;

    public function export()
    {
        $params = $this->readListParams();
        $model  = new InspectionModel();

        $limit = InspectionExcelService::MAX_ROWS_PER_SHEET;

        $b = $model->builder();
        $this->selectWithJoins($b);
        $this->applyFilters($b, $params);
        $b->orderBy(self::SORT_WHITELIST[$params['sort']], strtoupper($params['order']));
        $b->limit($limit + 1); // +1, чтобы узнать, есть ли переполнение

        $rows = $b->get()->getResultArray();
        $truncated = count($rows) > $limit;
        if ($truncated) {
            $rows = array_slice($rows, 0, $limit);
        }

        $rows = array_map([$this, 'enrichRow'], $rows);

        $svc = new InspectionExcelService();
        $ss = $svc->createBlankSpreadsheet();
        $svc->fill($ss, $rows, $truncated);

        $filename = 'inspections_' . date('Y-m-d_His') . '.xlsx';

        //Если не выйти, CI4 добавит свой HTML-вывод к бинарнику, и Excel не откроется
        while (ob_get_level() > 0) { ob_end_clean(); }
        $svc->streamDownload($ss, $filename);
        exit;
    }

    public function template()
    {
        $svc = new InspectionExcelService();
        $ss = $svc->createBlankSpreadsheet();

        // Заполняем примером для наглядности — одна строка.
        $svc->fill($ss, [[
            'smp' => ['name' => 'ООО Пример', 'inn' => '7701234567'],
            'authority' => 'Роспотребнадзор',
            'planned_start_date' => '2025-06-01',
            'planned_end_date' => '2025-06-05',
            'planned_duration_days' => 5,
            'inspection_type_label' => 'Плановая',
            'status_label' => 'Запланирована',
            'result' => 'Комментарий (необязательно)',
        ]]);

        $filename = 'inspections_template.xlsx';

        //Если не выйти, CI4 добавит свой HTML-вывод к бинарнику, и Excel не откроется.
        while (ob_get_level() > 0) { ob_end_clean(); }
        $svc->streamDownload($ss, $filename);
        exit;
    }

    public function import()
    {
        $file = $this->request->getFile('file');

        if (! $file || ! $file->isValid()) {
            return $this->error('no_file', 'Файл не загружен', 400);
        }

        // Допускаем .xlsx и .xls (PhpSpreadsheet умеет оба)
        $ext = strtolower($file->getClientExtension());
        if (! in_array($ext, ['xlsx', 'xls'], true)) {
            return $this->error('bad_format', 'Ожидается файл Excel (.xlsx или .xls)', 400);
        }

        // Переместим во временное место
        $tmp = tempnam(sys_get_temp_dir(), 'imp_') . '.' . $ext;
        $file->move(dirname($tmp), basename($tmp));

        try {
            $svc = new InspectionImportService();
            $result = $svc->parse($tmp);
        } catch (\Throwable $e) {
            @unlink($tmp);
            return $this->error('parse_failed', 'Не удалось прочитать файл: ' . $e->getMessage(), 400);
        }

        @unlink($tmp);

        if (! empty($result['errors'])) {
            return $this->error('import_failed', 'Файл содержит ошибки', 422, [
                'errors' => $result['errors'],
                'total'  => $result['total'],
            ]);
        }

        if (empty($result['parsed'])) {
            return $this->error('empty_file', 'В файле нет данных для импорта', 422);
        }

        // Валидация + вставка в транзакции. Если хоть одна строка не сохранится — откат.
        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $smpModel = new SmpModel();
            $inspModel = new InspectionModel();

            $innCache = [];

            foreach ($result['parsed'] as $row) {
                $inn = $row['smp_inn'];

                if (! isset($innCache[$inn])) {
                    $smp = $smpModel->where('inn', $inn)->first();
                    if (! $smp) {
                        throw new \RuntimeException(
                            "СМП с ИНН {$inn} не найден (строка {$row['excel_row']})"
                        );
                    }
                    $innCache[$inn] = (int) $smp['id'];
                }

                $inspModel->insert([
                    'smp_id'             => $innCache[$inn],
                    'authority'          => $row['authority'],
                    'planned_start_date' => $row['planned_start_date'],
                    'planned_end_date'   => $row['planned_end_date'],
                    'inspection_type'    => $row['inspection_type'],
                    'status'             => $row['status'],
                    'result'             => $row['result'],
                ]);
            }

            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();
            return $this->error('import_failed', $e->getMessage(), 422, [
                'errors' => [[
                    'row'     => 0,
                    'field'   => 'transaction',
                    'message' => $e->getMessage(),
                ]],
            ]);
        }

        return $this->json([
            'data' => [
                'imported' => count($result['parsed']),
                'total'    => $result['total'],
            ],
        ]);
    }
}