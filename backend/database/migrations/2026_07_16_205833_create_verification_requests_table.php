<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        if (Schema::hasTable('verification_requests')) {
            return;
        }

        // Neon pooler can abort transactional DDL; create outside a transaction.
        DB::statement('CREATE TABLE verification_requests (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL,
            selfie_url VARCHAR(255) NOT NULL,
            path VARCHAR(255) NULL,
            status VARCHAR(255) NOT NULL DEFAULT \'pending\',
            reviewed_at TIMESTAMP NULL,
            reviewed_by BIGINT NULL,
            notes TEXT NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )');
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_requests');
    }
};
