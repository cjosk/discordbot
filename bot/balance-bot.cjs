require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const {
  ActivityType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
} = require('discord.js');

const DISCORD_BOT_TOKEN = String(process.env.DISCORD_BOT_TOKEN || '').trim();
const BALANCE_API_URL = String(
  process.env.BALANCE_API_URL || 'https://teamsupremacyhq.vercel.app/api/discord-balance',
).trim();
const ALLOWED_BALANCE_CHANNEL_ID = String(
  process.env.ALLOWED_BALANCE_CHANNEL_ID || '1488349953905655951',
).trim();
const ALBION_ATTENDANCE_URL = String(
  process.env.ALBION_ATTENDANCE_URL
    || 'https://europe.albionbb.com/guilds/MsXlz1fUQFySJSqG4HiGbA/attendance?minPlayers=10',
).trim();
const ADMIN_WITHDRAW_DISCORD_ID = '140870990816083968';
const ATTENDANCE_CACHE_TTL_MS = 3 * 60 * 1000;
const NUXT_DATA_PATTERN = /<script type="application\/json" data-nuxt-data="nuxt-app" data-ssr="true" id="__NUXT_DATA__">(?<data>[\s\S]*?)<\/script>/i;

if (!DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN is required.');
}

const HELP_ITEMS = [
  { command: '!balance / !bal', description: 'Bagli karakterinin guncel silver bakiyesini gosterir.' },
  { command: '!regear', description: 'Bekleyen regear talebin var mi, varsa kac adet oldugunu gosterir.' },
  { command: '!topbalance', description: 'En yuksek bakiyeli ilk 5 oyuncuyu listeler.' },
  { command: '!topkda', description: 'Attendance verisine gore en yuksek KDA rating ilk 5 oyuncuyu listeler.' },
  { command: '!attendance / !attandace', description: 'AlbionBB attendance tablosunda kendi kaydini gosterir.' },
  { command: '!profil', description: 'Attendance tablosundaki kills, deaths, ip, damage, heal ve fame istatistiklerini gosterir.' },
  { command: '!withdraw @kullanici miktar', description: 'Sadece admin icin. Etiketlenen kullanicinin bagli karakterinden belirtilen miktari dusurur.' },
  { command: '!yardim', description: 'Kullanilabilir komutlari ve ne ise yaradiklarini gosterir.' },
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const attendanceCache = {
  players: null,
  expiresAt: 0,
};

const normalizeMessage = (value) => String(value || '').trim().toLowerCase();
const normalizeName = (value) => String(value || '').trim().toLowerCase();
const formatInteger = (value) => new Intl.NumberFormat('en-US').format(Math.floor(Number(value) || 0));

const formatFame = (value) => {
  const numericValue = Number(value) || 0;

  if (!numericValue) return '0';
  if (numericValue >= 1_000_000) return `${(numericValue / 1_000_000).toFixed(1)}m`;
  if (numericValue >= 1_000) return `${(numericValue / 1_000).toFixed(1)}k`;
  return formatInteger(numericValue);
};

const formatAttendanceDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatKda = (kills, deaths) => ((Number(kills) || 0) / Math.max(Number(deaths) || 0, 1)).toFixed(2);

const fetchJson = async (url) => {
  const response = await fetch(url, { method: 'GET' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed.');
  }

  return payload;
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'SupremacyHQ Discord Bot',
    },
  });

  if (!response.ok) {
    throw new Error(`AlbionBB request failed with ${response.status}.`);
  }

  return response.text();
};

const fetchBalance = async (discordId) => {
  const url = new URL(BALANCE_API_URL);
  url.searchParams.set('discordId', discordId);
  return fetchJson(url.toString());
};

const fetchRegear = async (discordId) => {
  const url = new URL(BALANCE_API_URL);
  url.searchParams.set('mode', 'regear');
  url.searchParams.set('discordId', discordId);
  return fetchJson(url.toString());
};

const fetchTopBalances = async () => {
  const url = new URL(BALANCE_API_URL);
  url.searchParams.set('mode', 'topbalances');
  url.searchParams.set('limit', '5');
  return fetchJson(url.toString());
};

