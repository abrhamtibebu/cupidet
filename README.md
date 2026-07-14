# Cupid ET

Tinder-style Ethiopian / Habesha dating app with realtime chat.

## Local run

```bash
# API
cd backend && php artisan serve --host=127.0.0.1 --port=8001

# WebSockets (chat)
cd backend && php artisan reverb:start --host=0.0.0.0 --port=8080

# App
cd frontend && npm run dev
```

- App: http://127.0.0.1:5173
- Demo: `demo` / `demo1234`
- Admin: http://127.0.0.1:8001/admin — `admin@cupidet.com` / `password`
