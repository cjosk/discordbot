Kurulum:

1. `bot/slash-bot/.env.example` dosyasini `bot/slash-bot/.env` olarak kopyala.
2. `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` degerlerini doldur.
3. Root klasorde `npm install` calistir.
4. Slash commandlari guild'e yazmak icin `npm run bot:slash:deploy` calistir.
5. Botu baslatmak icin `npm run bot:slash` calistir.

Hazir komutlar:

- `/ping`
- `/help`
- `/balance`

Not:

- Simdilik command deploy islemi `DISCORD_GUILD_ID` uzerinden guild scoped yapiliyor. Test icin en hizlisi bu.
- `/balance` mevcut `BALANCE_API_URL` endpointini kullanir.
