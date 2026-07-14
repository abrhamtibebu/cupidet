<?php

return [
    'auto_approve_photos' => env('CUPID_AUTO_APPROVE_PHOTOS', true),

    'relationship_goals' => [
        'serious' => 'Serious relationship',
        'long_term' => 'Long-term partner',
        'casual' => 'Casual dating',
        'friendship' => 'Friendship',
        'figuring_out' => 'Still figuring it out',
    ],

    'languages' => [
        'Amharic',
        'Tigrinya',
        'Oromo',
        'Somali',
        'English',
        'Arabic',
        'French',
        'Italian',
        'Spanish',
        'German',
    ],

    'children_options' => ['want_someday', 'have_and_want_more', 'have_and_done', 'not_sure', 'dont_want'],
    'pets_options' => ['dog', 'cat', 'other', 'want_pets', 'no_pets', 'allergic'],
    'drinking_options' => ['never', 'sometimes', 'socially', 'regularly'],
    'smoking_options' => ['never', 'sometimes', 'socially', 'regularly'],

    'prompts' => [
        'favorite_ethiopian_dish' => "What's your favorite Ethiopian dish?",
        'coffee_or_tea' => 'Coffee or tea?',
        'ideal_weekend' => 'My ideal weekend is...',
        'place_to_visit_ethiopia' => 'A place in Ethiopia I want to visit is...',
        'best_concert' => "The best concert or event I've attended was...",
        'love_language' => 'My love language is...',
        'cant_live_without' => "I can't live without...",
        'perfect_sunday' => 'My perfect Sunday is...',
        'way_to_my_heart' => 'The quickest way to my heart is...',
        'two_truths' => 'Two truths and a lie...',
        'overly_competitive' => "I'm overly competitive about...",
    ],
];
