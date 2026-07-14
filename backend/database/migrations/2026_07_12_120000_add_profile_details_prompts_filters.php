<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->unsignedSmallInteger('height_cm')->nullable()->after('relationship_goal');
            $table->string('education')->nullable()->after('height_cm');
            $table->string('occupation')->nullable()->after('education');
            $table->string('religion')->nullable()->after('occupation');
            $table->json('languages')->nullable()->after('religion');
            $table->string('children')->nullable()->after('languages');
            $table->string('pets')->nullable()->after('children');
            $table->string('drinking')->nullable()->after('pets');
            $table->string('smoking')->nullable()->after('drinking');
            $table->json('hobbies')->nullable()->after('smoking');
        });

        Schema::create('profile_prompts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('prompt_key');
            $table->text('answer');
            $table->timestamps();
            $table->unique(['user_id', 'prompt_key']);
        });

        Schema::table('preferences', function (Blueprint $table) {
            $table->json('preferred_languages')->nullable()->after('max_distance_km');
            $table->json('preferred_interest_ids')->nullable()->after('preferred_languages');
        });

        // Remap legacy relationship goals
        DB::table('profiles')->where('relationship_goal', 'dating')->update(['relationship_goal' => 'casual']);
        DB::table('profiles')->where('relationship_goal', 'getting_to_know')->update(['relationship_goal' => 'figuring_out']);
    }

    public function down(): void
    {
        DB::table('profiles')->where('relationship_goal', 'casual')->update(['relationship_goal' => 'dating']);
        DB::table('profiles')->where('relationship_goal', 'figuring_out')->update(['relationship_goal' => 'getting_to_know']);

        Schema::table('preferences', function (Blueprint $table) {
            $table->dropColumn(['preferred_languages', 'preferred_interest_ids']);
        });

        Schema::dropIfExists('profile_prompts');

        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn([
                'height_cm',
                'education',
                'occupation',
                'religion',
                'languages',
                'children',
                'pets',
                'drinking',
                'smoking',
                'hobbies',
            ]);
        });
    }
};
