<?php

namespace App\Database\Seeds;

use App\Models\InspectionModel;
use CodeIgniter\Database\Seeder;

class InspectionSeeder extends Seeder
{
    public function run()
    {
        $db = $this->db;

        // Берём все id СМП, чтобы равномерно распределить проверки
        $smpIds = array_column(
            $db->table('smp')->select('id')->get()->getResultArray(),
            'id'
        );

        if (empty($smpIds)) {
            return;
        }

        $authorities = [
            'Роспотребнадзор',
            'Ростехнадзор',
            'Росприроднадзор',
            'Прокуратура',
            'ГИТ',
            'ФНС',
            'Росздравнадзор',
            'Россельхознадзор',
        ];

        $types    = array_keys(InspectionModel::types());
        $statuses = array_keys(InspectionModel::statuses());

        $rows = [];
        for ($i = 0; $i < 50; $i++) {
            $start = (new \DateTimeImmutable())
                ->modify('-' . random_int(0, 365) . ' days')
                ->modify('+' . random_int(0, 365) . ' days');

            $duration = random_int(1, 20);
            $end      = $start->modify("+{$duration} days");

            $status = $statuses[array_rand($statuses)];

            $result = null;
            if ($status === InspectionModel::STATUS_COMPLETED) {
                $result = 'Проверка завершена. Нарушений не выявлено.';
            } elseif ($status === InspectionModel::STATUS_IN_PROGRESS) {
                $result = 'Проверка в процессе, проводятся контрольные мероприятия.';
            } elseif ($status === InspectionModel::STATUS_CANCELLED) {
                $result = 'Проверка отменена по решению контролирующего органа.';
            }

            $rows[] = [
                'smp_id'             => $smpIds[array_rand($smpIds)],
                'authority'          => $authorities[array_rand($authorities)],
                'planned_start_date' => $start->format('Y-m-d'),
                'planned_end_date'   => $end->format('Y-m-d'),
                'inspection_type'    => $types[array_rand($types)],
                'status'             => $status,
                'result'             => $result,
                'created_at'         => date('Y-m-d H:i:s'),
                'updated_at'         => date('Y-m-d H:i:s'),
            ];
        }

        $db->table('inspection')->insertBatch($rows);
    }
}
