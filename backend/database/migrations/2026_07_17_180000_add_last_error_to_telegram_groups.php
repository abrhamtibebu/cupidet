<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            ALTER TABLE telegram_groups
            ADD COLUMN IF NOT EXISTS last_error TEXT NULL
            SQL);
    }

    public function down(): void
    {
        if (Schema::hasColumn('telegram_groups', 'last_error')) {
            Schema::table('telegram_groups', function ($table) {
                $table->dropColumn('last_error');
            });
        }
    }
};
