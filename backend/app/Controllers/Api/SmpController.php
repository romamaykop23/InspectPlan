<?php

namespace App\Controllers\Api;

use App\Models\SmpModel;

class SmpController extends BaseApiController
{
    public function index()
    {
        $search = trim((string) ($this->request->getVar('search') ?? ''));
        $limit  = (int) ($this->request->getVar('limit') ?? 20);
        $limit  = max(1, min($limit, 50));

        $model = new SmpModel();

        $builder = $model->builder();
        $builder->select('id, name, inn');

        if ($search !== '') {
            $like = '%' . mb_strtolower($search) . '%';
            $builder->groupStart()
                ->where('LOWER(name) LIKE', $like)
                ->orWhere('LOWER(inn) LIKE', $like)
                ->groupEnd();
        }

        $builder->orderBy('name', 'ASC')->limit($limit);

        $rows = $builder->get()->getResultArray();

        return $this->json(['data' => $rows]);
    }

    public function show($id)
    {
        $model = new SmpModel();
        $smp = $model->select('id, name, inn')->find((int) $id);

        if (! $smp) {
            return $this->error('not_found', 'СМП не найден', 404);
        }

        return $this->json(['data' => $smp]);
    }

    public function create()
    {
        $input = $this->input();

        $model = new SmpModel();
        // При создании СМП из формы проверки ИНН обязателен.
        $model->setValidationRule('inn', 'required|regex_match[/^\d{10}$|^\d{12}$/]');

        if (! $model->validate($input)) {
            return $this->error('validation_failed', 'Проверьте поля', 422, $model->errors());
        }

        $exists = $model->withDeleted()->where('inn', $input['inn'])->first();
        if ($exists) {
            return $this->error('duplicate_inn', 'СМП с таким ИНН уже существует', 422, [
                'inn' => 'ИНН уже используется',
            ]);
        }

        $id = $model->insert([
            'name' => $input['name'],
            'inn'  => $input['inn'],
        ], true);

        if ($id === false) {
            return $this->error('save_failed', 'Не удалось сохранить СМП', 500);
        }

        return $this->json(['data' => $model->select('id, name, inn')->find($id)], 201);
    }
}