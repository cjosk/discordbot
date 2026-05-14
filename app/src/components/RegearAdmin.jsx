import { useState } from 'react';
import { CheckCircle, Coins, ExternalLink, Loader2, Plus, Shield, Trash2, XCircle } from 'lucide-react';

import { useStore } from '../store';
import { REGEAR_ROLES } from '../regearConfig';
import { formatSilver, formatSilverInput, parseSilverInput } from '../silverFormat';

export function RegearAdmin() {
  const {
    user,
    players,
    regearContents,
    regearAmounts,
    regearSubmissions,
    createRegearContent,
    deleteRegearContent,
    resolveRegear,
    saveRegearAmounts,
  } = useStore();

  const [newTitle, setNewTitle] = useState('');
  const [selectedContentId, setSelectedContentId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [busyKey, setBusyKey] = useState('');

  const pendingRaw = regearSubmissions.filter((submission) => submission.status === 'pending');
  const resolvedRaw = regearSubmissions.filter((submission) => submission.status !== 'pending');
  const firstWithPending = regearContents.find((content) =>
    regearSubmissions.some(
      (submission) => submission.content_id === content.id && submission.status === 'pending',
    ),
  );

  const effectiveSelectedContentId =
    (selectedContentId && regearContents.some((content) => content.id === selectedContentId)
      ? selectedContentId
      : firstWithPending?.id || regearContents[0]?.id) || '';

  const selectedContent =
    regearContents.find((content) => content.id === effectiveSelectedContentId) || null;

  const pending = pendingRaw.filter((submission) => submission.content_id === effectiveSelectedContentId);
  const resolved = resolvedRaw.filter((submission) => submission.content_id === effectiveSelectedContentId);

  const contentStats = regearContents.map((content) => ({
    ...content,
    pendingCount: pendingRaw.filter((submission) => submission.content_id === content.id).length,
    resolvedCount: resolvedRaw.filter((submission) => submission.content_id === content.id).length,
  }));

  const handleCreateContent = async () => {
    const title = newTitle.trim();
    if (!title || isCreating) return;

    try {
      setIsCreating(true);
      await createRegearContent(title, user.global_name || user.username);
      setNewTitle('');
    } catch (error) {
      alert(error.message || 'Content oluşturulamadı.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteContent = async (id) => {
    try {
      setBusyKey(`delete-${id}`);
      await deleteRegearContent(id);
      if (selectedContentId === id) {
        setSelectedContentId('');
      }
    } catch (error) {
      alert(error.message || 'Content silinemedi.');
    } finally {
      setBusyKey('');
    }
  };

  const handleAmountChange = async (roleId, value) => {
    const numericValue = parseSilverInput(value);
    const next = { ...regearAmounts, [roleId]: numericValue };

    try {
      setBusyKey(`amount-${roleId}`);
      await saveRegearAmounts(next);
    } catch (error) {
      alert(error.message || 'Regear tutarlari kaydedilemedi.');
    } finally {
      setBusyKey('');
    }
  };

  const handleResolve = async (submission, status) => {
    const payoutAmount = status === 'approved' ? regearAmounts[submission.role] || 0 : 0;
    const actionKey = `${status}-${submission.id}`;

    try {
      setBusyKey(actionKey);
      await resolveRegear(submission.id, status, payoutAmount);
    } catch (error) {
      alert(error.message || 'Regear işlemi başarısız oldu.');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-600">Regear Yönetimi</p>
            <h2 className="mt-3 text-4xl font-headline font-black uppercase italic tracking-tight text-white">
              Content Bazlı Regear Kontrolü
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-stone-500">
              Content bazlı talepleri yönet, role göre sabit regear tutarı belirle ve onay sırasında
              ödemeyi otomatik olarak oyuncu bakiyesine işle.
            </p>
          </div>

          <div className="flex w-full max-w-xl items-center gap-3">
            <input
              type="text"
              placeholder="Yeni content başlığı"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleCreateContent();
                }
              }}
              className="h-12 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition-colors placeholder:text-stone-600 focus:border-secondary"
            />
            <button
              type="button"
              onClick={handleCreateContent}
              disabled={isCreating}
              className="flex h-12 min-w-[116px] items-center justify-center gap-2 rounded-2xl border border-red-900/30 bg-red-950/40 px-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-950/70 disabled:opacity-50"
            >
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Ekle
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-headline font-black uppercase tracking-[0.25em] text-white">Contentler</h3>
              <span className="text-xs font-bold text-stone-500">{contentStats.length} adet</span>
            </div>

            <div className="space-y-3">
              {contentStats.map((content) => {
                const isSelected = effectiveSelectedContentId === content.id;
                const isDeleting = busyKey === `delete-${content.id}`;

                return (
                  <div
                    key={content.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-secondary bg-secondary/10'
                        : 'border-white/5 bg-black/20 hover:border-white/15 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedContentId(content.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="font-headline text-base font-black uppercase tracking-tight text-white">{content.title}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {content.created_by} • {new Date(content.created_at).toLocaleDateString('tr-TR')}
                        </p>
                        <div className="mt-4 flex gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
                          <span className="rounded-full border border-amber-900/20 bg-amber-950/30 px-3 py-1 text-amber-400">
                            {content.pendingCount} bekleyen
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-stone-300">
                            {content.resolvedCount} sonuç
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteContent(content.id)}
                        disabled={isDeleting}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-red-900/20 bg-red-950/30 text-red-400 transition-colors hover:bg-red-950/50 disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}

              {contentStats.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-stone-600">
                  Henüz aktif content yok.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <Coins size={18} className="text-secondary" />
              <h3 className="text-sm font-headline font-black uppercase tracking-[0.25em] text-white">Regear Tutarları</h3>
            </div>

            <div className="space-y-3">
              {REGEAR_ROLES.map((role) => (
                <div
                  key={role.id}
                  className="grid grid-cols-[1fr_170px] items-center gap-4 rounded-2xl border border-white/5 bg-black/20 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`material-symbols-outlined ${role.color}`}>{role.icon}</span>
                    <span className="text-sm font-bold uppercase tracking-[0.15em] text-white">{role.id}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="text"
                      value={formatSilverInput(regearAmounts[role.id] || 0)}
                      onChange={(event) => handleAmountChange(role.id, event.target.value)}
                      disabled={busyKey === `amount-${role.id}`}
                      className="h-11 w-full rounded-xl border border-white/10 bg-stone-950 px-3 text-right text-sm font-bold text-white outline-none focus:border-secondary"
                      inputMode="numeric"
                    />
                    <span className="w-10 text-right text-[11px] font-bold uppercase text-stone-500">Silver</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-600">Seçili Content</p>
                <h3 className="mt-2 text-3xl font-headline font-black uppercase italic tracking-tight text-white">
                  {selectedContent ? selectedContent.title : 'Content seç'}
                </h3>
              </div>

              {selectedContent && (
                <div className="flex gap-3 text-xs font-bold uppercase tracking-[0.18em]">
                  <span className="rounded-full border border-amber-900/20 bg-amber-950/30 px-4 py-2 text-amber-400">
                    {pending.length} bekleyen
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-stone-300">
                    {resolved.length} sonuç
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-5 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">
              Bekleyen Talepler
            </h3>

            {!selectedContent ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-600">
                Sol taraftan bir content seç.
              </div>
            ) : pending.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-600">
                Bu content için bekleyen regear yok.
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map((submission) => {
                  const player = players.find((entry) => entry.id === submission.player_id);
                  const payout = regearAmounts[submission.role] || 0;
                  const approveKey = `approved-${submission.id}`;
                  const rejectKey = `rejected-${submission.id}`;

                  return (
                    <div key={submission.id} className="rounded-[1.75rem] border border-white/5 bg-black/20 p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xl font-headline font-black uppercase italic tracking-tight text-white">{submission.submitter}</p>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-300">
                              {submission.role}
                            </span>
                            {player && (
                              <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                                {player.player}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-white/5 bg-stone-950/50 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Rol Tutarı</p>
                              <p className="mt-2 text-lg font-headline font-black italic text-secondary">
                                {formatSilver(payout)} Silver
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/5 bg-stone-950/50 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Gönderim</p>
                              <p className="mt-2 text-sm font-bold text-stone-300">
                                {new Date(submission.submitted_at).toLocaleString('tr-TR')}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/5 bg-stone-950/50 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Screenshot</p>
                              <a
                                href={submission.screenshot}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-secondary"
                              >
                                Görüntüyü aç
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 xl:w-60">
                          <button
                            type="button"
                            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-900/30 bg-emerald-950/30 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-300 transition-colors hover:bg-emerald-950/50 disabled:opacity-50"
                            onClick={() => handleResolve(submission, 'approved')}
                            disabled={busyKey === approveKey || busyKey === rejectKey}
                          >
                            {busyKey === approveKey ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Onayla +{formatSilver(payout)}
                          </button>
                          <button
                            type="button"
                            className="flex items-center justify-center gap-2 rounded-2xl border border-red-900/30 bg-red-950/30 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-950/50 disabled:opacity-50"
                            onClick={() => handleResolve(submission, 'rejected')}
                            disabled={busyKey === approveKey || busyKey === rejectKey}
                          >
                            {busyKey === rejectKey ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                            Reddet
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-5 text-sm font-headline font-black uppercase tracking-[0.25em] text-white">
              Sonuçlananlar
            </h3>

            {!selectedContent ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-600">
                Sol taraftan bir content seç.
              </div>
            ) : resolved.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-600">
                Bu content için sonuç kaydı yok.
              </div>
            ) : (
              <div className="space-y-3">
                {resolved.slice(0, 20).map((submission) => (
                  <div key={submission.id} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-headline text-lg font-black uppercase italic tracking-tight text-white">{submission.submitter}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-300">
                        {submission.role}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                        submission.status === 'approved'
                          ? 'border border-emerald-900/20 bg-emerald-950/30 text-emerald-300'
                          : 'border border-red-900/20 bg-red-950/30 text-red-300'
                      }`}>
                        {submission.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-stone-500">
                      <div className="flex items-center gap-2">
                        <Shield size={14} />
                        <span>{new Date(submission.submitted_at).toLocaleString('tr-TR')}</span>
                      </div>
                      <a
                        href={submission.screenshot}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-secondary"
                      >
                        Screenshot
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
