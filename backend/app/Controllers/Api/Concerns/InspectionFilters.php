<?php

namespace App\Controllers\Api\Concerns;

use App\Models\InspectionModel;

trait InspectionFilters
{
    private const SORT_WHITELIST = [
        'id'                 => 'inspection.id',
        'planned_start_date' => 'inspection.planned_start_date',
        'planned_end_date'   => 'inspection.planned_end_date',
        'status'             => 'inspection.status',
        'created_at'         => 'inspection.created_at',
        'smp_name'           => 'smp.name',
    ];

    private function readListParams(): array
    {
        $req = $this->request;

        $page    = max(1, (int) ($req->getVar('page') ?? 1));
        $perPage = (int) ($req->getVar('per_page') ?? 20);
        $perPage = max(1, min($perPage, 100));

        $sort = (string) ($req->getVar('sort') ?? 'planned_start_date');
        if (! array_key_exists($sort, self::SORT_WHITELIST)) {
            $sort = 'planned_start_date';
        }

        $order = strtolower((string) ($req->getVar('order') ?? 'desc'));
        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        return [
            'search'          => trim((string) ($req->getVar('search') ?? '')),
            'status'          => (string) ($req->getVar('status') ?? ''),
            'inspection_type' => (string) ($req->getVar('type') ?? ''),
            'date_from'       => (string) ($req->getVar('date_from') ?? ''),
            'date_to'         => (string) ($req->getVar('date_to') ?? ''),
            'page'            => $page,
            'per_page'        => $perPage,
            'sort'            => $sort,
            'order'           => $order,
        ];
    }

    private function selectWithJoins($builder): void
    {
        $builder
            ->select('inspection.*, smp.name AS smp_name, smp.inn AS smp_inn, ' .
                     '(inspection.planned_end_date - inspection.planned_start_date + 1) AS planned_duration_days')
            ->join('smp', 'smp.id = inspection.smp_id', 'inner');
    }

    private function applyFilters($b, array $params): void
    {
         $b->where('inspection.deleted_at', null);
         
        if ($params['search'] !== '') {
            $like = '%' . mb_strtolower($params['search']) . '%';
            $b->groupStart()
              ->where('LOWER(smp.name) LIKE', $like)
              ->orWhere('LOWER(smp.inn) LIKE', $like)
              ->orWhere('LOWER(inspection.authority) LIKE', $like)
              ->orWhere('LOWER(inspection.result) LIKE', $like)
              ->groupEnd();
        }

        if ($params['status'] !== '') {
            $b->where('inspection.status', $params['status']);
        }
        if ($params['inspection_type'] !== '') {
            $b->where('inspection.inspection_type', $params['inspection_type']);
        }
        if ($params['date_from'] !== '') {
            $b->where('inspection.planned_end_date >=', $params['date_from']);
        }
        if ($params['date_to'] !== '') {
            $b->where('inspection.planned_start_date <=', $params['date_to']);
        }
    }

    private function enrichRow(array $row): array
    {
        $types    = InspectionModel::types();
        $statuses = InspectionModel::statuses();

        return [
            'id'                    => (int) $row['id'],
            'smp'                   => [
                'id'   => (int) $row['smp_id'],
                'name' => $row['smp_name'],
                'inn'  => $row['smp_inn'],
            ],
            'authority'             => $row['authority'],
            'planned_start_date'    => $row['planned_start_date'],
            'planned_end_date'      => $row['planned_end_date'],
            'planned_duration_days' => (int) $row['planned_duration_days'],
            'inspection_type'       => $row['inspection_type'],
            'inspection_type_label' => $types[$row['inspection_type']] ?? $row['inspection_type'],
            'status'                => $row['status'],
            'status_label'          => $statuses[$row['status']] ?? $row['status'],
            'result'                => $row['result'],
            'created_at'            => $row['created_at'],
            'updated_at'            => $row['updated_at'],
        ];
    }
}