import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { DISCORD_CLIENT_ID } from '../authConfig';
import { SITE_NAME } from '../appConfig';
const REDIRECT_URI = encodeURIComponent(window.location.origin);
const PKCE_VERIFIER_KEY = 'discord_pkce_verifier';
const OAUTH_STATE_KEY = 'discord_oauth_state';

const base64UrlEncode = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const randomString = (length = 64) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
};

const createCodeChallenge = async (verifier) => {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
};

export function Login() {
  const { login } = useStore();
  const [loading, setLoading] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('code'),
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code) {
      const expectedState = window.sessionStorage.getItem(OAUTH_STATE_KEY);
      const codeVerifier = window.sessionStorage.getItem(PKCE_VERIFIER_KEY);

      if (!state || !expectedState || state !== expectedState || !codeVerifier) {
        window.setTimeout(() => {
          setError('Guvenlik dogrulamasi basarisiz oldu. Lutfen tekrar giris yap.');
          setLoading(false);
        }, 0);
        return;
      }

      fetch('/api/discord-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri: window.location.origin,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload?.error || 'Discord giris dogrulamasi tamamlanamadi.');
          }
          return res.json();
        })
        .then(({ token, user }) => {
          window.sessionStorage.removeItem(PKCE_VERIFIER_KEY);
          window.sessionStorage.removeItem(OAUTH_STATE_KEY);
          window.history.replaceState(null, '', window.location.pathname);
          login(user, token);
        })
        .catch((exchangeError) => {
          window.sessionStorage.removeItem(PKCE_VERIFIER_KEY);
          window.sessionStorage.removeItem(OAUTH_STATE_KEY);
          window.history.replaceState(null, '', window.location.pathname);
          setError(exchangeError.message || 'Giris basarisiz oldu. Lutfen tekrar dene.');
          setLoading(false);
        });
    }
  }, [login]);

  const handleDiscordLogin = async () => {
    const verifier = randomString(96);
    const state = randomString(32);
    const challenge = await createCodeChallenge(verifier);

    window.sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    window.sessionStorage.setItem(OAUTH_STATE_KEY, state);

    const OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds.members.read&code_challenge_method=S256&code_challenge=${challenge}&state=${state}`;
    window.location.href = OAUTH_URL;
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f7f4ee] font-body text-stone-900 selection:bg-amber-200/70">
      
      {/* Lightweight background layer */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.45),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_34%),radial-gradient(circle_at_left,rgba(239,68,68,0.12),transparent_26%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,238,228,0.96))]"></div>
      </div>

      {/* Main Content: Login Hero */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-20 px-6 animate-fade-in">
        
        <div className="max-w-md w-full relative">
          
          {/* Main Terminal Card - NOW SOLID */}
          <div className="relative flex flex-col items-center overflow-hidden rounded-[2.5rem] border border-stone-200/90 border-l-4 border-l-amber-500 bg-white/90 p-10 shadow-[0_32px_90px_rgba(120,113,108,0.18)] backdrop-blur-xl md:p-14">
            
            <div className="relative z-10 text-center flex flex-col items-center w-full">
              {/* Logo - Fixed Proportions */}
              <div className="w-48 h-48 mb-10 flex items-center justify-center">
                <img 
                  src="/brand-logo.png" 
                  alt={`${SITE_NAME} Logo`}
                  className="max-w-full max-h-full object-contain drop-shadow-[0_10px_24px_rgba(146,64,14,0.18)] brightness-105" 
                />
              </div>
              
              {error && (
                <div className="mb-8 flex w-full items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[10px] font-black uppercase tracking-widest text-red-600">
                  <span className="material-symbols-outlined text-sm">report</span>
                  {error}
                </div>
              )}

              <div className="space-y-10 w-full">
                <button 
                  onClick={handleDiscordLogin}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-4 rounded-2xl border-b-4 border-[#3847c7] bg-[#5865F2] py-5 font-headline text-lg font-black tracking-[0.12em] text-white shadow-[0_18px_40px_rgba(88,101,242,0.28)] transition-all hover:scale-[1.02] hover:bg-[#4752C4] disabled:opacity-50 active:scale-95 md:text-xl"
                >
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
                  <span className="whitespace-nowrap">{loading ? 'DOGRULANIYOR...' : 'DISCORD ILE GIRIS YAP'}</span>
                </button>

                <div className="flex items-center justify-center gap-3 border-t border-stone-200 pt-6 text-[9px] font-black uppercase tracking-[0.4em] text-stone-500">
                  <span className="material-symbols-outlined text-xs">verified_user</span>
                  SADECE YETKILI UYELER
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

  );
}
