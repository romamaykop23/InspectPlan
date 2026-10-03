<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSmp extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'BIGSERIAL',
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'inn' => [
                'type'       => 'VARCHAR',
                'constraint' => 12,
                'null'       => true,
            ],
            'created_at' => [
                'type' => 'TIMESTAMP',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'TIMESTAMP',
                'null' => true,
            ],
            'deleted_at' => [
                'type' => 'TIMESTAMP',
                'null' => true,
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey('inn', 'smp_inn_unique');
        $this->forge->addKey('name', false, false, 'smp_name_idx');
        $this->forge->createTable('smp', true, [
            'ENGINE' => '',
        ]);

        // Отдельно создаём индекс по deleted_at
        // В CI4 Forge такого нет, поэтому raw SQL.
        $this->db->query(
            'CREATE INDEX smp_deleted_at_idx ON smp (deleted_at) WHERE deleted_at IS NULL'
        );
    }

    public function down()
    {
        $this->db->query('DROP INDEX IF EXISTS smp_deleted_at_idx');
        $this->forge->dropTable('smp', true);
    }
}