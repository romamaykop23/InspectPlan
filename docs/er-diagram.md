# ER-диаграмма

erDiagram
    SMP ||--o{ INSPECTION : "имеет"

    SMP {
        bigserial    id PK
        varchar(255) name
        varchar(12)  inn "unique"
        timestamp    created_at
        timestamp    updated_at
        timestamp    deleted_at "nullable, soft delete"
    }

    INSPECTION {
        bigserial     id PK
        bigint        smp_id FK
        varchar(255)  authority
        date          planned_start_date
        date          planned_end_date
        varchar(32)   inspection_type "CHECK: planned|unscheduled|documentary|onsite"
        varchar(32)   status "CHECK: planned|in_progress|completed|cancelled"
        varchar(1000) result "nullable"
        timestamp     created_at
        timestamp     updated_at
        timestamp     deleted_at "nullable, soft delete"
    }