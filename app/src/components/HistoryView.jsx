import { useMemo, useState } from 'react';
import { Coins, ReceiptText, Shield, Wallet } from 'lucide-react';

import { useStore } from '../store';
import { getParticipantNames, splitIncludesPlayer } from '../splitUtils';

const getTimestamp = (value) => new Date(value || 0).getTime();

const copy = {
  tr: {
    split: 'Split',
    regear: 'Regear',
    unknown: 'Bilinmiyor',
    sentBy: 'tarafindan gonderildi',
    people: 'kisi',
    roleRegear: (role) => `${role} rolu icin regear`,
    linkedCharacter: 'Karakter bagli',
    unlinkedCharacter: 'Karakter bagli degil',
    history: 'Gecmis',
    title: 'Islem Gecmisi',
    subtitle: 'Split, regear ve mevcut bakiye toplamlarinin gecmis gorunumu. Adminsen tum sistemi de gorebilirsin.',
    myHistory: 'Kendi Gecmisim',
    myHistoryHelp: 'Kendi split ve regear hareketlerin',
    adminRecords: 'Admin Kayitlari',
    adminRecordsHelp: 'Tum split ve regear kayitlari',
    summary: 'Ozet',
    totalBalance: 'Toplam Bakiye',
    lootSplit: 'Loot Split',
    compensations: 'Tazminatlar',
    depositWithdraw: 'Yatirma / Cekim',
    myRecords: 'Kendi Kayitlarim',
    adminStream: 'Tum split ve regear islemleri tek akista.',
    myStream: 'Sana ait split katilimlari ve regear taleplerin.',
    noHistory: 'Gosterilecek history kaydi yok.',
  },
  en: {
    split: 'Split',
    regear: 'Regear',
    unknown: 'Unknown',
    sentBy: 'submitted by',
    people: 'people',
    roleRegear: (role) => `Regear for ${role} role`,
    linkedCharacter: 'Character linked',
    unlinkedCharacter: 'Character not linked',
    history: 'History',
    title: 'Transaction History',
    subtitle: 'History view of splits, regear actions, and current balance totals. Admins can also view the whole system.',
    myHistory: 'My History',
    myHistoryHelp: 'Your own split and regear activity',
    adminRecords: 'Admin Records',
    adminRecordsHelp: 'All split and regear records',
    summary: 'Summary',
    totalBalance: 'Total Balance',
    lootSplit: 'Loot Split',
    compensations: 'Compensations',
    depositWithdraw: 'Deposit / Withdraw',
    myRecords: 'My Records',
    adminStream: 'All split and regear actions in one stream.',
    myStream: 'Your split participation and regear requests.',
    noHistory: 'No history records to display.',
  },
};

