import { useMemo, useState } from 'react';

import { useStore } from '../store';
import { splitIncludesPlayer } from '../splitUtils';

const copy = {
  tr: {
    currentBalance: 'Mevcut Bakiye',
    allRecords: 'Tum Kayitlar',
    deposit: 'Yatirim',
    withdrawal: 'Cekim',
    totalBalance: 'TOPLAM BAKIYEN',
    approvedSplit: 'Onayli Split',
    status: 'Durum',
    verified: 'DOGRULANDI',
    totalApproval: 'Toplam Onay',
    record: 'Kayit',
    completed: 'Tamam',
    pendingSplitTotal: 'Bekleyen Split Toplami',
    waiting: 'Bekliyor',
    depositFilter: 'Yatiranlar',
    withdrawalFilter: 'Cekenler',
    ownRecordsOnly: 'Sadece kendi kayitlarin',
    filteredList: 'Filtrelenmis Liste',
    visible: 'gorunuyor',
    noRecords: 'Bu filtre icin sana ait kayit bulunmuyor.',
    recentDistributions: 'Son Dagitimlar',
    lootDistribution: 'Loot Dagitimi',
    people: 'KISI',
    netTotal: 'Net Toplam',
    yourShare: 'Senin Payin',
  },
  en: {
    currentBalance: 'Current Balance',
    allRecords: 'All Records',
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    totalBalance: 'YOUR TOTAL BALANCE',
    approvedSplit: 'Approved Split',
    status: 'Status',
    verified: 'VERIFIED',
    totalApproval: 'Total Approval',
    record: 'Record',
    completed: 'Done',
    pendingSplitTotal: 'Pending Split Total',
    waiting: 'Pending',
    depositFilter: 'Deposits',
    withdrawalFilter: 'Withdrawals',
    ownRecordsOnly: 'Only your records',
    filteredList: 'Filtered List',
    visible: 'visible',
    noRecords: 'No records found for this filter.',
    recentDistributions: 'Recent Distributions',
    lootDistribution: 'Loot Distribution',
    people: 'PEOPLE',
    netTotal: 'Net Total',
    yourShare: 'Your Share',
  },
};

