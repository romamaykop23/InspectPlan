<?php

namespace App\Controllers\Api;

use App\Models\InspectionModel;

class DictionaryController extends BaseApiController
{
    public function index()
    {
        $types = [];
        foreach (InspectionModel::types() as $code => $label) {
            $types[] = ['code' => $code, 'label' => $label];
        }

        $statuses = [];
        foreach (InspectionModel::statuses() as $code => $label) {
            $statuses[] = ['code' => $code, 'label' => $label];
        }

        return $this->json([
            'data' => [
                'inspection_types' => $types,
                'statuses'         => $statuses,
            ],
        ]);
    }
}