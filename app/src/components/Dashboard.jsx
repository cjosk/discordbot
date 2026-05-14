import { useStore } from '../store';
import { splitIncludesPlayer } from '../splitUtils';

const copy = {
  tr: {
    eyebrow: 'Yonetim Paneli',
    title: 'Anasayfa',
    statusLabel: 'Sistem Durumu',
    statusValue: 'Aktif',
    myBalance: 'Bakiyen',
    issuedAssets: 'Dagitilan Varliklar',
    myLootSplit: 'Toplam Loot Splitin',
    totalPlayers: 'Toplam Oyuncu Sayisi',
    generalStatus: 'Genel Durum',
    pendingApprovals: 'Bekleyen Onaylar',
    memberActivity: 'Uye Aktivitesi',
    activityUnit: 'aktivite',
    pendingRegear: 'Onay Bekleyen Regearlar',
    pendingSplit: 'Onay Bekleyen Splitler',
    awaiting: 'Bekliyor',
    noPendingRegear: 'Bekleyen regear talebi yok.',
    noPendingSplit: 'Bekleyen split yok.',
    activityFeed: 'Aktiviteler',
    noActivity: 'Henuz kayitli aktivite yok.',
    perPerson: 'kisi basi dagitildi.',
    members: 'uye',
    splitLaunchPrefix: 'dagitimi baslatti.',
  },
  en: {
    eyebrow: 'Operations Overview',
    title: 'Dashboard',
    statusLabel: 'System Status',
    statusValue: 'Operational',
    myBalance: 'Your Balance',
    issuedAssets: 'Issued Assets',
    myLootSplit: 'Your Loot Split Total',
    totalPlayers: 'Total Players',
    generalStatus: 'General Status',
    pendingApprovals: 'Pending Approvals',
    memberActivity: 'Member Activity',
    activityUnit: 'activity',
    pendingRegear: 'Pending Regears',
    pendingSplit: 'Pending Splits',
    awaiting: 'Awaiting',
    noPendingRegear: 'No pending regear requests.',
    noPendingSplit: 'No pending splits.',
    activityFeed: 'Activities',
    noActivity: 'No activity recorded yet.',
    perPerson: 'distributed per person.',
    members: 'members',
    splitLaunchPrefix: 'started a distribution.',
  },
};

