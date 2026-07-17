<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [
        '#^https://.*\\.trycloudflare\\.com$#',
        '#^https://.*\\.onrender\\.com$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    // Cache preflights so chat polling does not OPTIONS on every request.
    'max_age' => 7200,
    'supports_credentials' => false,
];
