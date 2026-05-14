import { useMemo, useState } from 'react';
import { Check, PackageSearch, X } from 'lucide-react';

import { useStore } from '../store';
import { SHOP_NAME } from '../appConfig';
import { ShopItemIcon } from './ShopItemIcon';

const statusStyles = {
  approved: 'border-emerald-900/20 bg-emerald-950/20 text-emerald-300',
  rejected: 'border-red-900/20 bg-red-950/20 text-red-300',
};

export function ShopAdmin() {
  const { shopOrders, players, resolveShopOrder } = useStore();
  const [formState, setFormState] = useState({});
  const [loadingKey, setLoadingKey] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const pendingOrders = useMemo(
    () => shopOrders.filter((order) => order.status === 'pending'),
    [shopOrders],
  );
  const resolvedOrders = useMemo(
    () => shopOrders.filter((order) => order.status !== 'pending'),
    [shopOrders],
  );

  const getPlayerName = (playerId) =>
    players.find((player) => player.id === playerId)?.player || 'Bilinmiyor';

  const updateForm = (orderId, field, value) => {
    setFormState((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] || {}),
        [field]: value,
      },
    }));
  };

  const approveOrder = async (orderId) => {
    const values = formState[orderId] || {};
    setLoadingKey(`approve-${orderId}`);
    try {
      const result = await resolveShopOrder(orderId, 'approved', {
        chestLocation: values.chestLocation || '',
        pickupNote: values.pickupNote || '',
      });
      setActionMessage(
        result?.notificationSent === false
          ? 'Sipariş onaylandı fakat Discord bildirimi gönderilemedi.'
          : 'Sipariş hazır olarak onaylandı.',
      );
    } finally {
      setLoadingKey('');
    }
  };

  const rejectOrder = async (orderId) => {
    const values = formState[orderId] || {};
    setLoadingKey(`reject-${orderId}`);
    try {
      await resolveShopOrder(orderId, 'rejected', {
        rejectionReason: values.rejectionReason || '',
      });
      setActionMessage('Sipariş reddedildi.');
    } finally {
      setLoadingKey('');
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-600">{`${SHOP_NAME} Admin`}</p>
        <h2 className="mt-3 text-4xl font-headline font-black uppercase italic tracking-tight text-white">
          Sipariş Yönetimi
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-stone-500">
          Siparişleri hazırla, chest teslim bilgisini gir ve onayladığında shop kanalına otomatik bildirim gönder.
        </p>
        {actionMessage && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-300">
            {actionMessage}
          </div>
        )}
      </div>

      <section className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Pending</p>
            <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">Bekleyen Siparişler</h3>
          </div>
          <PackageSearch size={20} className="text-secondary" />
        </div>

        <div className="space-y-5">
          {pendingOrders.map((order) => {
            const values = formState[order.id] || {};
            return (
              <div key={order.id} className="rounded-[1.75rem] border border-white/5 bg-black/20 p-5">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase text-white">{order.submitter}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-stone-500">
                        Karakter: {getPlayerName(order.player_id)} • {new Date(order.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-900/20 bg-amber-950/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                      Bekliyor
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(order.items || []).map((item, index) => (
                      <div key={`${order.id}-${item.uniqueName}-${index}`} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 pr-4 text-xs font-bold uppercase tracking-[0.14em] text-stone-300">
                        {item.iconUrl && (
                          <ShopItemIcon
                            uniqueName={item.uniqueName}
                            label={item.label}
                            size={24}
                            className="h-6 w-6 rounded-full object-contain"
                          />
                        )}
                        <span>{item.quantity}x {item.label}</span>
                        <span className="text-secondary">{item.tierLabel || ''}</span>
                        <span className="text-amber-300">{item.enchantLabel || ''}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <input
                      value={values.chestLocation || ''}
                      onChange={(event) => updateForm(order.id, 'chestLocation', event.target.value)}
                      placeholder="Chest yeri / island chest adı"
                      className="w-full rounded-2xl border border-white/10 bg-stone-950/50 px-4 py-3 text-sm text-white outline-none focus:border-secondary"
                    />
                    <input
                      value={values.pickupNote || ''}
                      onChange={(event) => updateForm(order.id, 'pickupNote', event.target.value)}
                      placeholder="Konum / teslim notu"
                      className="w-full rounded-2xl border border-white/10 bg-stone-950/50 px-4 py-3 text-sm text-white outline-none focus:border-secondary"
                    />
                  </div>

                  <input
                    value={values.rejectionReason || ''}
                    onChange={(event) => updateForm(order.id, 'rejectionReason', event.target.value)}
                    placeholder="Reddetmek için sebep gir"
                    className="w-full rounded-2xl border border-white/10 bg-stone-950/50 px-4 py-3 text-sm text-white outline-none focus:border-secondary"
                  />

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => approveOrder(order.id)}
                      disabled={loadingKey === `approve-${order.id}`}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-900/30 bg-emerald-950/30 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-300 transition-colors hover:bg-emerald-950/50 disabled:opacity-50"
                    >
                      <Check size={16} />
                      {loadingKey === `approve-${order.id}` ? 'Onaylanıyor...' : 'Hazır Olarak Onayla'}
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectOrder(order.id)}
                      disabled={loadingKey === `reject-${order.id}`}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-red-900/30 bg-red-950/30 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-950/50 disabled:opacity-50"
                    >
                      <X size={16} />
                      {loadingKey === `reject-${order.id}` ? 'Reddediliyor...' : 'Reddet'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {pendingOrders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-500">
              Bekleyen shop siparişi yok.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Resolved</p>
          <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">Sonuçlanan Siparişler</h3>
        </div>

        <div className="space-y-4">
          {resolvedOrders.map((order) => (
            <div key={order.id} className="rounded-[1.5rem] border border-white/5 bg-black/20 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-black uppercase text-white">{order.submitter}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-stone-500">
                    {getPlayerName(order.player_id)} • {new Date(order.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>

                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusStyles[order.status] || statusStyles.rejected}`}>
                  {order.status === 'approved' ? 'Hazırlandı' : 'Reddedildi'}
                </span>
              </div>

              {order.status === 'approved' && (
                <div className="mt-4 rounded-2xl border border-emerald-900/20 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
                  <p><strong>Chest:</strong> {order.chest_location}</p>
                  <p className="mt-1"><strong>Konum:</strong> {order.pickup_note}</p>
                </div>
              )}

              {order.status === 'rejected' && order.rejection_reason && (
                <div className="mt-4 rounded-2xl border border-red-900/20 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                  {order.rejection_reason}
                </div>
              )}
            </div>
          ))}

          {resolvedOrders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-500">
              Henüz sonuçlanan shop siparişi yok.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
