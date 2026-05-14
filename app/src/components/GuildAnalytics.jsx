import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Coins,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';

import { useStore } from '../store';

const copy = {
  tr: {
    eyebrow: 'Yonetim Analizi',
    title: 'Guild Finans Merkezi',
    subtitle: 'Guildi bir sirket gibi izlemek icin gelir, gider, dagitim, treasury ve operasyon metrikleri.',
    reserve: 'Toplam Bakiye Yukumlulugu',
    guildRevenue: 'Toplam Guild Geliri',
    regearExpense: 'Toplam Regear Gideri',
    capitalFlow: 'Net Guild Kazanci',
    incomeStatement: 'Gelir / Gider Ozeti',
    treasury: 'Treasury Gorunumu',
    operations: 'Operasyon Verimliligi',
    roster: 'Kadro Analizi',
    insights: 'Yonetim Yorumu',
    grossLoot: 'Islenen Brut Loot',
    repairCost: 'Toplam Repair',
    marketTax: 'Toplam Market Vergisi',
    memberDistribution: 'Oyuncuya Dagitilan',
    deposits: 'Toplam Yatirim',
    withdrawals: 'Toplam Cekim',
    issued: 'Dagitilan Varliklar',
    activeMembers: 'Aktif Oyuncu',
    inactiveMembers: 'Pasif Oyuncu',
    approvedSplits: 'Onayli Split',
    pendingSplits: 'Bekleyen Split',
    approvedRegear: 'Onayli Regear',
    pendingRegear: 'Bekleyen Regear',
    rejectedRegear: 'Reddedilen Regear',
    pendingLootVolume: 'Bekleyen Loot Hacmi',
    avgPerSplit: 'Split Basina Ortalama Net',
    topBalances: 'En Yuksek Bakiye',
    topLootEarners: 'En Cok Loot Split Alanlar',
    topCompensated: 'En Cok Regear Alanlar',
    roleBreakdown: 'Role Gore Regear Talebi',
    noData: 'Yeterli veri yok.',
    positive: 'Pozitif',
    negative: 'Negatif',
    silver: 'Silver',
    person: 'kisi',
    request: 'talep',
    note: 'Not: Regear gideri oyuncu compensations toplamindan, guild geliri ise onayli splitlerden turetilir.',
    insightRevenueHealthy: 'Guild gelirleri regear giderlerini karsiliyor.',
    insightRevenueWeak: 'Regear giderleri guild gelirini asmis durumda.',
    insightFlowHealthy: 'Guild geliri, regear giderinden yuksek; operasyon karda.',
    insightFlowWeak: 'Regear gideri guild gelirini gecmis; operasyon ekside.',
    insightBacklogHealthy: 'Onay kuyrugu kontrol altinda.',
    insightBacklogWeak: 'Bekleyen onay yuku yukselmis; operasyon yavasliyor.',
    insightRosterHealthy: 'Aktif kadro guclu gorunuyor.',
    insightRosterWeak: 'Pasif oyuncu orani yukselmis durumda.',
  },
  en: {
    eyebrow: 'Executive Analytics',
    title: 'Guild Finance Center',
    subtitle: 'Revenue, expense, treasury, roster, and operational analytics for admins.',
    reserve: 'Outstanding Balance Liability',
    guildRevenue: 'Total Guild Revenue',
    regearExpense: 'Total Regear Expense',
    capitalFlow: 'Net Guild Earnings',
    incomeStatement: 'Income / Expense Summary',
    treasury: 'Treasury View',
    operations: 'Operational Efficiency',
    roster: 'Roster Analysis',
    insights: 'Executive Notes',
    grossLoot: 'Processed Gross Loot',
    repairCost: 'Total Repair',
    marketTax: 'Total Market Tax',
    memberDistribution: 'Distributed To Members',
    deposits: 'Total Deposits',
    withdrawals: 'Total Withdrawals',
    issued: 'Issued Assets',
    activeMembers: 'Active Members',
    inactiveMembers: 'Inactive Members',
    approvedSplits: 'Approved Splits',
    pendingSplits: 'Pending Splits',
    approvedRegear: 'Approved Regear',
    pendingRegear: 'Pending Regear',
    rejectedRegear: 'Rejected Regear',
    pendingLootVolume: 'Pending Loot Volume',
    avgPerSplit: 'Average Net Per Split',
    topBalances: 'Highest Balances',
    topLootEarners: 'Top Loot Split Earners',
    topCompensated: 'Top Regear Receivers',
    roleBreakdown: 'Regear Requests By Role',
    noData: 'Not enough data.',
    positive: 'Positive',
    negative: 'Negative',
    silver: 'Silver',
    person: 'person',
    request: 'request',
    note: 'Note: Regear expense is derived from player compensations, guild revenue from approved splits.',
    insightRevenueHealthy: 'Guild revenue is covering regear costs.',
    insightRevenueWeak: 'Regear costs have overtaken guild revenue.',
    insightFlowHealthy: 'Guild revenue exceeds regear costs; operations are profitable.',
    insightFlowWeak: 'Regear costs exceed guild revenue; operations are running negative.',
    insightBacklogHealthy: 'Approval backlog is under control.',
    insightBacklogWeak: 'Pending approvals are piling up; operations are slowing down.',
    insightRosterHealthy: 'Active roster looks strong.',
    insightRosterWeak: 'Inactive member ratio is increasing.',
  },
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US').format(Math.floor(Number(value) || 0));

const formatCount = (value) =>
  new Intl.NumberFormat('en-US').format(Math.floor(Number(value) || 0));

const getSplitBreakdown = (split) => {
  const gross = split.gross_total || split.grossTotal || 0;
  const repair = split.repair_fee || split.repairFee || 0;
  const afterRepair = Math.max(0, gross - repair);
  const marketTax = Math.floor(afterRepair * 0.04);
  const guildShare = Math.floor((afterRepair - marketTax) * 0.25);
  const net = split.net_total || split.netTotal || 0;

  return { gross, repair, marketTax, guildShare, net };
};

const SummaryCard = ({ icon, label, value, tone = 'secondary', helper }) => {
  const toneMap = {
    secondary: 'text-secondary border-secondary/20 bg-secondary/10',
    red: 'text-red-300 border-red-900/20 bg-red-950/20',
    emerald: 'text-emerald-300 border-emerald-900/20 bg-emerald-950/20',
    amber: 'text-amber-300 border-amber-900/20 bg-amber-950/20',
  };
  const IconComponent = icon;

  return (
    <div className="rounded-[1.8rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{label}</p>
          <p className="mt-3 text-3xl font-headline font-black tracking-tight text-white italic">{value}</p>
          {helper ? <p className="mt-2 text-xs text-stone-500">{helper}</p> : null}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneMap[tone] || toneMap.secondary}`}>
          <IconComponent size={22} />
        </div>
      </div>
    </div>
  );
};

const RankedList = ({ title, items, valueKey, emptyText, valuePrefix = '', valueSuffix = '' }) => (
  <div className="rounded-[1.8rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
    <h3 className="mb-5 text-sm font-headline font-black uppercase tracking-[0.22em] text-white">{title}</h3>
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-stone-600">
          {emptyText}
        </p>
      ) : (
        items.map((item, index) => (
          <div key={`${title}-${item.player}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-white italic">{item.player}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone-600">#{index + 1}</p>
            </div>
            <p className="text-sm font-headline font-black text-secondary italic">
              {valuePrefix}{formatCurrency(item[valueKey])}{valueSuffix}
            </p>
          </div>
        ))
      )}
    </div>
  </div>
);

