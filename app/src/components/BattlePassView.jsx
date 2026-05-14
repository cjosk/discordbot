import { useState } from 'react';
import { CalendarRange, Flame, Gift, ShieldCheck, TimerReset } from 'lucide-react';

import { useStore } from '../store';
import { DEFAULT_BATTLE_PASS_DURATION_DAYS, getBattlePassRewardTitle } from '../battlePass';
import { formatSilver } from '../silverFormat';

const copy = {
  tr: {
    eyebrow: 'Season Reward Track',
    title: 'Battle Pass',
    subtitle: '20+ kisilik onayli splitlere katildikca gunluk progress kazanirsin. Ayni gun en fazla 1 ilerleme yazilir.',
    noSeason: 'Aktif bir battle pass seasoni henuz baslatilmadi.',
    linkRequired: 'Battle pass ilerlemesini gorebilmek icin once Discord hesabini oyun ici karakterinle eslestir.',
    currentDay: 'Mevcut Seri',
    highestDay: 'En Yuksek Gun',
    skipsLeft: 'Kalan Skip',
    activeDays: 'Sayilan Gun',
    seasonWindow: 'Season Tarihi',
    start: 'Başlangıç',
    end: 'Bitiş',
    rewardTrack: 'Odul Hatti',
    recentActivity: 'Sayilan Son Gunler',
    noActivity: 'Bu season icinde sayilan bir split katilimi yok.',
    unlocked: 'Acildi',
    delivered: 'Teslim Edildi',
    claimed: 'Yatirildi',
    locked: 'Kilitli',
    ready: 'Hazir',
    endsIn: 'Bitise kalan',
    days: 'gun',
    dayLabel: 'Gun',
    silver: 'Silver',
    resetStarted: 'Reset sonrası yeni seri başladı.',
    skipUsedSuffix: 'skip kullanıldı.',
    progressWritten: 'Günlük progress yazıldı.',
  },
  en: {
    eyebrow: 'Season Reward Track',
    title: 'Battle Pass',
    subtitle: 'Join approved 20+ player splits to earn daily progress. Only one progress point counts per day.',
    noSeason: 'No active battle pass season has been started yet.',
    linkRequired: 'Link your Discord account to your in-game character to view battle pass progress.',
    currentDay: 'Current Streak',
    highestDay: 'Best Day',
    skipsLeft: 'Skips Left',
    activeDays: 'Counted Days',
    seasonWindow: 'Season Window',
    start: 'Start',
    end: 'End',
    rewardTrack: 'Reward Track',
    recentActivity: 'Recent Counted Days',
    noActivity: 'No counted split participation in this season yet.',
    unlocked: 'Unlocked',
    delivered: 'Delivered',
    claimed: 'Paid',
    locked: 'Locked',
    ready: 'Ready',
    endsIn: 'Ends in',
    days: 'days',
    dayLabel: 'Day',
    silver: 'Silver',
    resetStarted: 'A new streak started after a reset.',
    skipUsedSuffix: 'skip used.',
    progressWritten: 'Daily progress has been counted.',
  },
};

const getStatusLabel = (status, text) => {
  if (status === 'delivered') return text.delivered;
  if (status === 'claimed') return text.claimed;
  if (status === 'unlocked') return text.unlocked;
  if (status === 'ready') return text.ready;
  return text.locked;
};

const getStatusTone = (status) => {
  if (status === 'delivered') return 'border-emerald-900/20 bg-emerald-950/20 text-emerald-300';
  if (status === 'claimed') return 'border-secondary/20 bg-secondary/10 text-secondary';
  if (status === 'unlocked' || status === 'ready') return 'border-amber-900/20 bg-amber-950/20 text-amber-300';
  return 'border-white/10 bg-white/5 text-stone-500';
};

