<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_matches')->default(true)->after('last_active');
            $table->boolean('notify_likes')->default(true)->after('notify_matches');
            $table->boolean('notify_messages')->default(true)->after('notify_likes');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['notify_matches', 'notify_likes', 'notify_messages']);
        });
    }
};
