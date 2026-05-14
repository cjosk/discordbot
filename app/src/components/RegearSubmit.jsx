import { useEffect, useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

import { useStore } from '../store';
import { REGEAR_ROLES } from '../regearConfig';

export function RegearSubmit() {
  const {
    user,
    discordLinks,
    regearContents,
    regearAmounts,
    submitRegear,
    fetchRegearAmounts,
    token,
  } = useStore();
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRegearAmounts();
  }, [fetchRegearAmounts]);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !token) return;

    if (!file.type.startsWith('image/')) {
      alert('Sadece gorsel dosyasi yukleyebilirsin.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Gorsel boyutu 10 MB ustunde olamaz.');
      return;
    }

    setIsUploading(true);

    try {
      const signatureRes = await fetch('/api/upload-signature', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!signatureRes.ok) {
        throw new Error('Yukleme imzasi alinamadi.');
      }

      const {
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
        allowedFormats,
      } = await signatureRes.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('folder', folder);
      formData.append('allowed_formats', allowedFormats);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setScreenshot(data.secure_url);
    } catch (error) {
      alert(error.message || 'Gorsel yukleme basarisiz oldu.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting || isUploading) return;

    if (!selectedContent || !selectedRole || !screenshot) {
      alert('Lutfen content, rol ve screenshot alanlarini doldur.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitRegear({
        content_id: selectedContent,
        player_id: discordLinks[user.id] || null,
        role: selectedRole,
        screenshot,
      });
      alert('Regear talebi gonderildi.');
      setSelectedContent('');
      setSelectedRole('');
      setScreenshot('');
    } catch (error) {
      alert(error.message || 'Regear talebi gonderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPayout = regearAmounts[selectedRole] || 0;
  const selectedContentEntry = regearContents.find((content) => content.id === selectedContent);
  const formatCurrency = (value) => new Intl.NumberFormat('en-US').format(Math.floor(value || 0));

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent p-6 lg:p-8">
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-red-900/10 opacity-10 blur-[100px]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col">
        <header className="mb-6 flex-shrink-0">
          <h1 className="text-3xl font-headline font-black uppercase leading-none tracking-tighter text-white italic drop-shadow-2xl lg:text-4xl">
            Regear <span className="font-black text-secondary">Gonder</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Onaylandiginda sectigin role ait sabit regear tutari otomatik olarak bakiyene eklenir.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-h-0 flex-col gap-5">
            <section className="space-y-3 rounded-[2rem] border border-white/5 bg-stone-950/35 p-5 shadow-2xl backdrop-blur-xl">
              <label className="ml-1 block text-[10px] font-headline font-black uppercase tracking-[0.3em] text-stone-600 italic">
                Content Sec
              </label>
              <div className="group relative">
                <select
                  value={selectedContent}
                  onChange={(event) => setSelectedContent(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full cursor-pointer appearance-none rounded-2xl border border-white/10 bg-stone-900/40 px-5 py-4 text-base font-bold uppercase italic text-white transition-all focus:border-secondary focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option disabled value="" className="bg-stone-900 text-stone-600">
                    regear content sec
                  </option>
                  {regearContents.map((content) => (
                    <option key={content.id} value={content.id} className="bg-stone-900 text-white">
                      {content.title}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-lg text-stone-700 transition-colors group-focus-within:text-secondary">
                  expand_more
                </span>
              </div>
            </section>

            <section className="space-y-3 rounded-[2rem] border border-white/5 bg-stone-950/35 p-5 shadow-2xl backdrop-blur-xl">
              <label className="ml-1 block text-[10px] font-headline font-black uppercase tracking-[0.3em] text-stone-600 italic">
                Rol Sec
              </label>
              <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                {REGEAR_ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    disabled={isSubmitting}
                    className={`group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center shadow-xl backdrop-blur-md transition-all duration-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                      selectedRole === role.id
                        ? 'border-secondary bg-secondary/10 shadow-[0_0_20px_rgba(233,195,73,0.1)]'
                        : 'border-white/5 bg-stone-950/40 hover:border-secondary/30'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-2xl transition-all ${
                        selectedRole === role.id
                          ? 'scale-110 text-secondary'
                          : 'text-stone-700 group-hover:text-secondary/70'
                      }`}
                      style={{ fontVariationSettings: selectedRole === role.id ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {role.icon}
                    </span>
                    <span
                      className={`text-[10px] font-headline font-black uppercase tracking-widest ${
                        selectedRole === role.id ? 'text-white' : 'text-stone-600 group-hover:text-stone-400'
                      }`}
                    >
                      {role.id}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="flex min-h-0 flex-col gap-5">
            <section className="rounded-[2rem] border border-white/5 bg-stone-950/35 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-headline font-black uppercase tracking-[0.3em] text-stone-600 italic">
                    Onay Sonrasi Regear Tutari
                  </p>
                  <p className="mt-2 text-2xl font-headline font-black italic text-secondary">
                    {formatCurrency(selectedPayout)} Silver
                  </p>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <p>{selectedContentEntry ? selectedContentEntry.title : 'Content secilmedi'}</p>
                  <p>{selectedRole || 'Rol secilmedi'}</p>
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col rounded-[2rem] border border-white/5 bg-stone-950/35 p-5 shadow-2xl backdrop-blur-xl">
              <label className="mb-3 ml-1 block text-[10px] font-headline font-black uppercase tracking-[0.3em] text-stone-600 italic">
                Olum Screenshot
              </label>
              <div className="group relative flex min-h-0 flex-1">
                {screenshot ? (
                  <div className="relative flex h-full min-h-[240px] w-full items-center justify-center rounded-3xl border-2 border-dashed border-secondary bg-stone-950/40 p-4 shadow-2xl">
                    <img src={screenshot} alt="Preview" className="max-h-full w-full rounded-xl object-contain" />
                    <button
                      type="button"
                      onClick={() => setScreenshot('')}
                      disabled={isSubmitting}
                      className="absolute right-4 top-4 rounded-xl border border-red-900/40 bg-red-950/80 px-4 py-2 text-[9px] font-headline font-black uppercase tracking-[0.2em] text-white shadow-2xl backdrop-blur-md transition-all hover:bg-red-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Temizle
                    </button>
                  </div>
                ) : (
                  <label className="block w-full cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleUpload}
                      accept="image/*"
                      disabled={isUploading || isSubmitting}
                    />
                    <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-stone-950/20 shadow-inner transition-all group-active:scale-[0.99] hover:bg-stone-950/40 group-hover:border-secondary/20">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/5 bg-stone-900/40 shadow-xl transition-transform group-hover:scale-110">
                        {isUploading ? (
                          <Loader2 className="animate-spin text-secondary" size={28} />
                        ) : (
                          <span className="material-symbols-outlined text-2xl text-stone-700 transition-colors group-hover:text-secondary">
                            add_photo_alternate
                          </span>
                        )}
                      </div>
                      <p className="text-base font-headline font-black uppercase tracking-[0.25em] text-white italic transition-colors group-hover:text-secondary">
                        {isUploading ? 'YUKLENIYOR...' : 'SCREENSHOT YUKLE'}
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </section>

            <footer className="flex-shrink-0">
              <button
                type="submit"
                disabled={!selectedContent || !selectedRole || !screenshot || isUploading || isSubmitting}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-[1.5rem] border border-red-900/20 bg-red-950/40 py-5 shadow-2xl transition-all hover:bg-red-950/60 disabled:pointer-events-none disabled:opacity-20 active:scale-[0.98]"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                <span className="text-lg font-headline font-black uppercase tracking-[0.3em] text-white italic lg:text-xl">
                  {isSubmitting ? 'GONDERILIYOR...' : 'Regear Gonder'}
                </span>
                {isSubmitting ? (
                  <Loader2 className="animate-spin text-secondary" size={22} />
                ) : (
                  <ChevronRight className="text-secondary transition-transform group-hover:translate-x-1" size={22} />
                )}
              </button>
            </footer>
          </div>
        </form>
      </div>

      <div className="pointer-events-none fixed -bottom-16 -right-16 z-0 select-none opacity-[0.01]">
        <span className="material-symbols-outlined text-[500px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          skull
        </span>
      </div>
    </div>
  );
}
