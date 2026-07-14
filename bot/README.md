# Cupid ET Telegram Bot

Bot logic runs inside the Laravel API (`POST /api/telegram/webhook`).

## BotFather setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Copy the bot token into `backend/.env` as `TELEGRAM_BOT_TOKEN`
3. Set `TELEGRAM_BOT_USERNAME` (without `@`)
4. Configure the Mini App URL (must be **https**):
   - BotFather → Bot Settings → Menu Button / Web App URL
   - Also set `TELEGRAM_MINI_APP_URL` in `.env`

## Local Telegram testing with cloudflared

Telegram will not open `http://localhost`. Use two quick tunnels (frontend + API — the phone cannot call localhost):

```powershell
# Terminal A — Mini App (Vite)
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:5173

# Terminal B — API
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8001
```

Or run `scripts/telegram-tunnels.ps1`.

Then:

1. Put the **APP** `https://….trycloudflare.com` URL in BotFather
2. Set `frontend/.env`:
   ```
   VITE_API_URL=https://API-TUNNEL.trycloudflare.com/api
   VITE_MOCK_AUTH=false
   ```
3. Set `backend/.env`:
   ```
   FRONTEND_URL=https://APP-TUNNEL.trycloudflare.com
   TELEGRAM_MINI_APP_URL=https://APP-TUNNEL.trycloudflare.com
   TELEGRAM_MOCK_AUTH=false
   TELEGRAM_BOT_TOKEN=...
   ```
4. Restart `npm run dev` and run `php artisan config:clear`

## Push notifications (Telegram DMs)

Likes, matches, and new messages are pushed as Telegram bot DMs when the Mini App is closed.

Locally you need a queue worker:

```bash
cd backend
php artisan queue:work
```

Users can toggle Matches / Likes / Messages under Settings in the app.

## Commands

| Command | Behavior |
|---------|----------|
| `/start` | Welcome message + **Open Cupid ET** Web App button |
| `/profile` | Opens Mini App |
| `/settings` | Opens Mini App |
| `/help` | Help text |

## Webhook (production)

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_API_HOST/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```
