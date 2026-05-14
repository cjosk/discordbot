import { useState } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';

import { useStore } from '../store';
import { formatSilver, formatSilverInput, parseSilverInput } from '../silverFormat';

const normalizeNickname = (value) =>
  String(value || '')
    .trim()
    .toLocaleLowerCase();

const copy = {
  tr: {
    imageOnly: 'Sadece gorsel dosyasi yukleyebilirsin.',
    imageTooLarge: 'Gorsel boyutu 10 MB ustunde olamaz.',
    uploadSignatureError: 'Yukleme imzasi alinamadi.',
    uploadError: 'Gorsel yuklenemedi.',
    missingBattleLink: 'AlbionBB battle linki gir.',
    missingSession: 'Import icin oturum gerekli.',
    importError: 'AlbionBB eslestirmesi yapilamadi.',
    missingRequired: 'Split adi, loot tutari ve loot gorseli zorunludur.',
    approvalSent: 'Split onaya gonderildi.',
    submitError: 'Split gonderilemedi.',
    unknown: 'Bilinmiyor',
    totalSilverValue: 'Toplam Silver Degeri',
    repairAmount: 'Repair Tutari',
    operationName: 'Content / Operasyon Adi',
    exampleOperation: 'ORN. CASTLE FIGHT',
    lootProof: 'Loot Kaniti',
    change: 'Degistir',
    uploadLootImage: 'Loot Gorseli Yukle',
    splitParticipants: 'Split Katilimcilari',
    searchPlayer: 'Oyuncu ara...',
    battleLinkTitle: 'AlbionBB Multi Battle Linki (Opsiyonel)',
    battleLinkHelp: 'Linkteki tum oyuncular sistemde kayitli nicklerle otomatik eslestirilir. Multi ve tekli battle linkleri desteklenir.',
    loading: 'Yukleniyor',
    selectFromLink: 'Linkten Sec',
    matched: 'eslesen',
    unmatched: 'bulunamayan',
    total: 'toplam',
    matchedList: 'Eslesenler',
    unmatchedList: 'Rosterda bulunamayanlar',
    summary: 'Split Ozeti',
    totalValue: 'Toplam Deger',
    marketTax: 'Pazar Vergisi (%4)',
    guildShare: 'Guild Payi (%25)',
    perPersonDistribution: 'KISI BASI DAGITIM',
    selectedParticipants: 'Secilen Katilimcilar',
    players: 'Oyuncu',
    sendSplit: 'SPLIT GONDER',
  },
  en: {
    imageOnly: 'Only image files can be uploaded.',
    imageTooLarge: 'Image size cannot exceed 10 MB.',
    uploadSignatureError: 'Upload signature could not be retrieved.',
    uploadError: 'Image upload failed.',
    missingBattleLink: 'Enter an AlbionBB battle link.',
    missingSession: 'A session is required for import.',
    importError: 'AlbionBB matching failed.',
    missingRequired: 'Split name, loot amount, and loot image are required.',
    approvalSent: 'Split sent for approval.',
    submitError: 'Split could not be submitted.',
    unknown: 'Unknown',
    totalSilverValue: 'Total Silver Value',
    repairAmount: 'Repair Cost',
    operationName: 'Content / Operation Name',
    exampleOperation: 'EX. CASTLE FIGHT',
    lootProof: 'Loot Proof',
    change: 'Change',
    uploadLootImage: 'Upload Loot Image',
    splitParticipants: 'Split Participants',
    searchPlayer: 'Search player...',
    battleLinkTitle: 'AlbionBB Multi Battle Link (Optional)',
    battleLinkHelp: 'All players in the link are automatically matched against player nicknames registered in the system. Both multi and single battle links are supported.',
    loading: 'Loading',
    selectFromLink: 'Select From Link',
    matched: 'matched',
    unmatched: 'unmatched',
    total: 'total',
    matchedList: 'Matched',
    unmatchedList: 'Not found in roster',
    summary: 'Split Summary',
    totalValue: 'Total Value',
    marketTax: 'Market Tax (4%)',
    guildShare: 'Guild Share (25%)',
    perPersonDistribution: 'PER PERSON DISTRIBUTION',
    selectedParticipants: 'Selected Participants',
    players: 'Players',
    sendSplit: 'SEND SPLIT',
  },
};

