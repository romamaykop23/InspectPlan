<?php

namespace App\Libraries;

use App\Models\InspectionModel;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class InspectionExcelService
{
    public const MAX_ROWS_PER_SHEET = 1_000_000;

    /** Заголовки колонок в фиксированном порядке. */
    public const HEADERS = [
        '№',
        'Наименование СМП',
        'ИНН СМП',
        'Контролирующий орган',
        'Дата начала проверки',
        'Дата окончания проверки',
        'Плановая длительность (дней)',
        'Тип проверки',
        'Статус',
        'Результат',
    ];

    /**
     * Создаёт книгу с одним листом и шапкой.
     */
    public function createBlankSpreadsheet(): Spreadsheet
    {
        $ss = new Spreadsheet();
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('Проверки');

        $this->writeHeader($sheet);

        return $ss;
    }

    /**
     * Заполняет лист данными из БД (уже отфильтрованными и подготовленными).
     *
     * @param array<int, array<string,mixed>> $rows
     */
    public function fill(Spreadsheet $ss, array $rows, bool $truncated = false): void
    {
        $sheet = $ss->getActiveSheet();

        $rowNum = 2;
        $index  = 1;

        foreach ($rows as $row) {
            $sheet->setCellValueExplicit("A{$rowNum}", $index, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NUMERIC);
            $sheet->setCellValue("B{$rowNum}", $row['smp']['name'] ?? '');
            $sheet->setCellValueExplicit("C{$rowNum}", (string) ($row['smp']['inn'] ?? ''), \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue("D{$rowNum}", $row['authority'] ?? '');

            // Даты пишем как настоящие даты Excel
            $start = $row['planned_start_date'] ?? null;
            $end   = $row['planned_end_date'] ?? null;

            if ($start) {
                $sheet->setCellValue("E{$rowNum}", \PhpOffice\PhpSpreadsheet\Shared\Date::PHPToExcel(new \DateTimeImmutable($start)));
                $sheet->getStyle("E{$rowNum}")->getNumberFormat()->setFormatCode('DD.MM.YYYY');
            }
            if ($end) {
                $sheet->setCellValue("F{$rowNum}", \PhpOffice\PhpSpreadsheet\Shared\Date::PHPToExcel(new \DateTimeImmutable($end)));
                $sheet->getStyle("F{$rowNum}")->getNumberFormat()->setFormatCode('DD.MM.YYYY');
            }

            $sheet->setCellValueExplicit("G{$rowNum}", (int) ($row['planned_duration_days'] ?? 0), \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NUMERIC);
            $sheet->setCellValue("H{$rowNum}", $row['inspection_type_label'] ?? '');
            $sheet->setCellValue("I{$rowNum}", $row['status_label'] ?? '');
            $sheet->setCellValue("J{$rowNum}", $row['result'] ?? '');

            $rowNum++;
            $index++;
        }

        if ($truncated) {
            $rowNum++;
            $sheet->setCellValue("A{$rowNum}", 'Внимание: результаты поиска усечены до ' . self::MAX_ROWS_PER_SHEET . ' строк.');
            $sheet->mergeCells("A{$rowNum}:J{$rowNum}");
            $sheet->getStyle("A{$rowNum}")->getFont()->setBold(true)->getColor()->setARGB('FFB00020');
        }

        $this->applyColumnWidths($sheet);
    }

    /**
     * Отдаёт xlsx как поток в HTTP-ответ.
     */
    public function streamDownload(Spreadsheet $ss, string $filename): void
    {
        $writer = new Xlsx($ss);

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer->save('php://output');
    }

    /**
     * Сохраняет xlsx во временный файл и возвращает путь.
     */
    public function saveToTemp(Spreadsheet $ss): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'xlsx_') . '.xlsx';
        (new Xlsx($ss))->save($tmp);
        return $tmp;
    }

    // ---------- helpers ----------

    private function writeHeader(Worksheet $sheet): void
    {
        foreach (self::HEADERS as $i => $title) {
            $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($i + 1);
            $sheet->setCellValue("{$col}1", $title);
        }

        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count(self::HEADERS));
        $range = "A1:{$lastCol}1";

        $sheet->getStyle($range)->getFont()->setBold(true);
        $sheet->getStyle($range)->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle($range)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFE9ECEF');
        $sheet->getStyle($range)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        $sheet->freezePane('A2');
    }

    private function applyColumnWidths(Worksheet $sheet): void
    {
        $widths = [
            'A' => 6,
            'B' => 32,
            'C' => 14,
            'D' => 26,
            'E' => 14,
            'F' => 14,
            'G' => 12,
            'H' => 18,
            'I' => 16,
            'J' => 50,
        ];
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }
    }
}