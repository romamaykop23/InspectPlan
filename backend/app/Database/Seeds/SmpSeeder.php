<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use Faker\Factory;

class SmpSeeder extends Seeder
{
    public function run()
    {
        $faker = Factory::create('ru_RU');

        $rows = [];
        $usedInn = [];

        for ($i = 0; $i < 1000; $i++) {
            // Генерируем уникальный ИНН: 10 или 12 цифр
            do {
                $len = $faker->randomElement([10, 12]);
                $inn = '';
                for ($j = 0; $j < $len; $j++) {
                    $inn .= random_int(0, 9);
                }
            } while (isset($usedInn[$inn]));

            $usedInn[$inn] = true;

            $rows[] = [
                'name'       => $faker->company(),
                'inn'        => $inn,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
        }

        $this->db->table('smp')->insertBatch($rows);
    }
}
