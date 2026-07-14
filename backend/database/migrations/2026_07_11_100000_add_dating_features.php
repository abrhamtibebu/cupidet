<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('location');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });

        Schema::table('preferences', function (Blueprint $table) {
            $table->unsignedSmallInteger('max_distance_km')->default(50)->after('preferred_location');
        });

        Schema::table('likes', function (Blueprint $table) {
            $table->string('type')->default('like')->after('receiver_id'); // like | super
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['match_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');

        Schema::table('likes', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::table('preferences', function (Blueprint $table) {
            $table->dropColumn('max_distance_km');
        });

        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
};
