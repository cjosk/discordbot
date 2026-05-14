import { useMemo, useState } from 'react';
import { CheckCircle, Loader2, Wallet, XCircle } from 'lucide-react';

import { useStore } from '../store';

const copy = {
  tr: {
    missingReason: 'Red sebebi zorunlu.',
    resolveError: 'Cekim talebi islenemedi.',
    eyebrow: 'Para Cekim Yonetimi',
    title: 'Bekleyen Cekim Talepleri',
    subtitle: 'Kullanicilarin para cekim taleplerini goruntule, onayla veya sebep belirterek reddet.',
    pending: 'Bekleyenler',
    noPending: 'Bekleyen cekim talebi yok.',
    requestedAmount: 'Cekmek Istedigi Tutar',
    currentBalance: 'Mevcut Bakiye',
    submittedAt: 'Gonderim',
    rejectionReason: 'Red Sebebi',
    rejectionPlaceholder: 'Reddedilecekse sebep yaz...',
    approve: 'Onayla',
    reject: 'Reddet',
    resolvedRequests: 'Sonuclanan Talepler',
    noResolved: 'Sonuclanan cekim talebi yok.',
    reasonPrefix: 'Red sebebi',
    approved: 'Onaylandi',
    rejected: 'Reddedildi',
  },
  en: {
    missingReason: 'A rejection reason is required.',
    resolveError: 'The withdrawal request could not be processed.',
    eyebrow: 'Withdrawal Management',
    title: 'Pending Withdrawal Requests',
    subtitle: 'Review user withdrawal requests, approve them, or reject them with a reason.',
    pending: 'Pending',
    noPending: 'There are no pending withdrawal requests.',
    requestedAmount: 'Requested Amount',
    currentBalance: 'Current Balance',
    submittedAt: 'Submitted At',
    rejectionReason: 'Rejection Reason',
    rejectionPlaceholder: 'Enter a reason if you reject it...',
    approve: 'Approve',
    reject: 'Reject',
    resolvedRequests: 'Resolved Requests',
    noResolved: 'There are no resolved withdrawal requests.',
    reasonPrefix: 'Reason',
    approved: 'Approved',
    rejected: 'Rejected',
  },
};

export function WithdrawalAdmin({ language = 'tr' }) {
  const { players, withdrawalRequests, resolveWithdrawalRequest } = useStore();
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [busyKey, setBusyKey] = useState('');
  const text = copy[language] || copy.tr;
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  const pendingRequests = useMemo(
    () => withdrawalRequests.filter((request) => request.status === 'pending'),
    [withdrawalRequests],
  );

  const resolvedRequests = useMemo(
    () =>
      withdrawalRequests
        .filter((request) => request.status !== 'pending')
        .sort((a, b) => new Date(b.resolved_at || b.submitted_at) - new Date(a.resolved_at || a.submitted_at))
        .slice(0, 20),
    [withdrawalRequests],
  );

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US').format(Math.floor(Number(value) || 0));

  const handleResolve = async (request, status) => {
    const key = `${status}-${request.id}`;
    const rejectionReason = (rejectionReasons[request.id] || '').trim();

    if (status === 'rejected' && !rejectionReason) {
      alert(text.missingReason);
      return;
    }

    try {
      setBusyKey(key);
      await resolveWithdrawalRequest(request.id, status, rejectionReason);
      setRejectionReasons((state) => ({ ...state, [request.id]: '' }));
    } catch (error) {
      alert(error.message || text.resolveError);
    } finally {
      setBusyKey('');
    }
  };

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

      <section className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
        <h3 className="mb-5 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.pending}</h3>

        {pendingRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-600">
            {text.noPending}
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const player = players.find((entry) => entry.id === request.player_id);
              const approveKey = `approved-${request.id}`;
              const rejectKey = `rejected-${request.id}`;

              return (
                <div key={request.id} className="rounded-[1.75rem] border border-white/5 bg-black/20 p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                          {request.submitter}
                        </span>
                        {player ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-300">
                            {player.player}
                          </span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/5 bg-stone-950/50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.requestedAmount}</p>
                          <p className="mt-2 text-lg font-headline font-black italic text-secondary">
                            {formatCurrency(request.amount)} Silver
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-stone-950/50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.currentBalance}</p>
                          <p className="mt-2 text-sm font-bold text-stone-300">
                            {formatCurrency(player?.balance || 0)} Silver
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-stone-950/50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">{text.submittedAt}</p>
                          <p className="mt-2 text-sm font-bold text-stone-300">
                            {new Date(request.submitted_at).toLocaleString(locale)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-stone-600">
                          {text.rejectionReason}
                        </label>
                        <textarea
                          value={rejectionReasons[request.id] || ''}
                          onChange={(event) =>
                            setRejectionReasons((state) => ({ ...state, [request.id]: event.target.value }))
                          }
                          rows={3}
                          className="w-full rounded-2xl border border-white/10 bg-stone-950/50 px-4 py-3 text-sm text-white outline-none focus:border-secondary"
                          placeholder={text.rejectionPlaceholder}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 xl:w-60">
                      <button
                        type="button"
                        onClick={() => handleResolve(request, 'approved')}
                        disabled={busyKey === approveKey || busyKey === rejectKey}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-900/30 bg-emerald-950/30 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-300 transition-colors hover:bg-emerald-950/50 disabled:opacity-50"
                      >
                        {busyKey === approveKey ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        {text.approve}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(request, 'rejected')}
                        disabled={busyKey === approveKey || busyKey === rejectKey}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-red-900/30 bg-red-950/30 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-950/50 disabled:opacity-50"
                      >
                        {busyKey === rejectKey ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                        {text.reject}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex items-center gap-3">
          <Wallet size={18} className="text-secondary" />
          <h3 className="text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.resolvedRequests}</h3>
        </div>

        {resolvedRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-600">
            {text.noResolved}
          </div>
        ) : (
          <div className="space-y-3">
            {resolvedRequests.map((request) => {
              const player = players.find((entry) => entry.id === request.player_id);
              const statusTone =
                request.status === 'approved'
                  ? 'border-emerald-900/20 bg-emerald-950/20 text-emerald-300'
                  : 'border-red-900/20 bg-red-950/20 text-red-300';

              return (
                <div key={request.id} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-headline font-black italic text-white">
                        {request.submitter} {player ? `• ${player.player}` : ''}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-600">
                        {formatCurrency(request.amount)} Silver • {new Date(request.resolved_at || request.submitted_at).toLocaleString(locale)}
                      </p>
                      {request.rejection_reason ? (
                        <p className="mt-2 text-sm text-red-200">{text.reasonPrefix}: {request.rejection_reason}</p>
                      ) : null}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${statusTone}`}>
                      {request.status === 'approved' ? text.approved : text.rejected}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
