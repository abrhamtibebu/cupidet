<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TABLE IF NOT EXISTS telegram_broadcasts (
                id BIGSERIAL PRIMARY KEY,
                message_preview TEXT NULL,
                photo_path VARCHAR(512) NULL,
                with_app_button BOOLEAN NOT NULL DEFAULT TRUE,
                target_count INTEGER NOT NULL DEFAULT 0,
                sent_count INTEGER NOT NULL DEFAULT 0,
                failed_count INTEGER NOT NULL DEFAULT 0,
                track_code VARCHAR(64) NOT NULL,
                created_at TIMESTAMP NULL,
                updated_at TIMESTAMP NULL,
                CONSTRAINT telegram_broadcasts_track_code_unique UNIQUE (track_code)
            )
            SQL);

        DB::unprepared(<<<'SQL'
            CREATE TABLE IF NOT EXISTS telegram_broadcast_opens (
                id BIGSERIAL PRIMARY KEY,
                broadcast_id BIGINT NOT NULL REFERENCES telegram_broadcasts(id) ON DELETE CASCADE,
                user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
                telegram_id BIGINT NOT NULL,
                username VARCHAR(255) NULL,
                first_name VARCHAR(255) NULL,
                last_name VARCHAR(255) NULL,
                created_at TIMESTAMP NULL,
                updated_at TIMESTAMP NULL,
                CONSTRAINT telegram_broadcast_opens_broadcast_telegram_unique UNIQUE (broadcast_id, telegram_id)
            )
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_broadcast_opens');
        Schema::dropIfExists('telegram_broadcasts');
    }
};
