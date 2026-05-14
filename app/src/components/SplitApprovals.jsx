import { useStore } from '../store';
import { getParticipantNames } from '../splitUtils';

const copy = {
  tr: {
    eyebrow: 'Split Onaylari',
    title: 'Bekleyen Loot Splitler',
    subtitle: 'Split detaylari, katilimcilar, kesintiler ve kisi basi dagitimi bu ekranda gorunur.',
    noPending: 'Bekleyen split bulunmuyor.',
    participants: 'katilimci',
    lootSplit: 'Loot Split',
    grossLoot: 'Brut Loot',
    repair: 'Repair',
    marketTax: 'Market Tax',
    guildShare: 'Guild Payi',
    perPerson: 'Kisi Basi Net',
    participantList: 'Katilimcilar',
    netTotal: 'Net toplam',
    noParticipantList: 'Katilimci listesi yok.',
    lootProof: 'Loot kaniti',
    reject: 'Reddet',
    approve: 'Onayla',
  },
  en: {
    eyebrow: 'Split Approvals',
    title: 'Pending Loot Splits',
    subtitle: 'Split details, participants, deductions, and per-person distribution are shown on this screen.',
    noPending: 'There are no pending splits.',
    participants: 'participants',
    lootSplit: 'Loot Split',
    grossLoot: 'Gross Loot',
    repair: 'Repair',
    marketTax: 'Market Tax',
    guildShare: 'Guild Share',
    perPerson: 'Net Per Person',
    participantList: 'Participants',
    netTotal: 'Net total',
    noParticipantList: 'No participant list.',
    lootProof: 'Loot proof',
    reject: 'Reject',
    approve: 'Approve',
  },
};

export function SplitApprovals({ language = 'tr' }) {
  const { pendingSplits, players, resolveSplit } = useStore();
  const text = copy[language] || copy.tr;
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US').format(Math.floor(Number(value) || 0));

  const pendingItems = pendingSplits.filter((split) => split.status === 'pending');

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-600">{text.eyebrow}</p>
        <h2 className="mt-3 text-4xl font-headline font-black uppercase italic tracking-tight text-white">
          {text.title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-stone-500">
          {text.subtitle}
        </p>
      </div>

      {pendingItems.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-black/20 p-16 text-center text-sm text-stone-600">
          {text.noPending}
        </div>
      ) : (
        <div className="space-y-6">
          {pendingItems.map((split) => {
            const grossTotal = split.gross_total || split.grossTotal || 0;
            const repairFee = split.repair_fee || split.repairFee || 0;
            const afterRepair = Math.max(0, grossTotal - repairFee);
            const marketTax = Math.floor(afterRepair * 0.04);
            const guildShare = Math.floor((afterRepair - marketTax) * 0.25);
            const netTotal = split.net_total || split.netTotal || 0;
            const perPerson = split.per_person || split.perPerson || 0;
            const participantNames = getParticipantNames(split, players);

            return (
              <div
                key={split.id}
                className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-secondary">
                        @{split.submitter}
                      </span>
                      <span className="rounded-full border border-amber-900/20 bg-amber-950/30 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
                        {participantNames.length} {text.participants}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-headline font-black uppercase tracking-tight text-white italic">
                        {split.split_name || split.splitName || text.lootSplit}
                      </h3>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-600">
                        {new Date(split.submitted_at || split.submittedAt).toLocaleString(locale)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                      <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.grossLoot}</p>
                        <p className="mt-2 text-lg font-headline font-black italic text-white">
                          {formatCurrency(grossTotal)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.repair}</p>
                        <p className="mt-2 text-lg font-headline font-black italic text-red-300">
                          -{formatCurrency(repairFee)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.marketTax}</p>
                        <p className="mt-2 text-lg font-headline font-black italic text-amber-300">
                          -{formatCurrency(marketTax)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.guildShare}</p>
                        <p className="mt-2 text-lg font-headline font-black italic text-rose-300">
                          -{formatCurrency(guildShare)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.perPerson}</p>
                        <p className="mt-2 text-lg font-headline font-black italic text-secondary">
                          +{formatCurrency(perPerson)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.participantList}</p>
                        <p className="text-xs font-bold text-stone-500">
                          {text.netTotal}: {formatCurrency(netTotal)} Silver
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {participantNames.map((name) => (
                          <span
                            key={`${split.id}-${name}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-stone-300"
                          >
                            {name}
                          </span>
                        ))}
                        {participantNames.length === 0 && (
                          <p className="text-sm text-stone-600">{text.noParticipantList}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 xl:w-[320px]">
                    {split.loot_image && (
                      <a
                        href={split.loot_image}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-2xl border border-white/5 bg-black"
                      >
                        <img
                          src={split.loot_image}
                          alt={text.lootProof}
                          className="aspect-video w-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </a>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => resolveSplit(split.id, 'reject')}
                        className="rounded-2xl border border-red-900/20 bg-red-950/20 px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-red-300 transition-colors hover:bg-red-950/40"
                      >
                        {text.reject}
                      </button>
                      <button
                        onClick={() => resolveSplit(split.id, 'approve')}
                        className="rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-stone-950 transition-colors hover:bg-secondary/90"
                      >
                        {text.approve}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
