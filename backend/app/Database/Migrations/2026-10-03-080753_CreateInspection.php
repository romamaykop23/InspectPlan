<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateInspection extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'BIGSERIAL',
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'smp_id' => [
                'type'     => 'BIGINT',
                'unsigned' => true,
                'null'     => false,
            ],
            'authority' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'planned_start_date' => [
                'type' => 'DATE',
                'null' => false,
            ],
            'planned_end_date' => [
                'type' => 'DATE',
                'null' => false,
            ],
            'inspection_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 32,
                'null'       => false,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 32,
                'null'       => false,
            ],
            'result' => [
                'type'       => 'VARCHAR',
                'constraint' => 1000,
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
        $this->forge->addKey('smp_id', false, false, 'inspection_smp_id_idx');
        $this->forge->addKey('planned_start_date', false, false, 'inspection_start_idx');
        $this->forge->addKey('status', false, false, 'inspection_status_idx');
        $this->forge->addKey('inspection_type', false, false, 'inspection_type_idx');
        $this->forge->createTable('inspection', true);

        $this->db->query(
            "ALTER TABLE inspection
             ADD CONSTRAINT inspection_type_check
             CHECK (inspection_type IN ('planned','unscheduled','documentary','onsite'))"
        );
        $this->db->query(
            "ALTER TABLE inspection
             ADD CONSTRAINT inspection_status_check
             CHECK (status IN ('planned','in_progress','completed','cancelled'))"
        );
        $this->db->query(
            "ALTER TABLE inspection
             ADD CONSTRAINT inspection_dates_check
             CHECK (planned_end_date >= planned_start_date)"
        );

        // Внешний ключ на smp с ON DELETE RESTRICT
        $this->db->query(
            'ALTER TABLE inspection
             ADD CONSTRAINT inspection_smp_id_fk
             FOREIGN KEY (smp_id) REFERENCES smp(id) ON DELETE RESTRICT'
        );

        // Partial index для активных записей
        $this->db->query(
            'CREATE INDEX inspection_deleted_at_idx ON inspection (deleted_at) WHERE deleted_at IS NULL'
        );
    }

    public function down()
    {
        $this->db->query('DROP INDEX IF EXISTS inspection_deleted_at_idx');
        $this->forge->dropTable('inspection', true);
    }
}