import { useEffect, useMemo, useRef, useState } from 'react';
import { PackageCheck, Search, ShoppingCart, Trash2 } from 'lucide-react';

import { useStore } from '../store';
import { SHOP_NAME } from '../appConfig';
import { ShopItemIcon } from './ShopItemIcon';

const statusMap = {
  pending: { label: 'Bekliyor', tone: 'border-amber-900/20 bg-amber-950/20 text-amber-300' },
  approved: { label: 'Hazır', tone: 'border-emerald-900/20 bg-emerald-950/20 text-emerald-300' },
  rejected: { label: 'Reddedildi', tone: 'border-red-900/20 bg-red-950/20 text-red-300' },
};

export function Shop() {
  const {
    user,
    token,
    players,
    discordLinks,
    shopOrders,
    submitShopOrder,
  } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchCacheRef = useRef(new Map());

  const linkedPlayerId = discordLinks[user?.id];
  const linkedPlayer = players.find((player) => player.id === linkedPlayerId);
  const myOrders = useMemo(
    () => shopOrders.filter((order) => order.submitter_id === user?.id),
    [shopOrders, user?.id],
  );

  useEffect(() => {
    if (query.trim().length < 2 || !token) {
      setResults([]);
      setIsSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      const normalizedQuery = query.trim().toLowerCase();
      if (searchCacheRef.current.has(normalizedQuery)) {
        setResults(searchCacheRef.current.get(normalizedQuery));
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const response = await fetch(`/api/shop-items?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(payload?.error || 'Item search failed.');
        }

        const normalizedResults = Array.isArray(payload) ? payload : [];
        searchCacheRef.current.set(normalizedQuery, normalizedResults);
        setResults(normalizedResults);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to search shop items:', error);
          setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query, token]);

  const addToCart = (item) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.uniqueName === item.uniqueName);
      if (existing) {
        return current.map((entry) =>
          entry.uniqueName === item.uniqueName
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        );
      }

      return [...current, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (uniqueName, nextQuantity) => {
    const quantity = Math.max(1, Math.floor(Number(nextQuantity) || 1));
    setCart((current) =>
      current.map((item) => (item.uniqueName === uniqueName ? { ...item, quantity } : item)),
    );
  };

  const removeFromCart = (uniqueName) => {
    setCart((current) => current.filter((item) => item.uniqueName !== uniqueName));
  };

  const submitOrder = async () => {
    if (!linkedPlayerId || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      await submitShopOrder({
        player_id: linkedPlayerId,
        items: cart,
      });
      setCart([]);
      setQuery('');
      setResults([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-600">{SHOP_NAME}</p>
        <h2 className="mt-3 text-4xl font-headline font-black uppercase italic tracking-tight text-white">
          Guild Sipariş Merkezi
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-stone-500">
          İhtiyacın olan itemleri ara, sepete ekle ve tek sipariş olarak gönder. Hazır olduğunda shop kanalından teslim bilgisi alacaksın.
        </p>
      </div>

      {!linkedPlayer && (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-black/20 p-10 text-center text-sm text-stone-500">
          Shop siparişi göndermek için önce oyun içi karakterini Discord hesabına bağlaman gerekiyor.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <section className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Item Search</p>
              <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">Albion Item Arama</h3>
            </div>
            <Search size={20} className="text-secondary" />
          </div>

          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Örn: carving, soldier armor, bag, cape, T8"
              className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 pl-12 pr-4 text-sm font-bold text-white outline-none transition-colors placeholder:text-stone-600 focus:border-secondary"
            />
          </div>

          <div className="mt-5 space-y-3">
            {isSearching && (
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-stone-500">
                Itemler aranıyor...
              </div>
            )}

            {!isSearching && results.map((item) => (
              <button
                key={item.uniqueName}
                type="button"
                onClick={() => addToCart(item)}
                className="flex w-full items-center justify-between gap-4 rounded-[1.5rem] border border-white/5 bg-black/20 p-4 text-left transition-colors hover:border-secondary/20 hover:bg-black/30"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-stone-950/60 p-2 shadow-lg">
                    <ShopItemIcon
                      uniqueName={item.uniqueName}
                      label={item.label}
                      size={64}
                      loading="eager"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase tracking-tight text-white">{item.label}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-secondary">
                        {item.tierLabel || '-'}
                      </span>
                      <span className="rounded-full border border-amber-900/20 bg-amber-950/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                        {item.enchantLabel || '-'}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-[10px] uppercase tracking-[0.18em] text-stone-600">
                      {item.uniqueName}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-secondary">
                  Sepete Ekle
                </span>
              </button>
            ))}

            {!isSearching && query.trim().length >= 2 && results.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-stone-500">
                Sonuç bulunamadı.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Cart</p>
                <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">Sipariş Sepeti</h3>
              </div>
              <ShoppingCart size={20} className="text-secondary" />
            </div>

            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.uniqueName} className="rounded-[1.5rem] border border-white/5 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-stone-950/60 p-2">
                        <ShopItemIcon
                          uniqueName={item.uniqueName}
                          label={item.label}
                          size={56}
                          loading="eager"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black uppercase text-white">{item.label}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-secondary">
                            {item.tierLabel || '-'}
                          </span>
                          <span className="rounded-full border border-amber-900/20 bg-amber-950/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                            {item.enchantLabel || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.uniqueName)}
                      className="rounded-xl border border-red-900/20 bg-red-950/20 p-2 text-red-300 transition-colors hover:bg-red-950/40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Adet</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.uniqueName, event.target.value)}
                      className="w-24 rounded-xl border border-white/10 bg-stone-950 px-3 py-2 text-right text-sm font-black text-white outline-none focus:border-secondary"
                    />
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-stone-500">
                  Sepetin şu an boş.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={submitOrder}
              disabled={!linkedPlayerId || cart.length === 0 || isSubmitting}
              className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-secondary/20 bg-secondary/10 text-sm font-black uppercase tracking-[0.2em] text-stone-950 transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PackageCheck size={18} />
              {isSubmitting ? 'Sipariş Gönderiliyor...' : 'Sepeti Onayla'}
            </button>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">Karakter</p>
            <p className="mt-2 text-xl font-headline font-black italic text-white">{linkedPlayer?.player || 'Bağlı değil'}</p>
          </div>
        </aside>
      </div>

      <section className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-600">My Orders</p>
          <h3 className="mt-2 text-2xl font-headline font-black uppercase italic text-white">Sipariş Geçmişim</h3>
        </div>

        <div className="space-y-4">
          {myOrders.map((order) => {
            const status = statusMap[order.status] || statusMap.pending;
            return (
              <div key={order.id} className="rounded-[1.5rem] border border-white/5 bg-black/20 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${status.tone}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-stone-600">
                        {new Date(order.created_at).toLocaleString('tr-TR')}
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
                  </div>

                  {order.status === 'approved' && (
                    <div className="rounded-2xl border border-emerald-900/20 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
                      <p><strong>Chest:</strong> {order.chest_location}</p>
                      <p className="mt-1"><strong>Konum:</strong> {order.pickup_note}</p>
                    </div>
                  )}

                  {order.status === 'rejected' && order.rejection_reason && (
                    <div className="rounded-2xl border border-red-900/20 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                      {order.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {myOrders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-500">
              Henüz gönderilmiş shop siparişin yok.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
