Kurulum:

1. `bot/.env.example` dosyasini `bot/.env` olarak kopyala.
2. `DISCORD_BOT_TOKEN` gir.
3. Root klasorde `npm install` calistir.
4. `npm run bot:balance` calistir.

Notlar:

- Bot surekli acik kalmali. Bilgisayari kapatirsan veya process kapanirsa `!balance` calismaz.
- Discord Developer Portal'da `MESSAGE CONTENT INTENT` acik olmali.
- Botun mesaji okuyabildigi kanalda `View Channel`, `Send Messages`, `Read Message History` izinleri olmali.
- Endpoint:
  `GET /api/discord-balance?discordId=DISCORD_USER_ID`
