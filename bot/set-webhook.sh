# Set Telegram webhook for Mingle 251
# Usage: ./set-webhook.sh https://api.example.com

set -euo pipefail

API_BASE="${1:?Usage: $0 https://api.example.com}"
TOKEN="${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is required}"
SECRET="${TELEGRAM_WEBHOOK_SECRET:-}"

ARGS=(
  -d "url=${API_BASE%/}/api/telegram/webhook"
  -d 'allowed_updates=["message","edited_message","my_chat_member"]'
)
if [ -n "$SECRET" ]; then
  ARGS+=(-d "secret_token=$SECRET")
fi

curl -sS "https://api.telegram.org/bot${TOKEN}/setWebhook" "${ARGS[@]}"
echo
