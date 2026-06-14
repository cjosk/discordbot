Cloudflare Worker slash botu.

Bu klasor artik surekli acik `discord.js` gateway botu degil. Discord Interactions endpoint'i olarak calisir ve Cloudflare Workers ile uyumludur.

Gerekli degiskenler:

1. `bot/slash-bot/.env.example` dosyasini `bot/slash-bot/.env` olarak kopyala.
2. Su degerleri doldur:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_APPLICATION_ID`
   - `DISCORD_PUBLIC_KEY`
   - `DISCORD_GUILD_ID` (test icin opsiyonel ama onerilir)
   - `BALANCE_API_URL`
   - `LOOT_LOGVIEWER_API_URL`
   - `LOOT_LOGVIEWER_BOT_SECRET`
   - `LOOT_LOGGER_CHANNEL_ID`
3. `npm install`

Komutlar:

- `npm run bot:slash`
  Cloudflare Worker'i local `wrangler dev` ile calistirir.
- `npm run bot:slash:deploy`
  Worker'i Cloudflare'a deploy eder.
- `npm run bot:slash:register`
  Slash commandlari Discord'a yazar.

Cloudflare kurulum:

1. `bot/slash-bot/wrangler.jsonc` icindeki Worker adini ihtiyaca gore duzenle.
2. Dashboard veya Wrangler ile Worker env/secret degerlerini gir:
   - `DISCORD_PUBLIC_KEY`
   - `DISCORD_BOT_TOKEN`
   - `BALANCE_API_URL`
   - `LOOT_LOGVIEWER_API_URL`
   - `LOOT_LOGVIEWER_BOT_SECRET`
   - `LOOT_LOGGER_CHANNEL_ID`
3. Deploy sonrasi Worker URL'sini Discord Developer Portal icindeki `Interactions Endpoint URL` alanina yapistir.
4. `npm run bot:slash:register` ile commandlari kaydet.

Loot Logviewer automation:

- Worker her dakika CTA channel mesajlarini poll eder.
- `MASS TIME:` iceren mesajlari loot logviewer API'ye upsert eder.
- Atanan loot logger staff'e `T-30`, `start`, ve eksik submission durumlarinda DM yollar.
- DM icindeki `upload link` ile logger staff admin olmadan dosya yukleyebilir.

Hazir komutlar:

- `/ping`
- `/help`
- `/balance`

Notlar:

- `DISCORD_BOT_TOKEN` sadece command register islemi icin gerekir.
- `DISCORD_GUILD_ID` varsa komutlar guild scoped kaydedilir. Yoksa global kaydedilir.
- `/balance` mevcut `BALANCE_API_URL` endpointini kullanir.
