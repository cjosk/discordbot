import { useMemo, useState } from 'react';
import { ArrowRightLeft, Landmark, Send, Wallet } from 'lucide-react';

import { useStore } from '../store';
import { formatSilver, formatSilverInput, parseSilverInput } from '../silverFormat';

const statusLabels = {
  tr: {
    pending: { label: 'Bekliyor', tone: 'border-amber-900/20 bg-amber-950/20 text-amber-300' },
    approved: { label: 'Onaylandi', tone: 'border-emerald-900/20 bg-emerald-950/20 text-emerald-300' },
    rejected: { label: 'Reddedildi', tone: 'border-red-900/20 bg-red-950/20 text-red-300' },
  },
  en: {
    pending: { label: 'Pending', tone: 'border-amber-900/20 bg-amber-950/20 text-amber-300' },
    approved: { label: 'Approved', tone: 'border-emerald-900/20 bg-emerald-950/20 text-emerald-300' },
    rejected: { label: 'Rejected', tone: 'border-red-900/20 bg-red-950/20 text-red-300' },
  },
};

const copy = {
  tr: {
    missingLink: 'Once oyun ici karakter baglantisini tamamlamalisin.',
    invalidWithdrawal: 'Gecerli bir cekim tutari gir.',
    overWithdrawal: 'Istenen tutar mevcut bakiyenden yuksek olamaz.',
    requestSent: 'Cekim talebi gonderildi.',
    requestError: 'Para cekim talebi gonderilemedi.',
    chooseRecipient: 'Para gonderilecek oyuncuyu sec.',
    invalidTransfer: 'Gecerli bir gonderim tutari gir.',
    overTransfer: 'Gonderim tutari mevcut bakiyenden yuksek olamaz.',
    transferSentTo: (amount, player) => `${amount} Silver ${player} gonderildi.`,
    transferError: 'Balance transfer basarisiz oldu.',
    playerFallback: 'oyuncuya',
    eyebrow: 'Para Cekim/Gonderim',
    title: 'Bakiyeni Yonet',
    subtitle: 'Cekim talebini yonetime gonderebilir veya kendi bakiyenden baska bir oyuncuya anlik olarak silver transfer edebilirsin.',
    linkedCharacter: 'Bagli Karakter',
    noLinkedCharacter: 'Karakter baglantisi yok',
    currentBalance: 'Mevcut Bakiye',
    withdrawalRequest: 'Cekim Talebi',
    withdrawalAmount: 'Cekilecek Tutar',
    sending: 'GONDERILIYOR...',
    sendRequest: 'TALEBI GONDER',
    withdrawalHelp: 'Cekim talepleri admin onayi ile islenir. Onay geldiginde tutar bakiyenden duser.',
    sendToPlayer: 'Oyuncuya Para Gonder',
    recipientPlayer: 'Alici Oyuncu',
    choosePlayer: 'Oyuncu sec',
    transferAmount: 'Gonderilecek Tutar',
    transferring: 'AKTARILIYOR...',
    sendMoney: 'PARA GONDER',
    transferHelp: 'Bu islem anliktir. Tutar senin bakiyenden dusup secilen oyuncunun bakiyesine eklenir.',
    history: 'Cekim Gecmisin',
    noHistory: 'Henuz cekim talebin yok.',
    rejectionReason: 'Red sebebi',
  },
  en: {
    missingLink: 'You need to complete your in-game character link first.',
    invalidWithdrawal: 'Enter a valid withdrawal amount.',
    overWithdrawal: 'The requested amount cannot exceed your current balance.',
    requestSent: 'Withdrawal request submitted.',
    requestError: 'The withdrawal request could not be submitted.',
    chooseRecipient: 'Choose the player to send money to.',
    invalidTransfer: 'Enter a valid transfer amount.',
    overTransfer: 'The transfer amount cannot exceed your current balance.',
    transferSentTo: (amount, player) => `${amount} Silver sent to ${player}.`,
    transferError: 'Balance transfer failed.',
    playerFallback: 'player',
    eyebrow: 'Withdraw / Send',
    title: 'Manage Your Balance',
    subtitle: 'You can submit a withdrawal request to management or instantly transfer silver from your own balance to another player.',
    linkedCharacter: 'Linked Character',
    noLinkedCharacter: 'No character linked',
    currentBalance: 'Current Balance',
    withdrawalRequest: 'Withdrawal Request',
    withdrawalAmount: 'Withdrawal Amount',
    sending: 'SUBMITTING...',
    sendRequest: 'SEND REQUEST',
    withdrawalHelp: 'Withdrawal requests are processed with admin approval. Once approved, the amount is deducted from your balance.',
    sendToPlayer: 'Send Money To Player',
    recipientPlayer: 'Recipient Player',
    choosePlayer: 'Select player',
    transferAmount: 'Transfer Amount',
    transferring: 'TRANSFERRING...',
    sendMoney: 'SEND MONEY',
    transferHelp: 'This action is instant. The amount is deducted from your balance and added to the selected player balance.',
    history: 'Your Withdrawal History',
    noHistory: 'You do not have any withdrawal requests yet.',
    rejectionReason: 'Reason',
  },
};