export function BankTable({ language = 'tr' }) {
  const { players, user, discordLinks, pendingSplits } = useStore();
  const [filterType, setFilterType] = useState('all');
  const text = copy[language] || copy.tr;
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US').format(Math.floor(Number(value) || 0));

  const playerLinkedId = discordLinks[user?.id];
  const linkedPlayer = players.find((player) => player.id === playerLinkedId);

  const userBalance = linkedPlayer ? linkedPlayer.balance : 0;
  const pendingDividends = pendingSplits
    .filter((split) => split.status === 'pending' && splitIncludesPlayer(split, linkedPlayer))
    .reduce((sum, split) => sum + (split.per_person || split.perPerson || 0), 0);

  const approvedSplitsCount = pendingSplits.filter(
    (split) => split.status === 'approved' && splitIncludesPlayer(split, linkedPlayer),
  ).length;

  const displayRecords = useMemo(() => {
    if (!linkedPlayer) return [];

    const records = [
      {
        id: `${linkedPlayer.id}-balance`,
        title: text.currentBalance,
        type: text.allRecords,
        amount: linkedPlayer.balance || 0,
        tone: 'text-secondary',
      },
      {
        id: `${linkedPlayer.id}-deposited`,
        title: linkedPlayer.player,
        type: text.deposit,
        amount: linkedPlayer.deposited || 0,
        tone: 'text-emerald-300',
      },
      {
        id: `${linkedPlayer.id}-withdrawn`,
        title: linkedPlayer.player,
        type: text.withdrawal,
        amount: linkedPlayer.withdrawn || 0,
        tone: 'text-red-300',
      },
    ];

    if (filterType === 'deposits') {
      return records.filter((record) => record.type === text.deposit && record.amount > 0);
    }

    if (filterType === 'withdrawals') {
      return records.filter((record) => record.type === text.withdrawal && record.amount > 0);
    }

    return records.filter((record) => record.amount > 0 || record.type === text.allRecords);
  }, [filterType, linkedPlayer, text]);

  const myActivities = pendingSplits
    .filter((split) => splitIncludesPlayer(split, linkedPlayer))
    .sort((a, b) => new Date(b.submitted_at || b.submittedAt) - new Date(a.submitted_at || a.submittedAt))
    .slice(0, 5);

  return (
    <div className="min-h-full animate-fade-in">
      <section className="mb-12 grid grid-cols-12 gap-6">
        <div className="relative col-span-12 overflow-hidden rounded-xl border border-white/5 bg-stone-900/40 p-8 shadow-2xl group lg:col-span-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent"></div>
          <div className="relative z-10 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary">{text.totalBalance}</span>
              <h3 className="relative mt-2 mb-4 flex items-center gap-3 text-6xl font-headline font-black tracking-tighter text-white italic">
                <img src="/silver.png" alt="Silver" className="h-12 w-12 object-contain" />
                {formatCurrency(userBalance)}
                <span className="ml-2 text-2xl opacity-20">Silver</span>
              </h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-green-500">trending_up</span>
                  <span className="text-xs font-bold text-stone-400">
                    +{approvedSplitsCount} <span className="ml-1 font-black uppercase text-stone-600">{text.approvedSplit}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block rounded-lg border border-white/5 bg-stone-950/50 px-4 py-2">
                <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-stone-500">{text.status}</p>
                <p className="text-xs font-black text-secondary">{text.verified}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 grid grid-rows-2 gap-4 lg:col-span-4">
          <div className="flex flex-col justify-between rounded-xl border border-white/5 border-l-2 border-secondary bg-stone-900/40 p-6 shadow-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 italic">{text.totalApproval}</span>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-headline font-bold text-white italic">{approvedSplitsCount}</span>
                <span className="text-xs font-black uppercase text-secondary italic">{text.record}</span>
              </div>
              <span className="rounded bg-secondary/10 px-2 py-0.5 text-[9px] font-bold uppercase text-secondary">{text.completed}</span>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-white/5 border-l-2 border-red-800 bg-stone-900/40 p-6 shadow-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 italic">{text.pendingSplitTotal}</span>
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <img src="/silver.png" alt="S" className="h-5 w-5 object-contain" />
                <span className="text-2xl font-headline font-bold text-white italic">{formatCurrency(pendingDividends)}</span>
              </div>
              <span className="rounded border border-red-900/20 bg-red-950/20 px-2 py-0.5 text-[9px] font-bold uppercase text-red-500">{text.waiting}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-8 flex items-end justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-sm' : 'bg-transparent text-stone-600 hover:bg-white/5 hover:text-stone-300'}`}
          >
            {text.allRecords}
          </button>
          <button
            onClick={() => setFilterType('deposits')}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${filterType === 'deposits' ? 'border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-sm' : 'bg-transparent text-stone-600 hover:bg-white/5 hover:text-stone-300'}`}
          >
            {text.depositFilter}
          </button>
          <button
            onClick={() => setFilterType('withdrawals')}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${filterType === 'withdrawals' ? 'border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-sm' : 'bg-transparent text-stone-600 hover:bg-white/5 hover:text-stone-300'}`}
          >
            {text.withdrawalFilter}
          </button>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">
          {text.ownRecordsOnly}
        </p>
      </div>

      <div className="mb-10 rounded-2xl border border-white/5 bg-stone-900/20 p-6 shadow-inner">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline text-[10px] font-black uppercase tracking-[0.4em] text-stone-700 italic">
            {text.filteredList}
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            {displayRecords.length} {text.visible}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {displayRecords.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3"
            >
              <div>
                <p className="text-sm font-black uppercase tracking-tight text-white italic">
                  {record.title}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-stone-600">
                  {record.type}
                </p>
              </div>
              <p className={`text-sm font-headline font-black italic ${record.tone}`}>
                {record.type === text.withdrawal ? '-' : ''}{formatCurrency(record.amount)}
              </p>
            </div>
          ))}

          {displayRecords.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs italic text-stone-500">
              {text.noRecords}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 pb-10">
        <h3 className="mb-6 font-headline text-[10px] font-black uppercase tracking-[0.4em] text-stone-700 italic">{text.recentDistributions}</h3>
        {myActivities.map((activity) => {
          const perPerson = activity.per_person || activity.perPerson || 0;
          return (
            <div key={activity.id} className="group flex items-center justify-between rounded-2xl border border-white/5 bg-stone-900/10 p-6 shadow-inner transition-all duration-300 hover:bg-stone-900/30">
              <div className="flex flex-1 items-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-stone-950 shadow-2xl transition-transform group-hover:scale-105">
                  <span className="material-symbols-outlined text-4xl text-stone-800">inventory_2</span>
                </div>
                <div>
                  <h4 className="font-headline text-lg font-black uppercase tracking-tight text-white italic">
                    {activity.split_name || activity.splitName || text.lootDistribution}
                  </h4>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-600 italic">
                    {activity.participant_count || activity.participants?.length || 0} {text.people} • {new Date(activity.submitted_at || activity.submittedAt).toLocaleDateString(locale)}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-end gap-12">
                <div className="text-right">
                  <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-stone-700 italic">{text.netTotal}</p>
                  <div className="flex items-center justify-end gap-2">
                    <img src="/silver.png" alt="S" className="h-4 w-4 object-contain" />
                    <p className="text-sm font-bold text-stone-500 italic">{formatCurrency(activity.net_total || activity.netTotal)}</p>
                  </div>
                </div>
                <div className="w-44 border-l border-white/5 pl-8 text-right">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-secondary italic">{text.yourShare}</p>
                  <div className="flex items-center justify-end gap-3">
                    <img src="/silver.png" alt="S" className="h-6 w-6 object-contain" />
                    <p className="text-2xl font-headline font-black text-secondary italic">
                      +{formatCurrency(perPerson)}
                      <span className="ml-1.5 text-[10px] opacity-40">Silver</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
