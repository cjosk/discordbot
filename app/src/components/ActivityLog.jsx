import { Skull, Stars, Swords, TrendingUp } from 'lucide-react';

import { useStore } from '../store';
import { splitIncludesPlayer } from '../splitUtils';

const copy = {
  tr: {
    joinedSplits: 'Katildigin Splitler',
    sender: 'GONDEREN',
    people: 'KISI',
    yourShare: 'Senin Payin',
    netTotal: 'Net Toplam',
    status: 'Durum',
    pending: 'Bekliyor',
    approved: 'Onaylandi',
    rejected: 'Reddedildi',
    noActivity: 'Gosterilecek aktivite kaydi yok',
    generalActivity: 'Genel Aktivite',
    level: 'SEVIYE',
    approvalRate: 'Onay Orani',
    approvalRateHelp: 'Sana ait splitlerin icindeki onay orani',
    registeredSplit: 'Kayitli Split',
    amount: 'ADET',
    recentSplits: 'Son Splitler',
    noSplit: 'Kayitli split yok.',
    lootSplit: 'Loot Split',
    total: 'TOPLAM',
  },
  en: {
    joinedSplits: 'Splits You Joined',
    sender: 'SUBMITTED BY',
    people: 'PEOPLE',
    yourShare: 'Your Share',
    netTotal: 'Net Total',
    status: 'Status',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    noActivity: 'No activity records to display',
    generalActivity: 'General Activity',
    level: 'LEVEL',
    approvalRate: 'Approval Rate',
    approvalRateHelp: 'Approval rate within your own splits',
    registeredSplit: 'Registered Splits',
    amount: 'ITEMS',
    recentSplits: 'Recent Splits',
    noSplit: 'No splits recorded.',
    lootSplit: 'Loot Split',
    total: 'TOTAL',
  },
};

