import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCcw, ShieldIcon, UserIcon, UserPlus } from 'lucide-react';

import { useStore } from '../store';
import {
  ALBION_GUILD_ID,
  BATTLE_PASS_NAME,
  GUILD_NAME,
  SHOP_NAME,
  SITE_NAME,
} from '../appConfig';
import { DISCORD_GUILD_ID, DISCORD_MEMBER_ROLE_ID } from '../authConfig';

const RESET_CONFIRMATION_TEXT = 'RESET_GUILD_DATA';

export function Settings() {
  const {
    user,
    systemConfig,
    isLoadingSystemConfig,
    fetchSystemConfig,
    adminSyncGuild,
    adminAddManualPlayerByNickname,
    adminResetAndSyncGuild,
  } = useStore();
  const [guildIdInput, setGuildIdInput] = useState('');
  const [manualNickname, setManualNickname] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSystemConfig();
    }
  }, [fetchSystemConfig, user?.role]);

  const effectiveConfig = useMemo(
    () => systemConfig || {
      siteName: SITE_NAME,
      guildName: GUILD_NAME,
      shopName: SHOP_NAME,
      battlePassName: BATTLE_PASS_NAME,
      albionGuildId: ALBION_GUILD_ID,
    },
    [systemConfig],
  );

  const configRows = useMemo(
    () => [
      { label: 'Site adi', value: effectiveConfig.siteName || '-' },
      { label: 'Guild etiketi', value: effectiveConfig.guildName || '-' },
      { label: 'Shop adi', value: effectiveConfig.shopName || '-' },
      { label: 'Battle pass adi', value: effectiveConfig.battlePassName || '-' },
      { label: 'Albion guild id', value: effectiveConfig.albionGuildId || '-' },
      { label: 'Discord guild id', value: DISCORD_GUILD_ID || '-' },
      { label: 'Discord uye rol id', value: DISCORD_MEMBER_ROLE_ID || '-' },
    ],
    [effectiveConfig],
  );

  const buildSyncMessage = (result, resetApplied = false) => {
    const parts = [
      resetApplied ? 'Reset ve yeniden kurulum tamamlandi.' : 'Guild senkronu tamamlandi.',
      `${result?.total || 0} oyuncu okundu.`,
      `${result?.added || 0} yeni oyuncu eklendi.`,
      `${result?.reactivated || 0} oyuncu tekrar aktif edildi.`,
      `${result?.renamed || 0} oyuncu adi guncellendi.`,
      `${result?.mergedManual || 0} manuel oyuncu resmi roster ile birlestirildi.`,
      `${result?.left || 0} oyuncu pasife cekildi.`,
    ];

    return parts.join(' ');
  };

  const handleAddManualPlayer = async () => {
    const trimmedNickname = manualNickname.trim();
    if (!trimmedNickname) {
      setErrorMessage('Nickname girmen gerekiyor.');
      setStatusMessage('');
      return;
    }

    setErrorMessage('');
    setStatusMessage('');
    setIsAddingPlayer(true);

    try {
      const result = await adminAddManualPlayerByNickname(trimmedNickname);
      const nickname = result?.player?.name || trimmedNickname;

      if (result?.mode === 'existing') {
        setStatusMessage(`${nickname} zaten aktif rosterda var. Yeni manuel kayit acilmadi.`);
      } else if (result?.mode === 'reactivated') {
        setStatusMessage(`${nickname} tekrar aktif edildi. Killboard sync gelene kadar rosterda kalir.`);
      } else {
        setStatusMessage(`${nickname} nickname ile manuel eklendi. Sonraki sync ayni nicki resmi kayitla otomatik birlestirecek.`);
      }

      setManualNickname('');
    } catch (error) {
      setErrorMessage(error.message || 'Manuel oyuncu eklenemedi.');
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleSync = async () => {
    setErrorMessage('');
    setStatusMessage('');
    setIsSyncing(true);

    try {
      const result = await adminSyncGuild(guildIdInput.trim());
      setStatusMessage(buildSyncMessage(result));
      await fetchSystemConfig();
    } catch (error) {
      setErrorMessage(error.message || 'Guild senkronu basarisiz oldu.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetAndSync = async () => {
    setErrorMessage('');
    setStatusMessage('');
    setIsResetting(true);

    try {
      const result = await adminResetAndSyncGuild({
        guildId: guildIdInput.trim(),
        confirmation,
      });
      setStatusMessage(buildSyncMessage(result, true));
      setConfirmation('');
      await fetchSystemConfig();
    } catch (error) {
      setErrorMessage(error.message || 'Reset ve sync basarisiz oldu.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="relative h-full w-full animate-fade-in p-8 lg:p-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-4xl font-headline font-black italic tracking-tighter uppercase text-white">
            Sistem <span className="text-red-700">Ayarlari</span>
          </h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">
            Yonetim erisim seviyesi: {user?.role}
          </p>
        </header>

        <section className="rounded-3xl border border-white/5 bg-stone-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-900/30 bg-red-900/20 shadow-[0_0_15px_rgba(153,0,0,0.2)]">
              <UserIcon className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="font-headline text-xl font-black uppercase tracking-tight text-white italic">Kullanici Profili</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Discord baglantili yetkilendirme</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-black/40 p-6">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-stone-600">Global isim</p>
              <p className="font-headline font-bold text-white italic">{user?.global_name || user?.username}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/40 p-6">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-stone-600">Discord ID</p>
              <p className="font-headline font-bold text-white italic">{user?.id}</p>
            </div>
          </div>
        </section>

        {user?.role === 'admin' && (
          <>
            <section className="rounded-3xl border border-white/5 bg-stone-900/40 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-900/30 bg-red-900/20 shadow-[0_0_15px_rgba(153,0,0,0.2)]">
                  <ShieldIcon className="text-red-600" size={24} />
                </div>
                <div>
                  <h2 className="font-headline text-xl font-black uppercase tracking-tight text-white italic">Aktif Konfig</h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Site ve guild baglantilari</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {configRows.map((row) => (
                  <div key={row.label} className="rounded-2xl border border-white/5 bg-black/40 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-600">{row.label}</p>
                    <p className="mt-3 break-all font-headline text-lg font-bold italic text-white">{row.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/5 bg-black/30 p-4 text-sm text-stone-400">
                {isLoadingSystemConfig
                  ? 'Sunucu konfigu yukleniyor...'
                  : 'Kalici site isimleri ve guild id degerleri Vercel env uzerinden yonetilir. Buradaki reset ve sync islemleri aktif sunucu konfigunu kullanir; istersen asagida gecici guild id override girebilirsin.'}
              </div>
            </section>

            <section className="rounded-3xl border border-white/5 bg-stone-900/40 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-900/30 bg-amber-950/20 shadow-[0_0_15px_rgba(233,195,73,0.12)]">
                  <RefreshCcw className="text-amber-300" size={24} />
                </div>
                <div>
                  <h2 className="font-headline text-xl font-black uppercase tracking-tight text-white italic">Guild Gecis Araclari</h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Sync veya tum veriyi sifirlayip yeniden kur</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Override Albion guild id</span>
                    <input
                      value={guildIdInput}
                      onChange={(event) => setGuildIdInput(event.target.value)}
                      placeholder={effectiveConfig.albionGuildId || 'Guild id gir veya bos birak'}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-secondary"
                    />
                  </label>

                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4 text-sm text-stone-400">
                    Bos birakirsan aktif env icindeki guild id kullanilir. Sadece sync mevcut oyunculari korur; reset+sync oyuncular, bakiyeler, split gecmisi, regear, battle pass, shop ve Discord eslesmelerini temizler.
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row">
                    <button
                      type="button"
                      onClick={handleSync}
                      disabled={isSyncing || isResetting}
                      className="flex-1 rounded-2xl border border-secondary/20 bg-secondary/10 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-stone-950 transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSyncing ? 'Sync Calisiyor...' : 'Sadece Sync Calistir'}
                    </button>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/5 bg-black/20 p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                        <UserPlus className="text-emerald-300" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-white">Manuel Oyuncu Ekle</p>
                        <p className="mt-1 text-sm text-stone-400">
                          Guilde yeni giren biri killboarda gec dusuyorsa nickname ile rostera ekle. Sonraki sync ayni nicki resmi oyuncuya tasir.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                      <input
                        value={manualNickname}
                        onChange={(event) => setManualNickname(event.target.value)}
                        placeholder="Oyuncu nickname"
                        className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualPlayer}
                        disabled={isAddingPlayer || isSyncing || isResetting}
                        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isAddingPlayer ? 'Ekleniyor...' : 'Nickname Ekle'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-[1.75rem] border border-red-900/20 bg-red-950/10 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 text-red-400" size={20} />
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-red-300">Destructive Islem</p>
                      <p className="mt-2 text-sm text-stone-300">
                        Bu aksiyon tum oyuncu verilerini ve tum operasyon gecmisini siler. Ardindan secilen guild rosteri sifirdan import edilir.
                      </p>
                    </div>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Onay metni</span>
                    <input
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      placeholder={RESET_CONFIRMATION_TEXT}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-red-400"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleResetAndSync}
                    disabled={isResetting || isSyncing || confirmation.trim() !== RESET_CONFIRMATION_TEXT}
                    className="w-full rounded-2xl border border-red-900/30 bg-red-950/40 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-red-200 transition-colors hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isResetting ? 'Reset ve Sync Calisiyor...' : 'Tum Veriyi Sifirla ve Guildi Yeniden Kur'}
                  </button>
                </div>
              </div>

              {statusMessage && (
                <div className="mt-6 rounded-2xl border border-emerald-900/20 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
                  {statusMessage}
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 rounded-2xl border border-red-900/20 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