export function WithdrawalRequest({ language = 'tr' }) {
  const {
    user,
    players,
    discordLinks,
    withdrawalRequests,
    submitWithdrawalRequest,
    sendBalanceTransfer,
  } = useStore();
  const text = copy[language] || copy.tr;
  const statuses = statusLabels[language] || statusLabels.tr;
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientPlayerId, setRecipientPlayerId] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionTone, setActionTone] = useState('text-stone-300');

  const linkedPlayerId = discordLinks[user?.id];
  const linkedPlayer = players.find((player) => player.id === linkedPlayerId);
  const currentBalance = linkedPlayer?.balance || 0;

  const transferablePlayers = useMemo(
    () =>
      players
        .filter((player) => player.id !== linkedPlayerId && player.activity !== 0)
        .sort((left, right) => String(left.player || '').localeCompare(String(right.player || ''))),
    [linkedPlayerId, players],
  );

  const myRequests = useMemo(
    () =>
      withdrawalRequests
        .filter((request) => request.submitter_id === user?.id)
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
        .slice(0, 10),
    [withdrawalRequests, user?.id],
  );

  const pushMessage = (message, tone = 'text-stone-300') => {
    setActionMessage(message);
    setActionTone(tone);
  };

  const handleWithdrawalSubmit = async () => {
    const numericAmount = parseSilverInput(withdrawAmount);

    if (!linkedPlayerId) {
      alert(text.missingLink);
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      alert(text.invalidWithdrawal);
      return;
    }

    if (numericAmount > currentBalance) {
      alert(text.overWithdrawal);
      return;
    }

    try {
      setIsSubmittingWithdrawal(true);
      await submitWithdrawalRequest({
        player_id: linkedPlayerId,
        amount: numericAmount,
      });
      setWithdrawAmount('');
      pushMessage(text.requestSent, 'text-emerald-300');
    } catch (error) {
      alert(error.message || text.requestError);
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const handleTransferSubmit = async () => {
    const numericAmount = parseSilverInput(transferAmount);
    const recipient = transferablePlayers.find((player) => player.id === recipientPlayerId);

    if (!linkedPlayerId) {
      alert(text.missingLink);
      return;
    }

    if (!recipientPlayerId) {
      alert(text.chooseRecipient);
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      alert(text.invalidTransfer);
      return;
    }

    if (numericAmount > currentBalance) {
      alert(text.overTransfer);
      return;
    }

    try {
      setIsSubmittingTransfer(true);
      const result = await sendBalanceTransfer({
        recipientPlayerId,
        amount: numericAmount,
      });
      setTransferAmount('');
      setRecipientPlayerId('');
      pushMessage(
        text.transferSentTo(
          formatSilver(result?.amount || numericAmount),
          recipient?.player || result?.recipient?.name || text.playerFallback,
        ),
        'text-emerald-300',
      );
    } catch (error) {
      alert(error.message || text.transferError);
    } finally {
      setIsSubmittingTransfer(false);
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
        {actionMessage ? (
          <div className={`mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm ${actionTone}`}>
            {actionMessage}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-600">{text.linkedCharacter}</p>
                <p className="mt-2 text-xl font-headline font-black italic text-white">
                  {linkedPlayer?.player || text.noLinkedCharacter}
                </p>
              </div>
              <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-600">{text.currentBalance}</p>
                <p className="mt-2 text-xl font-headline font-black italic text-secondary">
                  {formatSilver(currentBalance)} Silver
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <Landmark size={18} className="text-secondary" />
                <h3 className="text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.withdrawalRequest}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-stone-600">
                    {text.withdrawalAmount}
                  </label>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(formatSilverInput(event.target.value))}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-lg font-headline font-black text-white outline-none focus:border-secondary"
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleWithdrawalSubmit}
                  disabled={isSubmittingWithdrawal || !linkedPlayerId}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-red-900/30 bg-red-950/40 text-sm font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-red-950/60 disabled:opacity-50"
                >
                  <Send size={16} />
                  {isSubmittingWithdrawal ? text.sending : text.sendRequest}
                </button>

                <p className="text-xs text-stone-500">
                  {text.withdrawalHelp}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <Wallet size={18} className="text-secondary" />
                <h3 className="text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.sendToPlayer}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-stone-600">
                    {text.recipientPlayer}
                  </label>
                  <select
                    value={recipientPlayerId}
                    onChange={(event) => setRecipientPlayerId(event.target.value)}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-bold text-white outline-none focus:border-secondary"
                  >
                    <option value="">{text.choosePlayer}</option>
                    {transferablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.player}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-stone-600">
                    {text.transferAmount}
                  </label>
                  <input
                    type="text"
                    value={transferAmount}
                    onChange={(event) => setTransferAmount(formatSilverInput(event.target.value))}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-lg font-headline font-black text-white outline-none focus:border-secondary"
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTransferSubmit}
                  disabled={isSubmittingTransfer || !linkedPlayerId}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-secondary/20 bg-secondary/10 text-sm font-black uppercase tracking-[0.22em] text-stone-950 transition-colors hover:bg-secondary/90 disabled:opacity-50"
                >
                  <ArrowRightLeft size={16} />
                  {isSubmittingTransfer ? text.transferring : text.sendMoney}
                </button>

                <p className="text-xs text-stone-500">
                  {text.transferHelp}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <ArrowRightLeft size={18} className="text-secondary" />
            <h3 className="text-sm font-headline font-black uppercase tracking-[0.25em] text-white">{text.history}</h3>
          </div>

          <div className="space-y-3">
            {myRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-600">
                {text.noHistory}
              </div>
            ) : (
              myRequests.map((request) => {
                const statusMeta = statuses[request.status] || statuses.pending;

                return (
                  <div key={request.id} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-headline font-black italic text-white">
                          {formatSilver(request.amount)} Silver
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-600">
                          {new Date(request.submitted_at).toLocaleString(locale)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${statusMeta.tone}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    {request.rejection_reason ? (
                      <div className="mt-3 rounded-xl border border-red-900/20 bg-red-950/20 px-3 py-2 text-xs text-red-200">
                        {text.rejectionReason}: {request.rejection_reason}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