export function SplitCalculator({ language = 'tr' }) {
  const { players, submitSplit, user, discordLinks, token } = useStore();
  const text = copy[language] || copy.tr;

  const [splitName, setSplitName] = useState('');
  const [totalSilver, setTotalSilver] = useState('');
  const [repairFee, setRepairFee] = useState('');
  const [lootImage, setLootImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [battleLink, setBattleLink] = useState('');
  const [isImportingBattle, setIsImportingBattle] = useState(false);
  const [battleImportSummary, setBattleImportSummary] = useState(null);

  const myLinkedPlayerId = user ? discordLinks[user.id] : null;
  const [selectedPlayers, setSelectedPlayers] = useState(myLinkedPlayerId ? [myLinkedPlayerId] : []);

  const activePlayers = players.filter((player) =>
    player.player.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const togglePlayer = (id) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((playerId) => playerId !== id) : [...prev, id],
    );
  };

  const uploadImageToCloudinary = async (file) => {
    if (!file || !token) return;

    if (!file.type.startsWith('image/')) {
      alert(text.imageOnly);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(text.imageTooLarge);
      return;
    }

    setIsUploading(true);

    try {
      const signatureRes = await fetch('/api/upload-signature', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!signatureRes.ok) {
        throw new Error(text.uploadSignatureError);
      }

      const {
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
        allowedFormats,
      } = await signatureRes.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('folder', folder);
      formData.append('allowed_formats', allowedFormats);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) setLootImage(data.secure_url);
    } catch (error) {
      alert(error.message || text.uploadError);
    } finally {
      setIsUploading(false);
    }
  };

  const calculateSplit = () => {
    const rawLoot = parseSilverInput(totalSilver);
    const rawRepair = parseSilverInput(repairFee);
    if (rawLoot <= 0) return null;

    const afterRepair = Math.max(0, rawLoot - rawRepair);
    const marketTax = Math.floor(afterRepair * 0.04);
    const guildTax = Math.floor((afterRepair - marketTax) * 0.25);
    const netTotal = Math.max(0, afterRepair - marketTax - guildTax);
    const perPerson = selectedPlayers.length > 0 ? Math.floor(netTotal / selectedPlayers.length) : 0;

    return {
      rawLoot,
      rawRepair,
      marketTax,
      guildTax,
      netTotal,
      perPerson,
      participantCount: selectedPlayers.length,
    };
  };

  const splitResult = calculateSplit();

  const handleImportFromBattle = async () => {
    const trimmedLink = battleLink.trim();

    if (!trimmedLink) {
      alert(text.missingBattleLink);
      return;
    }

    if (!token) {
      alert(text.missingSession);
      return;
    }

    setIsImportingBattle(true);
    setBattleImportSummary(null);

    try {
      const response = await fetch(`/api/albionbb-battle?url=${encodeURIComponent(trimmedLink)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || text.importError);
      }

      const playerMap = new Map(players.map((player) => [normalizeNickname(player.player), player]));
      const matchedIds = [];
      const matchedNames = [];
      const unmatchedNames = [];

      for (const importedName of payload?.names || []) {
        const matchedPlayer = playerMap.get(normalizeNickname(importedName));

        if (matchedPlayer) {
          matchedIds.push(matchedPlayer.id);
          matchedNames.push(matchedPlayer.player);
        } else {
          unmatchedNames.push(importedName);
        }
      }

      setSelectedPlayers([...new Set(matchedIds)]);
      setBattleImportSummary({
        sourceUrl: payload?.sourceUrl || trimmedLink,
        importedNames: Array.isArray(payload?.names) ? payload.names : [],
        matchedNames,
        unmatchedNames,
      });
    } catch (error) {
      setBattleImportSummary(null);
      alert(error.message || text.importError);
    } finally {
      setIsImportingBattle(false);
    }
  };

  const handleSendApproval = async () => {
    if (!splitResult || !lootImage || !splitName) {
      alert(text.missingRequired);
      return;
    }

    try {
      await submitSplit({
        splitName,
        lootImage,
        participants: selectedPlayers,
        participantNames: selectedPlayers.map((id) => players.find((player) => player.id === id)?.player || text.unknown),
        grossTotal: splitResult.rawLoot,
        repairFee: splitResult.rawRepair,
        netTotal: splitResult.netTotal,
        perPerson: splitResult.perPerson,
        participantCount: splitResult.participantCount,
      });
      alert(text.approvalSent);
      setSplitName('');
      setTotalSilver('');
      setRepairFee('');
      setLootImage('');
      setBattleImportSummary(null);
      setSelectedPlayers(myLinkedPlayerId ? [myLinkedPlayerId] : []);
    } catch (error) {
      alert(error.message || text.submitError);
    }
  };

  return (
    <div className="relative flex h-full w-full animate-fade-in flex-col overflow-hidden bg-transparent p-4 md:p-6 lg:p-8">
      <div className="pointer-events-none absolute top-0 right-0 -z-10 h-full w-1/2 bg-red-900/5 blur-[120px]"></div>

      <div className="flex w-full flex-col gap-6 overflow-hidden">
        <div className="grid flex-shrink-0 grid-cols-1 gap-4 pt-2 md:grid-cols-4">
          <div className="rounded-2xl border border-white/5 border-l-[4px] border-secondary bg-stone-900/60 p-5 shadow-2xl backdrop-blur-3xl">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-stone-500 italic">{text.totalSilverValue}</label>
            <div className="flex items-center gap-3">
              <img src="/silver.png" alt="S" className="h-8 w-8 object-contain" />
              <input
                className="w-full border-0 border-b border-white/10 bg-transparent text-2xl font-headline font-black tracking-tighter text-white italic outline-none transition-all placeholder:text-stone-800 focus:border-secondary focus:ring-0"
                placeholder="0"
                type="text"
                value={totalSilver}
                onChange={(event) => setTotalSilver(formatSilverInput(event.target.value))}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 border-l-[4px] border-red-500 bg-stone-900/60 p-5 shadow-2xl backdrop-blur-3xl">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-stone-500 italic">{text.repairAmount}</label>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-stone-700">build</span>
              <input
                className="w-full border-0 border-b border-white/10 bg-transparent text-2xl font-headline font-black tracking-tighter text-white italic outline-none transition-all placeholder:text-stone-800 focus:border-red-500 focus:ring-0"
                placeholder="0"
                type="text"
                value={repairFee}
                onChange={(event) => setRepairFee(formatSilverInput(event.target.value))}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 border-l-[4px] border-red-900/50 bg-stone-900/60 p-5 shadow-2xl backdrop-blur-3xl">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-stone-500 italic">{text.operationName}</label>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-stone-700">swords</span>
              <input
                className="w-full border-0 border-b border-white/10 bg-transparent text-xl font-headline font-bold uppercase tracking-tight text-white italic outline-none transition-all placeholder:text-stone-800 focus:border-primary focus:ring-0"
                placeholder={text.exampleOperation}
                type="text"
                value={splitName}
                onChange={(event) => setSplitName(event.target.value)}
              />
            </div>
          </div>

          <div className="group flex items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-stone-950/40 p-4 shadow-inner transition-all hover:border-secondary/40">
            {lootImage ? (
              <div className="flex items-center gap-4">
                <img src={lootImage} className="h-12 rounded-xl border border-secondary/30 shadow-lg" alt={text.lootProof} />
                <button onClick={() => setLootImage('')} className="rounded bg-red-950/20 px-3 py-1 text-[9px] font-headline font-black uppercase tracking-widest text-red-500 italic hover:text-red-400">
                  {text.change}
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center">
                <input type="file" className="hidden" onChange={(event) => uploadImageToCloudinary(event.target.files[0])} accept="image/*" />
                {isUploading ? <Loader2 className="mb-1 animate-spin text-secondary" size={24} /> : <UploadCloud className="mb-1 text-stone-700 transition-colors group-hover:text-secondary" size={24} />}
                <span className="font-headline text-[9px] font-black uppercase tracking-[0.2em] text-stone-500 italic group-hover:text-stone-300">{text.uploadLootImage}</span>
              </label>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <section className="relative flex h-[570px] flex-[2] flex-col overflow-hidden rounded-[2.5rem] border border-white/5 bg-stone-900/60 p-8 shadow-2xl backdrop-blur-3xl">
            <div className="pointer-events-none absolute top-0 right-0 scale-150 p-6 opacity-[0.03] italic">
              <span className="material-symbols-outlined text-[10rem]">military_tech</span>
            </div>

            <div className="relative z-10 mb-6 flex flex-shrink-0 items-center justify-between">
              <h3 className="font-headline text-xl font-black uppercase tracking-[0.1em] text-white italic">{text.splitParticipants}</h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute top-1/2 left-4 -translate-y-1/2 text-[14px] text-stone-500 italic">search</span>
                <input
                  className="w-56 rounded-xl border border-white/20 bg-white py-2 pl-10 pr-4 text-[10px] font-bold uppercase text-stone-950 italic shadow-inner outline-none transition-all placeholder:text-stone-500 focus:border-secondary"
                  placeholder={text.searchPlayer}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="relative z-10 mb-5 rounded-2xl border border-white/10 bg-stone-950/40 p-4 shadow-inner">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-500 italic">{text.battleLinkTitle}</p>
                  <p className="mt-1 text-[11px] text-stone-500">{text.battleLinkHelp}</p>
                </div>

                <div className="flex w-full flex-col gap-2 xl:w-[34rem] xl:flex-row">
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 py-3 text-[11px] font-bold text-stone-950 outline-none transition-all placeholder:text-stone-500 focus:border-secondary"
                    placeholder="https://europe.albionbb.com/battles/multi?ids=... veya /battles/123456"
                    value={battleLink}
                    onChange={(event) => setBattleLink(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleImportFromBattle}
                    disabled={isImportingBattle}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-secondary/20 bg-secondary/15 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-secondary transition-all hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isImportingBattle ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>{isImportingBattle ? text.loading : text.selectFromLink}</span>
                  </button>
                </div>
              </div>

              {battleImportSummary ? (
                <div className="mt-4 space-y-2 border-t border-white/5 pt-4 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2 text-stone-400">
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-bold uppercase tracking-[0.2em] text-emerald-300">
                      {battleImportSummary.matchedNames.length} {text.matched}
                    </span>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 font-bold uppercase tracking-[0.2em] text-amber-300">
                      {battleImportSummary.unmatchedNames.length} {text.unmatched}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-bold uppercase tracking-[0.2em] text-stone-300">
                      {battleImportSummary.importedNames.length} {text.total}
                    </span>
                  </div>

                  <p className="break-all text-stone-500">{battleImportSummary.sourceUrl}</p>

                  {battleImportSummary.matchedNames.length > 0 ? (
                    <p className="text-stone-300">{text.matchedList}: {battleImportSummary.matchedNames.join(', ')}</p>
                  ) : null}

                  {battleImportSummary.unmatchedNames.length > 0 ? (
                    <p className="text-amber-300">{text.unmatchedList}: {battleImportSummary.unmatchedNames.join(', ')}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="relative z-10 grid flex-grow content-start grid-cols-2 gap-2 overflow-y-auto pb-4 pr-2 scrollbar-thin scrollbar-thumb-stone-800 md:grid-cols-3 xl:grid-cols-4">
              {activePlayers.map((player) => {
                const isSelected = selectedPlayers.includes(player.id);
                return (
                  <div key={player.id} onClick={() => togglePlayer(player.id)} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-all ${isSelected ? 'border-secondary/50 bg-secondary/20 shadow-lg' : 'border-white/5 bg-stone-950/40 hover:border-white/10'}`}>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${isSelected ? 'border-secondary bg-secondary text-stone-950' : 'border-white/10 bg-stone-900 text-stone-700 shadow-inner'}`}>
                      <span className="material-symbols-outlined text-[10px] font-bold">{isSelected ? 'check' : 'person'}</span>
                    </div>
                    <p className={`truncate font-black text-[10px] uppercase tracking-widest italic ${isSelected ? 'text-white' : 'text-stone-600'}`}>{player.player}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex h-[570px] min-w-[320px] max-w-[380px] flex-1 flex-col">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-stone-900 p-8 shadow-2xl outline outline-1 outline-white/5 backdrop-blur-3xl">
              <div className="pointer-events-none absolute -right-10 -bottom-10 scale-150 rotate-12 p-8 opacity-[0.04] italic">
                <span className="material-symbols-outlined text-[10rem]">query_stats</span>
              </div>

              <div className="relative z-10 mb-6 flex flex-shrink-0 items-center gap-3 border-b border-white/10 pb-4 text-secondary">
                <span className="material-symbols-outlined text-lg">terminal</span>
                <h3 className="font-headline text-lg font-black uppercase tracking-widest text-white italic underline decoration-secondary decoration-2 underline-offset-4">{text.summary}</h3>
              </div>

              <div className="relative z-10 flex flex-grow flex-col space-y-4 overflow-hidden">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-stone-500 italic">
                  <span>{text.totalValue}</span>
                  <span className="font-headline text-xs text-white italic">{formatSilver(splitResult?.rawLoot)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-red-700/80 italic">
                  <span>{text.repairAmount}</span>
                  <span className="font-headline text-xs italic">- {formatSilver(splitResult?.rawRepair)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-amber-500/80 italic">
                  <span>{text.marketTax}</span>
                  <span className="font-headline text-xs italic">- {formatSilver(splitResult?.marketTax)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-stone-300 italic">
                  <span>{text.guildShare}</span>
                  <span className="font-headline text-xs italic">- {formatSilver(splitResult?.guildTax)}</span>
                </div>

                <div className="mt-auto space-y-8 border-t border-white/10 pt-8">
                  <div className="flex flex-col items-center">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-[0.4em] text-stone-600 italic">{text.perPersonDistribution}</p>
                    <div className="flex items-center gap-3">
                      <img src="/silver.png" alt="S" className="h-8 w-8 object-contain shadow-2xl" />
                      <p className="font-headline text-4xl font-black leading-none tracking-tighter text-white italic">+{formatSilver(splitResult?.perPerson)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase leading-none tracking-widest text-stone-600 italic">
                      <span>{text.selectedParticipants}</span>
                      <span className="rounded border border-amber-900/10 bg-amber-500/10 px-2 py-0.5 text-amber-500 italic">{selectedPlayers.length} {text.players}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-stone-950 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-red-600 via-amber-600 to-amber-400 shadow-[0_0_15px_rgba(233,195,73,0.3)] transition-all duration-1000 ease-in-out" style={{ width: `${Math.min(100, (selectedPlayers.length / (activePlayers.length || 1)) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="pt-2 pb-2">
                    <button
                      onClick={handleSendApproval}
                      className="w-full transform rounded-3xl border border-red-900/30 border-b-[6px] border-red-950 bg-red-900/40 py-6 text-[12px] font-headline font-black uppercase tracking-[0.4em] text-white italic shadow-2xl transition-all hover:scale-[1.02] hover:bg-red-700 active:translate-y-1 active:border-b-0 active:shadow-none"
                    >
                      {text.sendSplit}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
