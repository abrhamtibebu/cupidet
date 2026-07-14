# Set Telegram webhook for Cupid ET
# Usage: ./set-webhook.sh https://api.example.com

set -euo pipefail

API_BASE="${1:?Usage: $0 https://api.example.com}"
TOKEN="${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is required}"
SECRET="${TELEGRAM_WEBHOOK_SECRET:-}"

ARGS=(-d "url=${API_BASE%/}/api/telegram/webhook")
if [ -n "$SECRET" ]; then
  ARGS+=(-d "secret_token=$SECRET")
fi

curl -sS "https://api.telegram.org/bot${TOKEN}/setWebhook" "${ARGS[@]}"
echo
