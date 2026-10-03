<?php

namespace App\Models;

use CodeIgniter\Model;

class InspectionModel extends Model
{
    public const TYPE_PLANNED     = 'planned';
    public const TYPE_UNSCHEDULED = 'unscheduled';
    public const TYPE_DOCUMENTARY = 'documentary';
    public const TYPE_ONSITE      = 'onsite';

    public const STATUS_PLANNED     = 'planned';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED   = 'completed';
    public const STATUS_CANCELLED   = 'cancelled';

    public static function types(): array
    {
        return [
            self::TYPE_PLANNED     => 'Плановая',
            self::TYPE_UNSCHEDULED => 'Внеплановая',
            self::TYPE_DOCUMENTARY => 'Документарная',
            self::TYPE_ONSITE      => 'Выездная',
        ];
    }

    public static function statuses(): array
    {
        return [
            self::STATUS_PLANNED     => 'Запланирована',
            self::STATUS_IN_PROGRESS => 'В процессе',
            self::STATUS_COMPLETED   => 'Завершена',
            self::STATUS_CANCELLED   => 'Отменена',
        ];
    }

    protected $table            = 'inspection';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'smp_id',
        'authority',
        'planned_start_date',
        'planned_end_date',
        'inspection_type',
        'status',
        'result',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $validationRules = [
        'smp_id'             => 'required|is_natural_no_zero|is_not_unique[smp.id]',
        'authority'          => 'required|max_length[255]',
        'planned_start_date' => 'required|valid_date[Y-m-d]',
        'planned_end_date'   => 'required|valid_date[Y-m-d]',
        'inspection_type'    => 'required|in_list[planned,unscheduled,documentary,onsite]',
        'status'             => 'required|in_list[planned,in_progress,completed,cancelled]',
        'result'             => 'permit_empty|max_length[1000]',
    ];

    protected $validationMessages = [
        'smp_id' => [
            'required'          => 'Необходимо выбрать СМП.',
            'is_not_unique'     => 'Выбранный СМП не найден.',
            'is_natural_no_zero' => 'Некорректный идентификатор СМП.',
        ],
        'authority' => [
            'required'   => 'Контролирующий орган обязателен.',
            'max_length' => 'Не более 255 символов.',
        ],
        'planned_start_date' => [
            'required'     => 'Дата начала обязательна.',
            'valid_date'   => 'Дата начала в формате Y-m-d.',
        ],
        'planned_end_date' => [
            'required'   => 'Дата окончания обязательна.',
            'valid_date' => 'Дата окончания в формате Y-m-d.',
        ],
        'inspection_type' => [
            'in_list' => 'Недопустимый тип проверки.',
        ],
        'status' => [
            'in_list' => 'Недопустимый статус.',
        ],
        'result' => [
            'max_length' => 'Результат не должен превышать 1000 символов.',
        ],
    ];
}