const fetchAdminWithdraw = async ({ actorDiscordId, targetDiscordId, amount }) => {
  const url = new URL(BALANCE_API_URL);
  url.searchParams.set('mode', 'adminwithdraw');
  url.searchParams.set('actorDiscordId', actorDiscordId);
  url.searchParams.set('targetDiscordId', targetDiscordId);
  url.searchParams.set('amount', String(amount));
  return fetchJson(url.toString());
};

const resolveNuxtValue = (dataset, value) => {
  if (typeof value === 'number') {
    return dataset[value];
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveNuxtValue(dataset, entry));
  }

  return value;
};

const parseAttendancePlayers = (html) => {
  const match = String(html || '').match(NUXT_DATA_PATTERN);
  if (!match?.groups?.data) {
    throw new Error('AlbionBB attendance data not found.');
  }

  const dataset = JSON.parse(match.groups.data);
  const players = [];

  for (const entry of dataset) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    if (!Object.prototype.hasOwnProperty.call(entry, 'name')) continue;
    if (!Object.prototype.hasOwnProperty.call(entry, 'attendance')) continue;
    if (!Object.prototype.hasOwnProperty.call(entry, 'avgIp')) continue;

    const player = {
      name: String(resolveNuxtValue(dataset, entry.name) || '').trim(),
      guildName: String(resolveNuxtValue(dataset, entry.guildName) || '').trim(),
      allianceName: String(resolveNuxtValue(dataset, entry.allianceName) || '').trim(),
      lastBattle: String(resolveNuxtValue(dataset, entry.lastBattle) || '').trim(),
      attendance: Number(resolveNuxtValue(dataset, entry.attendance)) || 0,
      kills: Number(resolveNuxtValue(dataset, entry.kills)) || 0,
      deaths: Number(resolveNuxtValue(dataset, entry.deaths)) || 0,
      avgIp: Number(resolveNuxtValue(dataset, entry.avgIp)) || 0,
      damage: Number(resolveNuxtValue(dataset, entry.damage)) || 0,
      heal: Number(resolveNuxtValue(dataset, entry.heal)) || 0,
      kFame: Number(resolveNuxtValue(dataset, entry.killFame)) || 0,
      dFame: Number(resolveNuxtValue(dataset, entry.deathFame)) || 0,
    };

    if (!player.name) continue;
    players.push(player);
  }

  return players
    .sort((left, right) => {
      if (right.attendance !== left.attendance) return right.attendance - left.attendance;
      return normalizeName(left.name).localeCompare(normalizeName(right.name));
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
};

const getAttendancePlayers = async () => {
  if (attendanceCache.players && attendanceCache.expiresAt > Date.now()) {
    return attendanceCache.players;
  }

  const html = await fetchText(ALBION_ATTENDANCE_URL);
  const players = parseAttendancePlayers(html);

  attendanceCache.players = players;
  attendanceCache.expiresAt = Date.now() + ATTENDANCE_CACHE_TTL_MS;

  return players;
};

const fetchAttendanceProfile = async (discordId) => {
  const balance = await fetchBalance(discordId);
  if (!balance?.playerName) {
    return {
      linked: false,
      message: balance?.message || 'Discord hesabin sitede bir karaktere bagli degil.',
    };
  }

  const players = await getAttendancePlayers();
  const attendancePlayer = players.find(
    (player) => normalizeName(player.name) === normalizeName(balance.playerName),
  );

  if (!attendancePlayer) {
    return {
      linked: true,
      found: false,
      playerName: balance.playerName,
      message: `${balance.playerName} icin AlbionBB attendance kaydi bulunamadi.`,
    };
  }

  return {
    linked: true,
    found: true,
    playerName: balance.playerName,
    totalPlayers: players.length,
    ...attendancePlayer,
  };
};

const fetchTopKda = async () => {
  const players = await getAttendancePlayers();

  return players
    .filter((player) => player.kills > 0)
    .map((player) => ({
      ...player,
      kda: Number(formatKda(player.kills, player.deaths)),
    }))
    .sort((left, right) => {
      if (right.kda !== left.kda) return right.kda - left.kda;
      if (right.kills !== left.kills) return right.kills - left.kills;
      return left.deaths - right.deaths;
    })
    .slice(0, 5)
    .map((player, index) => ({
      rank: index + 1,
      name: player.name,
      kills: player.kills,
      deaths: player.deaths,
      kda: player.kda.toFixed(2),
      attendance: player.attendance,
    }));
};

const getAccentByKind = (kind) => {
  switch (kind) {
    case 'success':
      return 0x10b981;
    case 'warning':
      return 0xf59e0b;
    case 'danger':
      return 0xef4444;
    case 'info':
      return 0x38bdf8;
    default:
      return 0xe9c349;
  }
};

const createBaseEmbed = (message, { kind = 'gold', kicker, title, description }) => {
  const displayName = message.author.globalName || message.author.username;

  return new EmbedBuilder()
    .setColor(getAccentByKind(kind))
    .setAuthor({
      name: displayName,
      iconURL: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
    })
    .setTitle(title)
    .setDescription([kicker ? `### ${kicker}` : '', description].filter(Boolean).join('\n\n'))
    .setThumbnail(message.author.displayAvatarURL({ extension: 'png', size: 256 }))
    .setFooter({ text: 'Team Supremacy • Guild Bank Network' })
    .setTimestamp();
};

const buildUnlinkedEmbed = (message, responseMessage) =>
  createBaseEmbed(message, {
    kind: 'danger',
    kicker: 'Baglanti Gerekli',
    title: 'Karakter Bulunamadi',
    description: responseMessage || 'Discord hesabin sitede bir karaktere bagli degil.',
  });

const buildBalanceEmbed = (message, balance) => {
  if (!balance?.playerId) {
    return buildUnlinkedEmbed(message, balance?.message);
  }

  return createBaseEmbed(message, {
    kind: 'gold',
    kicker: 'Banka Ozeti',
    title: `${balance.playerName || message.author.username}`,
    description: 'Guncel silver bakiyen hazir.',
  }).addFields(
    { name: 'Bakiye', value: `\`${balance.balanceFormatted || '0'} Silver\``, inline: true },
    { name: 'Durum', value: '`Aktif hesap`', inline: true },
  );
};

const buildRegearEmbed = (message, regear) => {
  if (!regear?.linked) {
    return buildUnlinkedEmbed(message, regear?.message);
  }

  const hasPending = Number(regear?.pendingCount) > 0;
  const embed = createBaseEmbed(message, {
    kind: hasPending ? 'warning' : 'success',
    kicker: 'Regear Merkezi',
    title: hasPending ? 'Bekleyen Talepler' : 'Regear Durumu Temiz',
    description: hasPending
      ? `Su anda **${regear.pendingCount}** adet bekleyen regear talebin var.`
      : 'Bekleyen regear talebin bulunmuyor.',
  });

  if (hasPending) {
    const lines = (regear.submissions || []).slice(0, 5).map((submission, index) => {
      const role = submission.role || 'rol yok';
      const title = submission.contentTitle || 'content yok';
      return `\`${index + 1}\` ${role} • ${title}`;
    });

    embed.addFields({
      name: 'Son Gonderimler',
      value: lines.join('\n') || 'Liste bulunamadi.',
    });
  }

  return embed;
};

const buildTopBalancesEmbed = (message, topBalances) => {
  const players = Array.isArray(topBalances?.players) ? topBalances.players : [];
  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
  const lines = players.map((player, index) => {
    const badge = medals[index] || `${player.rank}.`;
    return `${badge} **${player.name}**  •  \`${player.balanceFormatted} Silver\``;
  });

  return createBaseEmbed(message, {
    kind: 'gold',
    kicker: 'Lonca Kasasi',
    title: 'Top Balance',
    description: 'En yuksek bakiyeli oyuncular.',
  }).addFields({
    name: 'Siralama',
    value: lines.join('\n') || 'Gosterilecek oyuncu bulunamadi.',
  });
};

const buildTopKdaEmbed = (message, players) => {
  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
  const lines = players.map((player, index) => {
    const badge = medals[index] || `${player.rank}.`;
    return `${badge} **${player.name}**  •  \`KDA ${player.kda}\`  •  \`${player.kills}/${player.deaths}\``;
  });

  return createBaseEmbed(message, {
    kind: 'info',
    kicker: 'Albion Combat Rating',
    title: 'Top KDA',
    description: 'Attendance verisinden hesaplanan en iyi KDA siralamasi.',
  }).addFields({
    name: 'Leaderboard',
    value: lines.join('\n') || 'Gosterilecek oyuncu bulunamadi.',
  });
};

const buildAttendanceEmbed = (message, attendance) => {
  if (!attendance?.linked) {
    return buildUnlinkedEmbed(message, attendance?.message);
  }

  if (!attendance?.found) {
    return createBaseEmbed(message, {
      kind: 'warning',
      kicker: 'AlbionBB Attendance',
      title: attendance.playerName || 'Kayit Bulunamadi',
      description: attendance.message || 'Attendance kaydi bulunamadi.',
    });
  }

  return createBaseEmbed(message, {
    kind: 'info',
    kicker: 'AlbionBB Attendance',
    title: attendance.name,
    description: 'Guild attendance kaydin hazir.',
  }).addFields(
    { name: 'Attendance', value: `\`${formatInteger(attendance.attendance)}\``, inline: true },
    { name: 'Sira', value: `\`#${attendance.rank}/${attendance.totalPlayers}\``, inline: true },
    { name: 'Ortalama IP', value: `\`${formatInteger(attendance.avgIp)}\``, inline: true },
    { name: 'Kill / Death', value: `\`${formatInteger(attendance.kills)} / ${formatInteger(attendance.deaths)}\``, inline: true },
    { name: 'Damage / Heal', value: `\`${formatFame(attendance.damage)} / ${formatFame(attendance.heal)}\``, inline: true },
    { name: 'Son Savas', value: `\`${formatAttendanceDate(attendance.lastBattle)}\``, inline: true },
  );
};

const buildProfileEmbed = (message, profile) => {
  if (!profile?.linked) {
    return buildUnlinkedEmbed(message, profile?.message);
  }

  if (!profile?.found) {
    return createBaseEmbed(message, {
      kind: 'warning',
      kicker: 'Savas Profili',
      title: profile.playerName || 'Kayit Bulunamadi',
      description: profile.message || 'Profil verisi bulunamadi.',
    });
  }

  return createBaseEmbed(message, {
    kind: 'info',
    kicker: 'Albion Savas Profili',
    title: profile.name,
    description: 'Attendance tablosundaki temel performans metriklerin.',
  }).addFields(
    { name: 'Kills', value: `\`${formatInteger(profile.kills)}\``, inline: true },
    { name: 'Deaths', value: `\`${formatInteger(profile.deaths)}\``, inline: true },
    { name: 'Avg IP', value: `\`${formatInteger(profile.avgIp)}\``, inline: true },
    { name: 'Damage', value: `\`${formatFame(profile.damage)}\``, inline: true },
    { name: 'Heal', value: `\`${formatFame(profile.heal)}\``, inline: true },
    { name: 'Attendance', value: `\`${formatInteger(profile.attendance)}\``, inline: true },
    { name: 'kFame', value: `\`${formatFame(profile.kFame)}\``, inline: true },
    { name: 'dFame', value: `\`${formatFame(profile.dFame)}\``, inline: true },
    { name: 'Son Savas', value: `\`${formatAttendanceDate(profile.lastBattle)}\``, inline: true },
  );
};

const buildHelpEmbed = (message) =>
  createBaseEmbed(message, {
    kind: 'info',
    kicker: 'Komut Merkezi',
    title: 'Yardim',
    description: 'Bu kanalda kullanabilecegin komutlar:',
  }).addFields(
    HELP_ITEMS.map((item) => ({
      name: item.command,
      value: item.description,
    })),
  );

const buildWithdrawEmbed = (message, withdrawal) => {
  const success = Boolean(withdrawal?.success);
  const embed = createBaseEmbed(message, {
    kind: success ? 'success' : 'danger',
    kicker: 'Admin Islem Merkezi',
    title: success ? 'Withdraw Tamamlandi' : 'Withdraw Basarisiz',
    description: withdrawal?.message || 'Islem tamamlanamadi.',
  });

  if (success) {
    embed.addFields(
      { name: 'Karakter', value: `\`${withdrawal.playerName || '-'}\``, inline: true },
      { name: 'Dusulen Tutar', value: `\`${withdrawal.amountFormatted || '0'} Silver\``, inline: true },
      { name: 'Yeni Bakiye', value: `\`${withdrawal.balanceFormatted || '0'} Silver\``, inline: true },
    );
  }

  return embed;
};

const parseWithdrawCommand = (messageContent) => {
  const parts = String(messageContent || '').trim().split(/\s+/);
  if (parts.length < 3) {
    return { error: 'Kullanim: `!withdraw @kullanici miktar`' };
  }

  const targetToken = parts[1] || '';
  const amountToken = parts[2] || '';
  const mentionMatch = targetToken.match(/^<@!?(\d+)>$/);
  const targetDiscordId = mentionMatch ? mentionMatch[1] : targetToken.replace(/\D/g, '');
  const amount = Math.max(0, Math.floor(Number(amountToken.replace(/[^\d.-]/g, '')) || 0));

  if (!targetDiscordId) {
    return { error: 'Hedef kullaniciyi mention olarak girmen gerekiyor.' };
  }

  if (!amount) {
    return { error: 'Gecerli bir miktar girmen gerekiyor.' };
  }

  return {
    targetDiscordId,
    amount,
  };
};

const commandHandlers = {
  '!balance': async (message) => {
    const balance = await fetchBalance(message.author.id);
    return { embeds: [buildBalanceEmbed(message, balance)] };
  },
  '!bal': async (message) => {
    const balance = await fetchBalance(message.author.id);
    return { embeds: [buildBalanceEmbed(message, balance)] };
  },
  '!regear': async (message) => {
    const regear = await fetchRegear(message.author.id);
    return { embeds: [buildRegearEmbed(message, regear)] };
  },
  '!topbalance': async (message) => {
    const topBalances = await fetchTopBalances();
    return { embeds: [buildTopBalancesEmbed(message, topBalances)] };
  },
  '!topkda': async (message) => {
    const topKda = await fetchTopKda();
    return { embeds: [buildTopKdaEmbed(message, topKda)] };
  },
  '!attendance': async (message) => {
    const attendance = await fetchAttendanceProfile(message.author.id);
    return { embeds: [buildAttendanceEmbed(message, attendance)] };
  },
  '!attandace': async (message) => {
    const attendance = await fetchAttendanceProfile(message.author.id);
    return { embeds: [buildAttendanceEmbed(message, attendance)] };
  },
  '!profil': async (message) => {
    const profile = await fetchAttendanceProfile(message.author.id);
    return { embeds: [buildProfileEmbed(message, profile)] };
  },
  '!yardim': async (message) => ({ embeds: [buildHelpEmbed(message)] }),
};

client.once('clientReady', () => {
  client.user.setPresence({
    activities: [{ name: 'Supremacy HQ', type: ActivityType.Playing }],
    status: 'online',
  });

  console.log(`Balance bot online: ${client.user?.tag || 'unknown'}`);
  console.log(`Allowed command channel: ${ALLOWED_BALANCE_CHANNEL_ID}`);
});

client.on('messageCreate', async (message) => {
  if (!message || message.author?.bot) return;
  if (String(message.channelId) !== ALLOWED_BALANCE_CHANNEL_ID) return;

  const content = normalizeMessage(message.content);
  const isWithdrawCommand = content.startsWith('!withdraw');
  const handler = commandHandlers[content];
  if (!handler && !isWithdrawCommand) return;

  try {
    await message.channel.sendTyping();
    let response;

    if (isWithdrawCommand) {
      if (String(message.author.id) !== ADMIN_WITHDRAW_DISCORD_ID) {
        response = {
          content: 'Bu komutu sadece yetkili admin kullanabilir.',
        };
      } else {
        const parsed = parseWithdrawCommand(message.content);

        if (parsed.error) {
          response = { content: parsed.error };
        } else {
          const withdrawal = await fetchAdminWithdraw({
            actorDiscordId: message.author.id,
            targetDiscordId: parsed.targetDiscordId,
            amount: parsed.amount,
          });
          response = { embeds: [buildWithdrawEmbed(message, withdrawal)] };
        }
      }
    } else {
      response = await handler(message);
    }

    await message.reply({
      ...response,
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    await message.reply({
      content: `Hata: ${error.message || 'Komut calistirilamadi.'}`,
      allowedMentions: { repliedUser: false },
    });
  }
});

client.login(DISCORD_BOT_TOKEN);