export function GuildAnalytics({ language = 'tr' }) {
  const { players, pendingSplits, regearSubmissions } = useStore();
  const text = copy[language] || copy.tr;

  const metrics = useMemo(() => {
    const approvedSplits = pendingSplits.filter((split) => split.status === 'approved');
    const rejectedSplits = pendingSplits.filter((split) => split.status === 'rejected');
    const pendingOnlySplits = pendingSplits.filter((split) => split.status === 'pending');
    const approvedRegear = regearSubmissions.filter((submission) => submission.status === 'approved');
    const pendingRegear = regearSubmissions.filter((submission) => submission.status === 'pending');
    const rejectedRegear = regearSubmissions.filter((submission) => submission.status === 'rejected');

    const splitTotals = approvedSplits.reduce(
      (acc, split) => {
        const { gross, repair, marketTax, guildShare, net } = getSplitBreakdown(split);
        acc.gross += gross;
        acc.repair += repair;
        acc.marketTax += marketTax;
        acc.guildShare += guildShare;
        acc.net += net;
        return acc;
      },
      { gross: 0, repair: 0, marketTax: 0, guildShare: 0, net: 0 },
    );

    const pendingGross = pendingOnlySplits.reduce(
      (sum, split) => sum + (split.gross_total || split.grossTotal || 0),
      0,
    );

    const reserveLiability = players.reduce((sum, player) => sum + (player.balance || 0), 0);
    const totalDeposits = players.reduce((sum, player) => sum + (player.deposited || 0), 0);
    const totalWithdrawals = players.reduce((sum, player) => sum + (player.withdrawn || 0), 0);
    const totalIssued = players.reduce((sum, player) => sum + (player.issued || 0), 0);
    const totalLootSplit = players.reduce((sum, player) => sum + (player.lootSplit || 0), 0);
    const totalCompensations = players.reduce((sum, player) => sum + (player.compensations || 0), 0);
    const activeMembers = players.filter((player) => Number(player.activity || 0) > 0).length;
    const inactiveMembers = Math.max(0, players.length - activeMembers);
    const capitalFlow = splitTotals.guildShare - totalCompensations;
    const averageNetPerSplit = approvedSplits.length > 0 ? Math.floor(splitTotals.net / approvedSplits.length) : 0;

    const topBalances = [...players]
      .sort((a, b) => (b.balance || 0) - (a.balance || 0))
      .slice(0, 5);
    const topLootEarners = [...players]
      .sort((a, b) => (b.lootSplit || 0) - (a.lootSplit || 0))
      .slice(0, 5);
    const topCompensated = [...players]
      .sort((a, b) => (b.compensations || 0) - (a.compensations || 0))
      .slice(0, 5);

    const roleMap = regearSubmissions.reduce((acc, submission) => {
      const key = submission.role || 'UNKNOWN';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const roleBreakdown = Object.entries(roleMap)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    return {
      approvedSplits,
      rejectedSplits,
      pendingOnlySplits,
      approvedRegear,
      pendingRegear,
      rejectedRegear,
      splitTotals,
      pendingGross,
      reserveLiability,
      totalDeposits,
      totalWithdrawals,
      totalIssued,
      totalLootSplit,
      totalCompensations,
      activeMembers,
      inactiveMembers,
      capitalFlow,
      averageNetPerSplit,
      topBalances,
      topLootEarners,
      topCompensated,
      roleBreakdown,
      regearSubmissionCount: regearSubmissions.length,
    };
  }, [pendingSplits, players, regearSubmissions]);

  const insights = [
    {
      ok: metrics.splitTotals.guildShare >= metrics.totalCompensations,
      good: text.insightRevenueHealthy,
      bad: text.insightRevenueWeak,
    },
    {
      ok: metrics.capitalFlow >= 0,
      good: text.insightFlowHealthy,
      bad: text.insightFlowWeak,
    },
    {
      ok: metrics.pendingOnlySplits.length + metrics.pendingRegear.length <= 8,
      good: text.insightBacklogHealthy,
      bad: text.insightBacklogWeak,
    },
    {
      ok: metrics.activeMembers >= metrics.inactiveMembers,
      good: text.insightRosterHealthy,
      bad: text.insightRosterWeak,
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-600">{text.eyebrow}</p>
        <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-4xl font-headline font-black uppercase italic tracking-tight text-white">
              {text.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-stone-500">{text.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.note}</p>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Wallet}
          label={text.reserve}
          value={`${formatCurrency(metrics.reserveLiability)} ${text.silver}`}
          tone="secondary"
          helper={`${formatCount(players.length)} ${text.person}`}
        />
        <SummaryCard
          icon={Building2}
          label={text.guildRevenue}
          value={`${formatCurrency(metrics.splitTotals.guildShare)} ${text.silver}`}
          tone="emerald"
          helper={`${formatCount(metrics.approvedSplits.length)} ${text.approvedSplits.toLowerCase()}`}
        />
        <SummaryCard
          icon={Shield}
          label={text.regearExpense}
          value={`${formatCurrency(metrics.totalCompensations)} ${text.silver}`}
          tone="red"
          helper={`${formatCount(metrics.approvedRegear.length)} ${text.approvedRegear.toLowerCase()}`}
        />
        <SummaryCard
          icon={Coins}
          label={text.capitalFlow}
          value={`${metrics.capitalFlow >= 0 ? '+' : ''}${formatCurrency(metrics.capitalFlow)} ${text.silver}`}
          tone={metrics.capitalFlow >= 0 ? 'amber' : 'red'}
          helper={metrics.capitalFlow >= 0 ? text.positive : text.negative}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
          <h3 className="mb-6 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.incomeStatement}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              { label: text.grossLoot, value: metrics.splitTotals.gross, tone: 'text-white' },
              { label: text.repairCost, value: metrics.splitTotals.repair, tone: 'text-red-300' },
              { label: text.marketTax, value: metrics.splitTotals.marketTax, tone: 'text-amber-300' },
              { label: text.guildRevenue, value: metrics.splitTotals.guildShare, tone: 'text-emerald-300' },
              { label: text.memberDistribution, value: metrics.splitTotals.net, tone: 'text-secondary' },
              { label: text.avgPerSplit, value: metrics.averageNetPerSplit, tone: 'text-white' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-600">{item.label}</p>
                <p className={`mt-2 text-xl font-headline font-black italic ${item.tone}`}>
                  {formatCurrency(item.value)} {text.silver}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
          <h3 className="mb-6 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.treasury}</h3>
          <div className="space-y-4">
            {[
              { label: text.deposits, value: metrics.totalDeposits, icon: ArrowDownLeft, tone: 'text-emerald-300' },
              { label: text.withdrawals, value: metrics.totalWithdrawals, icon: ArrowUpRight, tone: 'text-red-300' },
              { label: text.issued, value: metrics.totalIssued, icon: BriefcaseBusiness, tone: 'text-white' },
              { label: text.memberDistribution, value: metrics.totalLootSplit, icon: Coins, tone: 'text-secondary' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <Icon size={18} className={item.tone} />
                    </div>
                    <span className="text-sm font-bold text-white">{item.label}</span>
                  </div>
                  <span className={`text-sm font-headline font-black italic ${item.tone}`}>
                    {formatCurrency(item.value)} {text.silver}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-6 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.operations}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: text.approvedSplits, value: metrics.approvedSplits.length },
                { label: text.pendingSplits, value: metrics.pendingOnlySplits.length },
                { label: text.approvedRegear, value: metrics.approvedRegear.length },
                { label: text.pendingRegear, value: metrics.pendingRegear.length },
                { label: text.rejectedRegear, value: metrics.rejectedRegear.length },
                { label: text.pendingLootVolume, value: metrics.pendingGross, currency: true },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-600">{item.label}</p>
                  <p className="mt-2 text-xl font-headline font-black italic text-white">
                    {item.currency ? `${formatCurrency(item.value)} ${text.silver}` : formatCount(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-6 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.roster}</h3>
            <div className="space-y-3">
              {[
                { label: text.activeMembers, value: metrics.activeMembers, tone: 'text-emerald-300' },
                { label: text.inactiveMembers, value: metrics.inactiveMembers, tone: 'text-red-300' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Users size={18} className={item.tone} />
                    <span className="text-sm font-bold text-white">{item.label}</span>
                  </div>
                  <span className={`text-sm font-headline font-black italic ${item.tone}`}>
                    {formatCount(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
          <h3 className="mb-6 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.roleBreakdown}</h3>
          <div className="space-y-3">
            {metrics.roleBreakdown.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-stone-600">
                {text.noData}
              </p>
            ) : (
              metrics.roleBreakdown.map((entry) => {
                const percentage = Math.max(
                  6,
                  Math.round((entry.count / (metrics.regearSubmissionCount || 1)) * 100),
                );
                return (
                  <div key={entry.role} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-black uppercase tracking-[0.18em] text-white">{entry.role}</span>
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
                        {formatCount(entry.count)} {text.request}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-stone-950">
                      <div className="h-full rounded-full bg-gradient-to-r from-red-700 via-amber-500 to-secondary" style={{ width: `${Math.min(100, percentage)}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <RankedList
          title={text.topBalances}
          items={metrics.topBalances}
          valueKey="balance"
          valueSuffix={` ${text.silver}`}
          emptyText={text.noData}
        />
        <RankedList
          title={text.topLootEarners}
          items={metrics.topLootEarners}
          valueKey="lootSplit"
          valueSuffix={` ${text.silver}`}
          emptyText={text.noData}
        />
        <RankedList
          title={text.topCompensated}
          items={metrics.topCompensated}
          valueKey="compensations"
          valueSuffix={` ${text.silver}`}
          emptyText={text.noData}
        />
      </section>

      <section className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
        <h3 className="mb-6 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.insights}</h3>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {insights.map((entry, index) => (
            <div key={`insight-${index}`} className={`flex items-start gap-4 rounded-2xl border p-4 ${
              entry.ok
                ? 'border-emerald-900/20 bg-emerald-950/20'
                : 'border-red-900/20 bg-red-950/20'
            }`}>
              <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border ${
                entry.ok
                  ? 'border-emerald-900/30 text-emerald-300'
                  : 'border-red-900/30 text-red-300'
              }`}>
                <AlertTriangle size={18} />
              </div>
              <p className="text-sm font-bold text-white">
                {entry.ok ? entry.good : entry.bad}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
