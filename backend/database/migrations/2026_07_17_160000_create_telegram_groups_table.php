<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Single-statement DDL — Neon pooler aborts Laravel's create+alter unique flow.
        DB::unprepared(<<<'SQL'
            CREATE TABLE IF NOT EXISTS telegram_groups (
                id BIGSERIAL PRIMARY KEY,
                chat_id BIGINT NOT NULL,
                title VARCHAR(255) NULL,
                type VARCHAR(32) NOT NULL DEFAULT 'group',
                username VARCHAR(255) NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                joined_at TIMESTAMP NULL,
                left_at TIMESTAMP NULL,
                created_at TIMESTAMP NULL,
                updated_at TIMESTAMP NULL,
                CONSTRAINT telegram_groups_chat_id_unique UNIQUE (chat_id)
            )
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_groups');
    }
};
