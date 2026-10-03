<?php

namespace App\Models;

use CodeIgniter\Model;

class SmpModel extends Model
{
    protected $table            = 'smp';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'name',
        'inn',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $validationRules = [
        'name' => 'required|max_length[255]',
        'inn'  => 'permit_empty|regex_match[/^\d{10}$|^\d{12}$/]',
    ];

    protected $validationMessages = [
        'name' => [
            'required'   => 'Наименование СМП обязательно.',
            'max_length' => 'Наименование не должно превышать 255 символов.',
        ],
        'inn' => [
            'regex_match' => 'ИНН должен содержать 10 или 12 цифр.',
        ],
    ];
}