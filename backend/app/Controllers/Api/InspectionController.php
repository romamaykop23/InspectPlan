<?php

namespace App\Controllers\Api;

use App\Controllers\Api\Concerns\InspectionFilters;
use App\Models\InspectionModel;

class InspectionController extends BaseApiController
{
     use InspectionFilters;

    public function index()
    {
        $params = $this->readListParams();
        $model  = new InspectionModel();

        $total = $this->countList($model, $params);
        $rows  = $this->fetchList($model, $params);

        $lastPage = max(1, (int) ceil($total / $params['per_page']));

        return $this->json([
            'data' => $rows,
            'meta' => [
                'total'     => $total,
                'page'      => $params['page'],
                'per_page'  => $params['per_page'],
                'last_page' => $lastPage,
            ],
        ]);
    }

    public function show($id)
    {
        $model = new InspectionModel();
        $row   = $this->fetchOne($model, (int) $id);

        if (! $row) {
            return $this->error('not_found', 'Проверка не найдена', 404);
        }

        return $this->json(['data' => $row]);
    }

    public function create()
    {
        $input = $this->input();
        $model = new InspectionModel();

        $data = $this->extractFields($input);

        if (! $model->validate($data)) {
            return $this->error('validation_failed', 'Проверьте поля', 422, $model->errors());
        }

        if (! $this->datesOk($data)) {
            return $this->error('validation_failed', 'Проверьте поля', 422, [
                'planned_end_date' => 'Дата окончания не может быть раньше даты начала',
            ]);
        }

        $id = $model->insert($data, true);
        if ($id === false) {
            return $this->error('save_failed', 'Не удалось сохранить проверку', 500);
        }

        return $this->json(['data' => $this->fetchOne($model, $id)], 201);
    }

    public function update($id)
    {
        $id    = (int) $id;
        $model = new InspectionModel();

        if (! $model->find($id)) {
            return $this->error('not_found', 'Проверка не найдена', 404);
        }

        $data = $this->extractFields($this->input());

        if (! $model->validate($data)) {
            return $this->error('validation_failed', 'Проверьте поля', 422, $model->errors());
        }

        if (! $this->datesOk($data)) {
            return $this->error('validation_failed', 'Проверьте поля', 422, [
                'planned_end_date' => 'Дата окончания не может быть раньше даты начала',
            ]);
        }

        $model->update($id, $data);

        return $this->json(['data' => $this->fetchOne($model, $id)]);
    }

    public function delete($id)
    {
        $id    = (int) $id;
        $model = new InspectionModel();

        if (! $model->find($id)) {
            return $this->error('not_found', 'Проверка не найдена', 404);
        }

        $model->delete($id);

        return $this->response->setStatusCode(204);
    }

    // ---------- helpers ----------

    private function extractFields(array $input): array
    {
        $fields = [
            'smp_id',
            'authority',
            'planned_start_date',
            'planned_end_date',
            'inspection_type',
            'status',
            'result',
        ];

        $data = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $input)) {
                $data[$f] = $input[$f] === '' ? null : $input[$f];
            }
        }
        return $data;
    }

    private function datesOk(array $data): bool
    {
        if (empty($data['planned_start_date']) || empty($data['planned_end_date'])) {
            return true;
        }
        return $data['planned_end_date'] >= $data['planned_start_date'];
    }

    private function countList(InspectionModel $model, array $params): int
    {
        $b = $model->builder();
        $b->select('COUNT(*) AS c')
        ->join('smp', 'smp.id = inspection.smp_id', 'inner');
        $this->applyFilters($b, $params);

        return (int) $b->get()->getRow()->c;
    }

    private function fetchList(InspectionModel $model, array $params): array
    {
        $b = $model->builder();
        $this->selectWithJoins($b);
        $this->applyFilters($b, $params);

        $b->orderBy(self::SORT_WHITELIST[$params['sort']], strtoupper($params['order']));
        $b->limit($params['per_page'], ($params['page'] - 1) * $params['per_page']);

        $rows = $b->get()->getResultArray();

        return array_map([$this, 'enrichRow'], $rows);
    }

    private function fetchOne(InspectionModel $model, int $id): ?array
    {
        $b = $model->builder();
        $this->selectWithJoins($b);
        $b->where('inspection.id', $id)
          ->where('inspection.deleted_at', null);

        $row = $b->get()->getRowArray();

        return $row ? $this->enrichRow($row) : null;
    }
}