export function HistoryView({ language = 'tr' }) {
  const { user, players, pendingSplits, regearSubmissions, discordLinks } = useStore();
  const [mode, setMode] = useState('mine');
  const text = copy[language] || copy.tr;
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  const isStaff = user?.role === 'admin' || user?.role === 'chief';
  const linkedPlayerId = discordLinks[user?.id];
  const linkedPlayer = players.find((player) => player.id === linkedPlayerId);

  const mySplitEntries = useMemo(
    () =>
      pendingSplits
        .filter((split) => splitIncludesPlayer(split, linkedPlayer))
        .map((split) => ({
          id: `split-${split.id}`,
          type: 'split',
          title: split.split_name || split.splitName || text.lootSplit,
          status: split.status || 'pending',
          timestamp: split.submitted_at || split.submittedAt,
          amount: split.per_person || split.perPerson || 0,
          detail: `${split.submitter || text.unknown} ${text.sentBy}`,
          meta: `${split.participant_count || split.participants?.length || 0} ${text.people}`,
        })),
    [linkedPlayer, pendingSplits, text],
  );

  const myRegearEntries = useMemo(
    () =>
      regearSubmissions
        .filter((submission) => submission.submitter_id === user?.id)
        .map((submission) => ({
          id: `regear-${submission.id}`,
          type: 'regear',
          title: submission.regear_contents?.title || text.regear,
          status: submission.status || 'pending',
          timestamp: submission.submitted_at,
          amount: 0,
          detail: text.roleRegear(submission.role),
          meta: submission.player_id ? text.linkedCharacter : text.unlinkedCharacter,
        })),
    [regearSubmissions, text, user?.id],
  );

  const myEntries = useMemo(
    () => [...mySplitEntries, ...myRegearEntries].sort((a, b) => getTimestamp(b.timestamp) - getTimestamp(a.timestamp)),
    [myRegearEntries, mySplitEntries],
  );

  const adminEntries = useMemo(() => {
    const splitEntries = pendingSplits.map((split) => ({
      id: `admin-split-${split.id}`,
      type: 'split',
      title: split.split_name || split.splitName || text.lootSplit,
      status: split.status || 'pending',
      timestamp: split.submitted_at || split.submittedAt,
      amount: split.net_total || split.netTotal || 0,
      detail: `${split.submitter || text.unknown} ${text.sentBy}`,
      meta: getParticipantNames(split, players).slice(0, 4).join(', ') || `${split.participant_count || split.participants?.length || 0} ${text.people}`,
    }));

    const regearEntries = regearSubmissions.map((submission) => {
      const player = players.find((entry) => entry.id === submission.player_id);
      return {
        id: `admin-regear-${submission.id}`,
        type: 'regear',
        title: submission.regear_contents?.title || text.regear,
        status: submission.status || 'pending',
        timestamp: submission.submitted_at,
        amount: 0,
        detail: `${submission.submitter} - ${submission.role}`,
        meta: player?.player || text.unlinkedCharacter,
      };
    });

    return [...splitEntries, ...regearEntries].sort(
      (a, b) => getTimestamp(b.timestamp) - getTimestamp(a.timestamp),
    );
  }, [pendingSplits, players, regearSubmissions, text]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US').format(Math.floor(Number(value) || 0));

  const renderEntry = (entry) => {
    const isSplit = entry.type === 'split';
    const amountColor = isSplit ? 'text-secondary' : 'text-stone-300';
    const statusColor =
      entry.status === 'approved'
        ? 'text-emerald-300 border-emerald-900/20 bg-emerald-950/20'
        : entry.status === 'rejected'
          ? 'text-red-300 border-red-900/20 bg-red-950/20'
          : 'text-amber-300 border-amber-900/20 bg-amber-950/20';

    return (
      <div key={entry.id} className="rounded-[1.75rem] border border-white/5 bg-black/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                isSplit
                  ? 'border border-secondary/20 bg-secondary/10 text-secondary'
                  : 'border border-white/10 bg-white/5 text-stone-300'
              }`}>
                {isSplit ? text.split : text.regear}
              </span>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${statusColor}`}>
                {entry.status}
              </span>
            </div>

            <div>
              <h3 className="text-xl font-headline font-black uppercase tracking-tight text-white italic">
                {entry.title}
              </h3>
              <p className="mt-1 text-sm text-stone-400">{entry.detail}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-600">{entry.meta}</p>
            </div>
          </div>

          <div className="text-left lg:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">
              {new Date(entry.timestamp).toLocaleString(locale)}
            </p>
            <p className={`mt-3 text-lg font-headline font-black italic ${amountColor}`}>
              {entry.amount > 0 ? `${formatCurrency(entry.amount)} Silver` : '-'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-600">{text.history}</p>
        <h2 className="mt-3 text-4xl font-headline font-black uppercase italic tracking-tight text-white">
          {text.title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-stone-500">
          {text.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="space-y-3">
              <button
                onClick={() => setMode('mine')}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                  mode === 'mine'
                    ? 'border-secondary bg-secondary/10 text-white'
                    : 'border-white/5 bg-black/20 text-stone-400 hover:border-white/15 hover:text-white'
                }`}
              >
                <p className="text-sm font-headline font-black uppercase tracking-[0.18em]">{text.myHistory}</p>
                <p className="mt-2 text-xs text-stone-500">{text.myHistoryHelp}</p>
              </button>

              {isStaff && (
                <button
                  onClick={() => setMode('admin')}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                    mode === 'admin'
                      ? 'border-secondary bg-secondary/10 text-white'
                      : 'border-white/5 bg-black/20 text-stone-400 hover:border-white/15 hover:text-white'
                  }`}
                >
                  <p className="text-sm font-headline font-black uppercase tracking-[0.18em]">{text.adminRecords}</p>
                  <p className="mt-2 text-xs text-stone-500">{text.adminRecordsHelp}</p>
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-5 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">
              {text.summary}
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Wallet size={18} className="text-secondary" />
                  <span className="text-sm font-bold text-white">{text.totalBalance}</span>
                </div>
                <span className="text-sm font-headline font-black italic text-secondary">
                  {formatCurrency(linkedPlayer?.balance || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <ReceiptText size={18} className="text-secondary" />
                  <span className="text-sm font-bold text-white">{text.lootSplit}</span>
                </div>
                <span className="text-sm font-headline font-black italic text-secondary">
                  {formatCurrency(linkedPlayer?.lootSplit || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-secondary" />
                  <span className="text-sm font-bold text-white">{text.compensations}</span>
                </div>
                <span className="text-sm font-headline font-black italic text-secondary">
                  {formatCurrency(linkedPlayer?.compensations || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Coins size={18} className="text-secondary" />
                  <span className="text-sm font-bold text-white">{text.depositWithdraw}</span>
                </div>
                <span className="text-right text-xs text-stone-300">
                  +{formatCurrency(linkedPlayer?.deposited || 0)} / -{formatCurrency(linkedPlayer?.withdrawn || 0)}
                </span>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="text-sm font-headline font-black uppercase tracking-[0.25em] text-white">
              {mode === 'admin' ? text.adminRecords : text.myRecords}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              {mode === 'admin' ? text.adminStream : text.myStream}
            </p>
          </div>

          <div className="space-y-4">
            {(mode === 'admin' ? adminEntries : myEntries).map(renderEntry)}

            {(mode === 'admin' ? adminEntries : myEntries).length === 0 && (
              <div className="rounded-[2rem] border border-dashed border-white/10 bg-black/20 p-10 text-center text-sm text-stone-600">
                {text.noHistory}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
