<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->date('birth_date');
            $table->string('gender'); // male, female, other
            $table->string('location')->nullable();
            $table->text('bio')->nullable();
            $table->string('relationship_goal')->nullable(); // serious, dating, friendship, getting_to_know
            $table->timestamps();
        });

        Schema::create('photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('image_url');
            $table->string('path')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->string('status')->default('pending')->index(); // pending, approved, rejected
            $table->timestamps();
        });

        Schema::create('interests', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('user_interests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('interest_id')->constrained()->cascadeOnDelete();
            $table->unique(['user_id', 'interest_id']);
        });

        Schema::create('preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->unique();
            $table->string('preferred_gender')->nullable(); // male, female, any
            $table->unsignedTinyInteger('min_age')->default(18);
            $table->unsignedTinyInteger('max_age')->default(50);
            $table->string('preferred_location')->nullable();
            $table->timestamps();
        });

        Schema::create('likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('receiver_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['sender_id', 'receiver_id']);
        });

        Schema::create('passes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('receiver_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['sender_id', 'receiver_id']);
        });

        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_one')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_two')->constrained('users')->cascadeOnDelete();
            $table->timestamp('matched_at')->useCurrent();
            $table->timestamps();
            $table->unique(['user_one', 'user_two']);
        });

        Schema::create('blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blocker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('blocked_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['blocker_id', 'blocked_id']);
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reported_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason'); // fake_profile, harassment, spam, inappropriate_content
            $table->text('details')->nullable();
            $table->string('status')->default('open')->index(); // open, reviewing, resolved, dismissed
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
        Schema::dropIfExists('blocks');
        Schema::dropIfExists('matches');
        Schema::dropIfExists('passes');
        Schema::dropIfExists('likes');
        Schema::dropIfExists('preferences');
        Schema::dropIfExists('user_interests');
        Schema::dropIfExists('interests');
        Schema::dropIfExists('photos');
        Schema::dropIfExists('profiles');
    }
};
