import { useEffect, useMemo, useState } from 'react';
import { Crown, Gift, RefreshCcw, Rocket, Trophy } from 'lucide-react';

import { useStore } from '../store';
import { BATTLE_PASS_NAME } from '../appConfig';
import {
  DEFAULT_BATTLE_PASS_DURATION_DAYS,
  DEFAULT_BATTLE_PASS_REWARDS,
  DEFAULT_BATTLE_PASS_SKIP_ALLOWANCE,
} from '../battlePass';
import { formatSilver, formatSilverInput, parseSilverInput } from '../silverFormat';

const rewardTypes = ['silver', 'item', 'chest', 'jackpot'];

const toDateInput = (value) => {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export function BattlePassAdmin() {
  const {
    battlePassData,
    startBattlePassSeason,
    saveBattlePassRewards,
    deliverBattlePassReward,
  } = useStore();
  const [isStarting, setIsStarting] = useState(false);
  const [isSavingRewards, setIsSavingRewards] = useState(false);
  const [deliveryId, setDeliveryId] = useState('');
  const [seasonForm, setSeasonForm] = useState({
    name: BATTLE_PASS_NAME,
    startsAt: toDateInput(new Date()),
    durationDays: DEFAULT_BATTLE_PASS_DURATION_DAYS,
    skipAllowance: DEFAULT_BATTLE_PASS_SKIP_ALLOWANCE,
  });
  const [editableRewards, setEditableRewards] = useState(
    DEFAULT_BATTLE_PASS_REWARDS.map((reward, index) => ({
      id: `default-${index}`,
      ...reward,
    })),
  );

  const season = battlePassData?.season || null;
  const serverRewards = battlePassData?.rewards;
  const admin = battlePassData?.admin || null;

  useEffect(() => {
    if (season) {
      setSeasonForm({
        name: season.name || BATTLE_PASS_NAME,
        startsAt: toDateInput(season.starts_at),
        durationDays: season.duration_days || DEFAULT_BATTLE_PASS_DURATION_DAYS,
        skipAllowance: season.skip_allowance ?? DEFAULT_BATTLE_PASS_SKIP_ALLOWANCE,
      });
    }

    if (Array.isArray(serverRewards) && serverRewards.length > 0) {
      setEditableRewards(
        serverRewards.map((reward) => ({
          ...reward,
          silver_amount: Number(reward.silver_amount) || 0,
        })),
      );
    }
  }, [season, serverRewards]);

  const leaderboard = useMemo(
    () => [...(admin?.playerSummaries || [])].sort((left, right) =>
      right.highestDay - left.highestDay
      || right.totalActivityDays - left.totalActivityDays
      || String(left.playerName || '').localeCompare(String(right.playerName || ''))),
    [admin?.playerSummaries],
  );

  const handleRewardChange = (rewardId, field, value) => {
    setEditableRewards((current) =>
      current.map((reward) => {
        if (reward.id !== rewardId) return reward;

        if (field === 'silver_amount') {
          return { ...reward, silver_amount: parseSilverInput(value) };
        }

        return { ...reward, [field]: value };
      }),
    );
  };

  const handleStartSeason = async () => {
    setIsStarting(true);
    try {
      await startBattlePassSeason({
        name: seasonForm.name,
        startsAt: new Date(`${seasonForm.startsAt}T00:00:00.000Z`).toISOString(),
        durationDays: Number(seasonForm.durationDays) || DEFAULT_BATTLE_PASS_DURATION_DAYS,
        skipAllowance: Number(seasonForm.skipAllowance) || DEFAULT_BATTLE_PASS_SKIP_ALLOWANCE,
        rewards: editableRewards.map((reward) => ({
          ...reward,
          silver_amount: Number(reward.silver_amount) || 0,
        })),
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSaveRewards = async () => {
    if (!season?.id) return;
    setIsSavingRewards(true);
    try {
      await saveBattlePassRewards(
        season.id,
        editableRewards.map((reward) => ({
          ...reward,
          silver_amount: Number(reward.silver_amount) || 0,
        })),
      );
    } finally {
      setIsSavingRewards(false);
    }
  };

  const handleDeliver = async (unlockId) => {
    setDeliveryId(unlockId);
    try {
      await deliverBattlePassReward(unlockId);
    } finally {
      setDeliveryId('');
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-600">Battle Pass Yonetimi</p>
        <h2 className="mt-3 text-4xl font-headline font-black uppercase italic tracking-tight text-white">
          Season Kontrol Merkezi
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-stone-500">
          20+ kisilik onayli splitler battle pass progress uretir. Buradan season baslatabilir, reward hattini duzenleyebilir ve manuel odulleri teslim edebilirsin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.05fr)]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Season Ayarlari</p>
                <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">
                  {season?.name || 'Yeni Season'}
                </h3>
              </div>
              <Rocket size={20} className="text-secondary" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Season Adi</span>
                <input
                  value={seasonForm.name}
                  onChange={(event) => setSeasonForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-secondary"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Baslangic</span>
                  <input
                    type="date"
                    value={seasonForm.startsAt}
                    onChange={(event) => setSeasonForm((current) => ({ ...current, startsAt: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-secondary"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Sure</span>
                  <input
                    type="number"
                    min="1"
                    value={seasonForm.durationDays}
                    onChange={(event) => setSeasonForm((current) => ({ ...current, durationDays: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-secondary"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Skip Hakki</span>
                  <input
                    type="number"
                    min="0"
                    value={seasonForm.skipAllowance}
                    onChange={(event) => setSeasonForm((current) => ({ ...current, skipAllowance: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-secondary"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleStartSeason}
                disabled={isStarting}
                className="mt-2 rounded-2xl border border-secondary/20 bg-secondary/10 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-stone-950 transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStarting ? 'Season Baslatiliyor...' : season ? 'Yeni Season Baslat' : 'Season Baslat'}
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Reward Hatti</p>
                <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">Milestone Odulleri</h3>
              </div>
              <Gift size={20} className="text-secondary" />
            </div>

            <div className="space-y-3">
              {editableRewards.map((reward) => (
                <div key={reward.id} className="grid grid-cols-1 gap-3 rounded-[1.5rem] border border-white/5 bg-black/20 p-4 md:grid-cols-[92px_140px_minmax(0,1fr)_120px]">
                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Gun</span>
                    <input
                      type="number"
                      min="1"
                      value={reward.milestone_day}
                      onChange={(event) => handleRewardChange(reward.id, 'milestone_day', event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white outline-none focus:border-secondary"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Tur</span>
                    <select
                      value={reward.reward_type}
                      onChange={(event) => handleRewardChange(reward.id, 'reward_type', event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white outline-none focus:border-secondary"
                    >
                      {rewardTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Etiket / Odul</span>
                    <input
                      value={reward.item_label || ''}
                      onChange={(event) => handleRewardChange(reward.id, 'item_label', event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white outline-none focus:border-secondary"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Silver</span>
                    <input
                      value={formatSilverInput(reward.silver_amount || 0)}
                      onChange={(event) => handleRewardChange(reward.id, 'silver_amount', event.target.value)}
                      inputMode="numeric"
                      className="w-full rounded-xl border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white outline-none focus:border-secondary"
                    />
                  </label>
                </div>
              ))}
            </div>

            {season?.id && (
              <button
                type="button"
                onClick={handleSaveRewards}
                disabled={isSavingRewards}
                className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingRewards ? 'Kaydediliyor...' : 'Reward Hattini Kaydet'}
              </button>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              { label: 'Eligible Split', value: admin?.eligibleSplitCount || 0, icon: Trophy, tone: 'text-secondary' },
              { label: 'Aktif Oyuncu', value: admin?.activeParticipantCount || 0, icon: Crown, tone: 'text-white' },
              { label: 'Odenen Silver', value: formatSilver(admin?.totalClaimedSilver || 0), icon: Gift, tone: 'text-emerald-300' },
              { label: 'Manuel Kuyruk', value: admin?.manualQueue?.length || 0, icon: RefreshCcw, tone: 'text-amber-300' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-[1.5rem] border border-white/5 bg-stone-950/40 p-5 shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{card.label}</p>
                    <Icon size={18} className={card.tone} />
                  </div>
                  <p className={`mt-4 text-3xl font-headline font-black italic ${card.tone}`}>{card.value}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Liderlik Tablosu</p>
                <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">Oyuncu Progress Sirasi</h3>
              </div>
              <Trophy size={20} className="text-secondary" />
            </div>

            <div className="space-y-3">
              {leaderboard.slice(0, 12).map((entry, index) => (
                <div key={entry.playerId} className="grid grid-cols-[48px_minmax(0,1fr)_92px_92px_92px] items-center gap-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                  <span className="text-sm font-black text-stone-500">#{index + 1}</span>
                  <span className="truncate text-sm font-bold text-white">{entry.playerName}</span>
                  <span className="text-xs font-black uppercase text-secondary">Gun {entry.highestDay}</span>
                  <span className="text-xs font-black uppercase text-stone-300">{entry.totalActivityDays} aktivite</span>
                  <span className="text-xs font-black uppercase text-amber-300">{entry.skipsLeft} skip</span>
                </div>
              ))}

              {leaderboard.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-stone-500">
                  Henüz battle pass progress kaydı yok.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Manuel Odul Kuyrugu</p>
                <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">Teslim Bekleyenler</h3>
              </div>
              <Gift size={20} className="text-secondary" />
            </div>

            <div className="space-y-3">
              {(admin?.manualQueue || []).map((unlock) => (
                <div key={unlock.id} className="flex flex-col gap-4 rounded-[1.5rem] border border-white/5 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-white">{unlock.player_name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                      Gun {unlock.milestone_day} • {unlock.item_label || unlock.reward_type}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeliver(unlock.id)}
                    disabled={deliveryId === unlock.id}
                    className="rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deliveryId === unlock.id ? 'Teslim Ediliyor...' : 'Teslim Edildi Olarak Isle'}
                  </button>
                </div>
              ))}

              {(admin?.manualQueue || []).length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-stone-500">
                  Bekleyen manuel odul yok.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
