# Cupid ET API

Base URL: `/api`

All authenticated routes expect:

```
Authorization: Bearer {sanctum_token}
Accept: application/json
```

## Auth

### POST `/auth/telegram`

Body (production):

```json
{ "initData": "<Telegram.WebApp.initData>" }
```

Body (local mock when `TELEGRAM_MOCK_AUTH=true`):

```json
{
  "mock": true,
  "telegram_id": 9001,
  "username": "cupid_demo",
  "first_name": "Cupid",
  "last_name": "Demo"
}
```

Response:

```json
{
  "token": "...",
  "user": {},
  "onboarding_complete": false
}
```

## Profile

- `GET /profile`
- `POST /profile` / `PUT /profile` — name, birth_date, gender, location, bio, relationship_goal, interest_ids, preferred_gender, min_age, max_age, preferred_location
- `GET /interests`
- `POST /profile/hide`
- `DELETE /account`

## Photos

- `POST /photos` multipart field `photo`
- `PUT /photos/{id}/primary`
- `DELETE /photos/{id}`

## Dating

- `GET /discover`
- `POST /like` `{ "user_id": 1 }`
- `POST /pass` `{ "user_id": 1 }`
- `GET /matches`

## Safety

- `POST /report` `{ "user_id", "reason", "details?" }`
- `POST /block` `{ "user_id" }`
- `DELETE /block/{userId}`

Reasons: `fake_profile`, `harassment`, `spam`, `inappropriate_content`
