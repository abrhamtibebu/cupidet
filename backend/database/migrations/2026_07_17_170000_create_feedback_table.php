<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Single-statement DDL works reliably with the Neon pooler.
        DB::unprepared(<<<'SQL'
            CREATE TABLE IF NOT EXISTS feedback (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                category VARCHAR(40) NOT NULL DEFAULT 'general',
                rating SMALLINT NULL,
                message TEXT NOT NULL,
                page VARCHAR(255) NULL,
                app_version VARCHAR(80) NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'open',
                notes TEXT NULL,
                reviewed_at TIMESTAMP NULL,
                created_at TIMESTAMP NULL,
                updated_at TIMESTAMP NULL,
                CONSTRAINT feedback_user_id_foreign
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback');
    }
};
