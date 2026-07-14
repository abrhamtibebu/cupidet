# Telegram Mini App local HTTPS via Cloudflare quick tunnels
# Need three tunnels: App (Vite), API (Laravel), Reverb (WebSockets)

Write-Host "Starting APP + API + Reverb tunnels..." -ForegroundColor Cyan
$cf = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

Start-Process powershell -ArgumentList @("-NoExit","-Command","Write-Host 'APP -> :5173' -ForegroundColor Green; & '$cf' tunnel --url http://127.0.0.1:5173")
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList @("-NoExit","-Command","Write-Host 'API -> :8001' -ForegroundColor Green; & '$cf' tunnel --url http://127.0.0.1:8001")
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList @("-NoExit","-Command","Write-Host 'WS  -> :8080' -ForegroundColor Green; & '$cf' tunnel --url http://127.0.0.1:8080")

Write-Host "Set VITE_REVERB_HOST to the WS tunnel hostname (port 443, scheme https). Restart npm run dev."