export function Dashboard({ language = 'tr' }) {
  const { user, players, pendingSplits, regearSubmissions, discordLinks } = useStore();
  const isStaff = user?.role === 'admin' || user?.role === 'chief';
  const totalIssued = players.reduce((sum, player) => sum + (player.issued || 0), 0);
  const activeMembers = players.length;
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  const text = copy[language] || copy.tr;

  const playerLinkedId = discordLinks[user?.id];
  const linkedPlayer = players.find((player) => player.id === playerLinkedId);
  const primaryBalance = linkedPlayer?.balance || 0;
  const secondaryMetricLabel = isStaff ? text.issuedAssets : text.myLootSplit;
  const secondaryMetricValue = isStaff ? totalIssued : (linkedPlayer?.lootSplit || 0);

  const pendingSplitItems = pendingSplits.filter((split) =>
    split.status === 'pending' && (isStaff || splitIncludesPlayer(split, linkedPlayer)),
  );
  const pendingRegears = regearSubmissions.filter((submission) =>
    submission.status === 'pending'
    && (isStaff || submission.submitter_id === user?.id || submission.player_id === playerLinkedId),
  );
  const pendingSplitsCount = pendingSplitItems.length;
  const pendingRegearCount = pendingRegears.length;
  const pendingApprovalTotal = pendingSplitsCount + pendingRegearCount;
  const memberActivityCount = pendingSplits.filter((split) => splitIncludesPlayer(split, linkedPlayer)).length;
  const pendingApprovalWidth = Math.min(pendingApprovalTotal * 12, 100);
  const memberActivityWidth = Math.min(memberActivityCount * 8, 100);

  const formatCurrency = (value) => new Intl.NumberFormat('en-US').format(Math.floor(value || 0));

  const recentActivities = [...pendingSplits]
    .filter((activity) => isStaff || splitIncludesPlayer(activity, linkedPlayer))
    .sort((a, b) => new Date(b.submitted_at || b.submittedAt) - new Date(a.submitted_at || a.submittedAt))
    .slice(0, 5);

  return (
    <div className="min-h-full">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 overflow-hidden rounded-2xl border border-white/5 border-l-2 border-secondary bg-stone-900/40 p-8 shadow-2xl lg:col-span-8">
          <div className="mb-12">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 italic">{text.myBalance}</h3>
            <p className="flex items-center gap-4 text-6xl font-headline font-black tracking-tighter text-secondary italic">
              <img src="/silver.png" alt="Silver" className="h-12 w-12 object-contain" />
              {formatCurrency(primaryBalance)}
              <span className="ml-2 text-xl opacity-50">Silver</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-8">
            <div>
              <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-stone-600 italic">{secondaryMetricLabel}</p>
              <p className="text-2xl font-headline font-black text-white italic">{formatCurrency(secondaryMetricValue)}</p>
            </div>
            <div>
              <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-stone-600 italic">{text.totalPlayers}</p>
              <p className="text-2xl font-headline font-black text-white italic">{activeMembers}</p>
            </div>
          </div>
        </div>

        <div className="col-span-12 rounded-2xl border border-white/5 border-l-2 border-red-800 bg-stone-900/40 p-8 shadow-2xl lg:col-span-4">
          <h3 className="mb-8 text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 italic">{text.generalStatus}</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-400 italic">{text.pendingApprovals}</span>
                <span className="text-lg font-headline font-black text-white italic">{pendingApprovalTotal}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-stone-950">
                <div className="h-full rounded-full bg-red-700" style={{ width: `${pendingApprovalWidth}%` }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-400 italic">{text.memberActivity}</span>
                <span className="text-lg font-headline font-black text-white italic">{memberActivityCount} {text.activityUnit}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-stone-950">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${memberActivityWidth}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 rounded-2xl border border-white/5 border-l-2 border-amber-600/50 bg-stone-900/40 p-8 shadow-xl lg:col-span-4">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 italic">{text.pendingRegear}</h3>
            <span className="rounded border border-amber-900/20 bg-amber-950/20 px-2 py-1 text-[10px] font-black text-amber-500 italic">{text.awaiting}</span>
          </div>
          <div className="space-y-1">
            {pendingRegears.slice(0, 5).map((submission) => (
              <div key={submission.id} className="group flex items-center justify-between rounded-xl border border-transparent p-3 transition-colors hover:border-white/5 hover:bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-900/10 bg-red-950/20">
                    <span className="material-symbols-outlined text-xl text-primary">shield</span>
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tighter text-white italic">{submission.submitter}</p>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-stone-600">{submission.role} - {submission.regear_contents?.title || 'Bilinmiyor'}</p>
                  </div>
                </div>
              </div>
            ))}
            {pendingRegearCount === 0 && <p className="rounded-xl border border-dashed border-white/5 bg-black/20 py-8 text-center text-xs text-stone-700 italic">{text.noPendingRegear}</p>}
          </div>
        </div>

        <div className="col-span-12 rounded-2xl border border-white/5 border-l-2 border-red-800 bg-stone-900/40 p-8 shadow-xl lg:col-span-4">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 italic">{text.pendingSplit}</h3>
            <span className="rounded border border-red-900/30 bg-red-950/40 px-2 py-1 text-[9px] font-black text-primary italic">{pendingSplitsCount} {text.awaiting}</span>
          </div>
          <div className="space-y-4">
            {pendingSplitItems.slice(0, 2).map((split) => (
              <div key={split.id} className="rounded-xl border border-white/5 bg-stone-950/50 p-4 shadow-inner">
                <div className="mb-4 flex justify-between">
                  <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 italic">{split.split_name || split.splitName || 'Loot Split'}</p>
                  <span className="text-[9px] font-black uppercase text-stone-700 italic">{text.awaiting}</span>
                </div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-stone-900 text-[10px] font-black">
                    {split.submitter?.charAt(0)}
                  </div>
                  <p className="text-xs font-bold text-stone-500 italic">
                    <span className="text-white">@{split.submitter}</span>{' '}
                    <span className="text-secondary">{formatCurrency(split.net_total || split.netTotal)} Silver</span>{' '}
                    {text.splitLaunchPrefix}
                  </p>
                </div>
              </div>
            ))}
            {pendingSplitsCount === 0 && <p className="rounded-xl border border-dashed border-white/5 bg-black/20 py-8 text-center text-xs text-stone-700 italic">{text.noPendingSplit}</p>}
          </div>
        </div>

        <div className="col-span-12 overflow-hidden rounded-2xl border border-white/5 border-l-2 border-zinc-700 bg-stone-950/40 p-8 shadow-xl lg:col-span-4">
          <h3 className="mb-8 text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 italic">{text.activityFeed}</h3>
          <div className="relative space-y-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-white/5">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="group relative flex gap-5">
                <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full border border-secondary bg-stone-900 shadow-[0_0_10px_rgba(233,195,73,0.2)]">
                  <span className="material-symbols-outlined text-[10px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-400 italic transition-colors group-hover:text-white">
                    <span className="font-black uppercase text-white">{activity.split_name || activity.splitName || 'Content'}</span> - {formatCurrency(activity.per_person || activity.perPerson)} {text.perPerson}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-stone-700 italic">
                    {activity.participant_count || activity.participants?.length || 0} {text.members} - {new Date(activity.submitted_at || activity.submittedAt).toLocaleDateString(locale)}
                  </p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && <p className="rounded-xl border border-dashed border-white/5 bg-black/20 py-8 text-center text-xs text-stone-700 italic">{text.noActivity}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
