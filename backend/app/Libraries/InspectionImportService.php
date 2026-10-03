<?php

namespace App\Libraries;

use App\Models\InspectionModel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class InspectionImportService
{
    /**
     * Разбирает файл и возвращает
     *  - parsed:    валидные строки (готовые к вставке)
     *  - errors:    список ошибок [{row, field, message}]
     *  - total:     сколько всего строк данных
     */
    public function parse(string $filePath): array
    {
        $ss = IOFactory::load($filePath);
        $sheet = $ss->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true); // assoc по колонкам A, B, ...

        if (empty($rows)) {
            return ['parsed' => [], 'errors' => [], 'total' => 0];
        }

        // Первая строка — заголовки. Строим карту: 'Наименование СМП' => 'B'
        $headerRow = array_shift($rows);
        $map = $this->buildHeaderMap($headerRow);

        $required = ['Наименование СМП', 'ИНН СМП', 'Контролирующий орган',
                     'Дата начала проверки', 'Дата окончания проверки',
                     'Тип проверки', 'Статус'];

        $missing = array_diff($required, array_keys($map));
        if (! empty($missing)) {
            return [
                'parsed' => [],
                'errors' => [[
                    'row'     => 1,
                    'field'   => 'header',
                    'message' => 'Не найдены обязательные колонки: ' . implode(', ', $missing),
                ]],
                'total'  => 0,
            ];
        }

        $parsed = [];
        $errors = [];
        $total  = 0;

        $typeLabels    = array_flip(InspectionModel::types());
        $statusLabels  = array_flip(InspectionModel::statuses());

        foreach ($rows as $excelRowNum => $row) {
            // пропускаем пустые строки (все ключевые поля пусты)
            if ($this->isEmptyRow($row, $map)) {
                continue;
            }
            $total++;

            $get = fn(string $header) => trim((string) ($row[$map[$header]] ?? ''));

            $name      = $get('Наименование СМП');
            $inn       = $get('ИНН СМП');
            $authority = $get('Контролирующий орган');
            $typeRaw   = $get('Тип проверки');
            $statusRaw = $get('Статус');
            $result    = $get('Результат');

            $rowErrors = [];

            if ($name === '') {
                $rowErrors[] = $this->err($excelRowNum, 'name', 'Наименование СМП обязательно');
            }
            if ($inn === '' || ! preg_match('/^\d{10}$|^\d{12}$/', $inn)) {
                $rowErrors[] = $this->err($excelRowNum, 'inn', 'ИНН должен содержать 10 или 12 цифр');
            }

            if ($authority === '') {
                $rowErrors[] = $this->err($excelRowNum, 'authority', 'Контролирующий орган обязателен');
            }

            $start = $this->parseDate($row[$map['Дата начала проверки']] ?? null);
            if ($start === null) {
                $rowErrors[] = $this->err($excelRowNum, 'planned_start_date', 'Некорректная дата начала');
            }

            $end = $this->parseDate($row[$map['Дата окончания проверки']] ?? null);
            if ($end === null) {
                $rowErrors[] = $this->err($excelRowNum, 'planned_end_date', 'Некорректная дата окончания');
            }

            if ($start && $end && $end < $start) {
                $rowErrors[] = $this->err($excelRowNum, 'planned_end_date', 'Дата окончания раньше даты начала');
            }

            $type = $this->resolveType($typeRaw, $typeLabels);
            if ($type === null) {
                $rowErrors[] = $this->err($excelRowNum, 'inspection_type', 'Недопустимый тип проверки: ' . $typeRaw);
            }

            $status = $this->resolveStatus($statusRaw, $statusLabels);
            if ($status === null) {
                $rowErrors[] = $this->err($excelRowNum, 'status', 'Недопустимый статус: ' . $statusRaw);
            }

            if (mb_strlen($result) > 1000) {
                $rowErrors[] = $this->err($excelRowNum, 'result', 'Результат больше 1000 символов');
            }

            if (! empty($rowErrors)) {
                $errors = array_merge($errors, $rowErrors);
                continue;
            }

            $parsed[] = [
                'excel_row'          => $excelRowNum,
                'smp_name'           => $name,
                'smp_inn'            => $inn,
                'authority'          => $authority,
                'planned_start_date' => $start,
                'planned_end_date'   => $end,
                'inspection_type'    => $type,
                'status'             => $status,
                'result'             => $result !== '' ? $result : null,
            ];
        }

        return ['parsed' => $parsed, 'errors' => $errors, 'total' => $total];
    }

    // ---------- helpers ----------

    private function buildHeaderMap(array $headerRow): array
    {
        $map = [];
        foreach ($headerRow as $col => $title) {
            $title = trim((string) $title);
            if ($title !== '') {
                $map[$title] = $col;
            }
        }
        return $map;
    }

    private function isEmptyRow(array $row, array $map): bool
    {
        foreach ($map as $col) {
            if (trim((string) ($row[$col] ?? '')) !== '') {
                return false;
            }
        }
        return true;
    }

    private function err(int $row, string $field, string $message): array
    {
        return ['row' => $row, 'field' => $field, 'message' => $message];
    }

    /**
     * Принимает:
     *  - DateTime (native, если ячейка имеет формат даты)
     *  - строку DD.MM.YYYY
     *  - строку YYYY-MM-DD
     * Возвращает YYYY-MM-DD или null.
     */
    private function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        // Число = Excel-серийный номер даты
        if (is_numeric($value)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject((float) $value);
                return $dt->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        $str = trim((string) $value);

        foreach (['d.m.Y', 'Y-m-d', 'd/m/Y'] as $fmt) {
            $dt = \DateTimeImmutable::createFromFormat('!' . $fmt, $str);
            if ($dt !== false && $dt->format($fmt) === $str) {
                return $dt->format('Y-m-d');
            }
        }

        return null;
    }

    private function resolveType(string $raw, array $labelToCode): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        // Разрешаем и код, и русскую подпись (регистронезависимо)
        if (isset($labelToCode[$raw])) {
            return $labelToCode[$raw];
        }
        if (in_array($raw, array_keys(\App\Models\InspectionModel::types()), true)) {
            return $raw;
        }
        return null;
    }

    private function resolveStatus(string $raw, array $labelToCode): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        if (isset($labelToCode[$raw])) {
            return $labelToCode[$raw];
        }
        if (in_array($raw, array_keys(\App\Models\InspectionModel::statuses()), true)) {
            return $raw;
        }
        return null;
    }
}