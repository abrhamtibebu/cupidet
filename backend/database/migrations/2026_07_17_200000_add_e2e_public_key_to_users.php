<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Single-statement DDL — Neon pooler aborts multi-statement flows.
        DB::unprepared('ALTER TABLE users ADD COLUMN IF NOT EXISTS e2e_public_key TEXT NULL');
    }

    public function down(): void
    {
        Schema::table('users', function ($table) {
            $table->dropColumn('e2e_public_key');
        });
    }
};