export function ActivityLog({ language = 'tr' }) {
  const { user, pendingSplits, players, discordLinks } = useStore();
  const text = copy[language] || copy.tr;
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  const playerLinkedId = discordLinks[user?.id];
  const linkedPlayer = players.find((player) => player.id === playerLinkedId);

  const mySplits = pendingSplits
    .filter((split) => splitIncludesPlayer(split, linkedPlayer))
    .sort((a, b) => new Date(b.submitted_at || b.submittedAt) - new Date(a.submitted_at || a.submittedAt));

  const approvedParticipationCount = mySplits.filter((split) => split.status === 'approved').length;
  const totalSplitsInSystem = mySplits.length || 1;
  const participationCount = mySplits.length;
  const activityRate = Math.round((approvedParticipationCount / totalSplitsInSystem) * 100);

  const formatCurrency = (value) => new Intl.NumberFormat('en-US').format(Math.floor(value || 0));
  const getStatusLabel = (status) =>
    status === 'pending' ? text.pending : status === 'approved' ? text.approved : text.rejected;

  return (
    <div className="relative h-full w-full animate-fade-in overflow-y-auto p-8 scrollbar-hide lg:p-12">
      <div className="pointer-events-none absolute top-0 left-0 -z-10 h-64 w-full bg-gradient-to-b from-red-900/10 to-transparent"></div>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
        <div className="relative flex-1 space-y-12 pt-2">
          <div className="absolute top-4 bottom-0 left-6 w-px bg-gradient-to-b from-red-900/30 via-white/5 to-transparent"></div>

          <div className="relative pl-16">
            <div className="absolute top-1 left-5 h-2.5 w-2.5 rounded-full bg-secondary ring-4 ring-secondary/20 shadow-[0_0_15px_rgba(233,195,73,0.5)]"></div>
            <h2 className="mb-8 pl-1 font-headline text-xs font-black uppercase tracking-[0.3em] text-secondary italic">
              {text.joinedSplits}
            </h2>

            <div className="space-y-6">
              {mySplits.length > 0 ? mySplits.map((split) => (
                <div key={split.id} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-stone-900/40 p-6 shadow-2xl transition-all hover:bg-stone-900/60 backdrop-blur-xl">
                  <div className="absolute top-0 left-0 h-full w-1 bg-red-800"></div>

                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-black/40 shadow-inner transition-transform group-hover:scale-105">
                        <Swords className="text-red-700" size={24} />
                      </div>
                      <div>
                        <h3 className="font-headline text-lg font-black uppercase tracking-tight text-white italic">
                          {split.split_name || split.splitName || text.lootSplit}
                        </h3>
                        <p className="text-sm font-bold text-stone-500">
                          {text.sender} <span className="text-white">@{split.submitter}</span> • {split.participant_count || split.participants?.length || 0} {text.people}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">
                      {new Date(split.submitted_at || split.submittedAt).toLocaleDateString(locale)}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/5 pt-6 md:grid-cols-3">
                    <div className="rounded-xl border border-white/5 bg-black/40 p-3 shadow-inner">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-stone-600">{text.yourShare}</p>
                      <p className="font-headline text-sm font-black text-secondary italic">+{formatCurrency(split.per_person || split.perPerson)} Silver</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-black/40 p-3 shadow-inner">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-stone-600">{text.netTotal}</p>
                      <p className="font-headline text-sm font-black text-white italic">{formatCurrency(split.net_total || split.netTotal)} Silver</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-black/40 p-3 shadow-inner">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-stone-600">{text.status}</p>
                      <p className={`font-headline text-sm font-black uppercase italic ${split.status === 'pending' ? 'text-amber-500' : split.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {getStatusLabel(split.status)}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-stone-900/20 p-12 text-center">
                  <p className="font-headline font-black uppercase tracking-widest text-stone-600 italic">{text.noActivity}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="w-full space-y-6 lg:w-[380px]">
          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-stone-900/40 p-8 shadow-2xl backdrop-blur-2xl">
            <div className="pointer-events-none absolute top-0 right-0 p-8 opacity-[0.03]">
              <TrendingUp size={120} />
            </div>

            <div className="mb-8 flex items-start justify-between">
              <h4 className="font-headline text-[10px] font-black uppercase tracking-[0.4em] text-stone-600 italic">{text.generalActivity}</h4>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase leading-none tracking-widest text-stone-700">{text.level}</p>
                <p className="font-headline text-xl font-black text-red-700 italic">#{Math.max(1, totalSplitsInSystem - participationCount + 1)}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                  <span className="text-stone-400">{text.approvalRate}</span>
                  <span className="text-secondary italic">{activityRate}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-black/60 p-[1px]">
                  <div
                    className="h-full rounded-full bg-secondary shadow-[0_0_10px_rgba(233,195,73,0.4)] transition-all duration-1000"
                    style={{ width: `${activityRate}%` }}
                  ></div>
                </div>
                <p className="text-[9px] font-bold uppercase text-stone-600 italic">{text.approvalRateHelp}</p>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-stone-900">
                    <Stars className="text-stone-500" size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-600">{text.registeredSplit}</p>
                    <p className="font-headline text-lg font-black text-white italic">{participationCount} {text.amount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-stone-900/40 p-8 shadow-2xl backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-10 -bottom-10 p-8 opacity-[0.05]">
              <Skull size={180} />
            </div>

            <h4 className="mb-8 font-headline text-[10px] font-black uppercase tracking-[0.4em] text-stone-600 italic">{text.recentSplits}</h4>

            <div className="space-y-4">
              {pendingSplits.slice(0, 3).map((split) => (
                <div key={split.id} className="flex cursor-pointer items-center gap-4 rounded-2xl border-l-[4px] border-red-900 bg-black/40 p-4 transition-transform hover:translate-x-1">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-stone-950 p-1 shadow-2xl">
                    <img src="/silver.png" alt="S" className="h-full w-full object-contain p-2" />
                  </div>
                  <div>
                    <p className="font-headline text-[11px] font-black uppercase tracking-tighter text-white italic">{split.split_name || split.splitName || text.lootSplit}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-stone-600">
                      {formatCurrency(split.net_total || split.netTotal)} {text.total} <span className="ml-2 text-[8px] opacity-40 italic">{new Date(split.submitted_at || split.submittedAt).toLocaleDateString(locale)}</span>
                    </p>
                  </div>
                </div>
              ))}
              {pendingSplits.length === 0 && <p className="py-4 text-center text-xs text-stone-500 italic">{text.noSplit}</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
