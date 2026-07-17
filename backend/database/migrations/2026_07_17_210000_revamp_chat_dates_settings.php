<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Neon pooler: avoid multi-column ALTERs and prefer existence checks.
        if (! Schema::hasColumn('messages', 'type')) {
            DB::statement("ALTER TABLE messages ADD COLUMN type VARCHAR(32) NOT NULL DEFAULT 'text'");
        }
        if (! Schema::hasColumn('messages', 'meta')) {
            DB::statement('ALTER TABLE messages ADD COLUMN meta JSON NULL');
        }

        if (! Schema::hasTable('chat_settings')) {
            DB::unprepared(<<<'SQL'
                CREATE TABLE chat_settings (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
                    muted BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NULL,
                    updated_at TIMESTAMP NULL,
                    CONSTRAINT chat_settings_user_match_unique UNIQUE (user_id, match_id)
                )
                SQL);
        }

        if (! Schema::hasTable('match_dates')) {
            DB::unprepared(<<<'SQL'
                CREATE TABLE match_dates (
                    id BIGSERIAL PRIMARY KEY,
                    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
                    proposed_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    scheduled_at TIMESTAMP NOT NULL,
                    place VARCHAR(255) NULL,
                    note TEXT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMP NULL,
                    updated_at TIMESTAMP NULL
                )
                SQL);
        }

        DB::table('messages')
            ->where('body', 'like', 'enc1:%')
            ->update(['body' => 'This older encrypted message could not be recovered.']);
    }

    public function down(): void
    {
        Schema::dropIfExists('match_dates');
        Schema::dropIfExists('chat_settings');
        if (Schema::hasColumn('messages', 'meta')) {
            DB::statement('ALTER TABLE messages DROP COLUMN meta');
        }
        if (Schema::hasColumn('messages', 'type')) {
            DB::statement('ALTER TABLE messages DROP COLUMN type');
        }
    }
};