export function BattlePassView({ language = 'tr' }) {
  const { battlePassData, isLoadingBattlePass, user, discordLinks, players } = useStore();
  const text = copy[language] || copy.tr;
  const [mountedAt] = useState(() => Date.now());
  const linkedPlayerId = discordLinks[user?.id];
  const linkedPlayer = players.find((player) => player.id === linkedPlayerId);
  const season = battlePassData?.season || null;
  const summary = battlePassData?.playerSummary || null;
  const rewards = battlePassData?.rewards || [];

  const seasonDaysLeft = season?.ends_at
    ? Math.max(0, Math.ceil((new Date(season.ends_at).getTime() - mountedAt) / 86400000))
    : 0;

  if (isLoadingBattlePass) {
    return (
      <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 text-sm text-stone-500 shadow-2xl backdrop-blur-xl">
        Battle pass verisi yukleniyor...
      </div>
    );
  }

  if (!season) {
    return (
      <div className="rounded-[2rem] border border-dashed border-white/10 bg-black/20 p-12 text-center text-sm text-stone-500">
        {text.noSeason}
      </div>
    );
  }

  if (!linkedPlayer) {
    return (
      <div className="rounded-[2rem] border border-dashed border-white/10 bg-black/20 p-12 text-center text-sm text-stone-500">
        {text.linkRequired}
      </div>
    );
  }

  const currentDay = summary?.currentDay || 0;
  const highestDay = summary?.highestDay || 0;
  const skipsLeft = summary?.skipsLeft ?? season.skip_allowance ?? 0;
  const totalActivityDays = summary?.totalActivityDays || 0;
  const progressPercent = Math.min(
    100,
    Math.round((highestDay / Math.max(1, season.duration_days || DEFAULT_BATTLE_PASS_DURATION_DAYS)) * 100),
  );

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-600">{text.eyebrow}</p>
        <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-4xl font-headline font-black uppercase italic tracking-tight text-white">
              {season.name || text.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-stone-500">
              {text.subtitle}
            </p>
          </div>

          <div className="rounded-2xl border border-secondary/20 bg-secondary/10 px-5 py-4 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.endsIn}</p>
            <p className="mt-2 text-2xl font-headline font-black italic text-secondary">
              {seasonDaysLeft} {text.days}
            </p>
          </div>
        </div>

        <div className="mt-8 h-3 overflow-hidden rounded-full border border-white/5 bg-black/30">
          <div className="h-full rounded-full bg-gradient-to-r from-red-700 via-secondary to-amber-400" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {[
          { label: text.currentDay, value: currentDay, icon: Flame, tone: 'text-red-300' },
          { label: text.highestDay, value: highestDay, icon: ShieldCheck, tone: 'text-secondary' },
          { label: text.skipsLeft, value: skipsLeft, icon: TimerReset, tone: 'text-amber-300' },
          { label: text.activeDays, value: totalActivityDays, icon: CalendarRange, tone: 'text-white' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-[1.75rem] border border-white/5 bg-stone-950/40 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{card.label}</p>
                <Icon size={18} className={card.tone} />
              </div>
              <p className={`mt-5 text-4xl font-headline font-black italic ${card.tone}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.rewardTrack}</p>
              <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">{season.name || text.title}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rewards.map((reward) => {
              const rewardState = summary?.rewards?.find(
                (entry) => Number(entry.milestone_day) === Number(reward.milestone_day),
              ) || { ...reward, status: 'locked' };

              return (
                <div
                  key={reward.id || reward.milestone_day}
                  className="rounded-[1.5rem] border border-white/5 bg-black/20 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">
                        {text.dayLabel} {reward.milestone_day}
                      </p>
                      <h4 className="mt-2 text-lg font-headline font-black italic text-white">
                        {getBattlePassRewardTitle(reward, language)}
                      </h4>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getStatusTone(rewardState.status)}`}>
                      {getStatusLabel(rewardState.status, text)}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center gap-3 text-sm text-stone-400">
                    <Gift size={16} className="text-secondary" />
                    {reward.reward_type === 'silver' && reward.silver_amount > 0
                      ? `${formatSilver(reward.silver_amount)} ${text.silver}`
                      : reward.item_label || getBattlePassRewardTitle(reward, language)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.seasonWindow}</p>
            <div className="mt-4 space-y-3 text-sm text-stone-300">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <span>{text.start}</span>
                <span className="font-black text-white">{new Date(season.starts_at).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <span>{text.end}</span>
                <span className="font-black text-white">{new Date(season.ends_at).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.recentActivity}</p>
            <div className="mt-5 space-y-3">
              {(summary?.timeline || []).slice(-6).reverse().map((entry) => (
                <div key={entry.dateKey} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{entry.dateKey}</span>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-secondary">
                      {text.dayLabel} {entry.dayNumber}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {entry.reset
                      ? text.resetStarted
                      : entry.consumedSkips > 0
                        ? `${entry.consumedSkips} ${text.skipUsedSuffix}`
                        : text.progressWritten}
                  </p>
                </div>
              ))}

              {(summary?.timeline || []).length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-stone-500">
                  {text.noActivity}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
