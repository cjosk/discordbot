import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ChevronDown, MoonStar, SunMedium } from 'lucide-react';

import { AccountLinkModal } from './components/AccountLinkModal';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { SHOP_NAME, SITE_NAME } from './appConfig';
import { FEATURES } from './features';
import { useStore } from './store';

const lazyNamed = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));

const Dashboard = lazyNamed(() => import('./components/Dashboard'), 'Dashboard');
const Bank = lazyNamed(() => import('./components/BankTable'), 'BankTable');
const SplitCalculator = lazyNamed(() => import('./components/SplitCalculator'), 'SplitCalculator');
const SplitApprovals = lazyNamed(() => import('./components/SplitApprovals'), 'SplitApprovals');
const WithdrawalRequest = lazyNamed(() => import('./components/WithdrawalRequest'), 'WithdrawalRequest');
const WithdrawalAdmin = lazyNamed(() => import('./components/WithdrawalAdmin'), 'WithdrawalAdmin');
const ActivityLog = lazyNamed(() => import('./components/ActivityLog'), 'ActivityLog');
const HistoryView = lazyNamed(() => import('./components/HistoryView'), 'HistoryView');
const Settings = lazyNamed(() => import('./components/Settings'), 'Settings');
const RegearSubmit = lazyNamed(() => import('./components/RegearSubmit'), 'RegearSubmit');
const RegearAdmin = lazyNamed(() => import('./components/RegearAdmin'), 'RegearAdmin');
const GuildAnalytics = lazyNamed(() => import('./components/GuildAnalytics'), 'GuildAnalytics');
const BattlePassView = lazyNamed(() => import('./components/BattlePassView'), 'BattlePassView');
const BattlePassAdmin = lazyNamed(() => import('./components/BattlePassAdmin'), 'BattlePassAdmin');
const Shop = lazyNamed(() => import('./components/Shop'), 'Shop');
const ShopAdmin = lazyNamed(() => import('./components/ShopAdmin'), 'ShopAdmin');

const LANGUAGE_STORAGE_KEY = 'sb_language';
const THEME_STORAGE_KEY = 'sb_theme';

const languageOptions = [
  { value: 'tr', label: 'Turkce', countryCode: 'tr' },
  { value: 'en', label: 'English', countryCode: 'gb' },
];

const headerTitleMap = {
  tr: {
    Dashboard: 'Anasayfa',
    Bank: 'Bakiye',
    Split: 'Loot Split',
    Withdraw: 'Para Cekim/Gonderim',
    Approvals: 'Split Onaylari',
    Regear: 'Regear Gonder',
    RegearApprovals: 'Regear Yonetimi',
    WithdrawalApprovals: 'Para Cekim Yonetimi',
    BattlePass: 'Battle Pass',
    BattlePassAdmin: 'Battle Pass Yonetimi',
    Shop: SHOP_NAME,
    ShopOrders: 'Siparis Yonetimi',
    Analytics: 'Analiz',
    Activity: 'Aktivite',
    History: 'Gecmis',
    Settings: 'Ayarlar',
  },
  en: {
    Dashboard: 'Dashboard',
    Bank: 'Bank',
    Split: 'Loot Split',
    Withdraw: 'Withdraw/Send',
    Approvals: 'Split Approvals',
    Regear: 'Submit Regear',
    RegearApprovals: 'Regear Management',
    WithdrawalApprovals: 'Withdrawal Management',
    BattlePass: 'Battle Pass',
    BattlePassAdmin: 'Battle Pass Admin',
    Shop: SHOP_NAME,
    ShopOrders: 'Shop Orders',
    Analytics: 'Analytics',
    Activity: 'Activity',
    History: 'History',
    Settings: 'Settings',
  },
};

const labelMap = {
  tr: {
    liveGold: 'Canli Altin (EU)',
    totalBalance: 'Toplam Bakiye',
  },
  en: {
    liveGold: 'Live Gold (EU)',
    totalBalance: 'Total Balance',
  },
};

const themeLabelMap = {
  tr: {
    light: 'Acik Mod',
    dark: 'Koyu Mod',
  },
  en: {
    light: 'Light Mode',
    dark: 'Dark Mode',
  },
};

const SUPPORTED_TABS = new Set(Object.keys(headerTitleMap.tr));

const EN_UI_REPLACEMENTS = [
  ['Regear Gonder', 'Submit Regear'],
  ['Onaylandiginda sectigin role ait sabit regear tutari otomatik olarak bakiyene eklenir.', 'When approved, the fixed regear amount for the selected role is automatically added to your balance.'],
  ['Content Sec', 'Select Content'],
  ['regear content sec', 'select regear content'],
  ['Rol Sec', 'Select Role'],
  ['Onay Sonrasi Regear Tutari', 'Approved Regear Amount'],
  ['Content secilmedi', 'No content selected'],
  ['Rol secilmedi', 'No role selected'],
  ['Olum Screenshot', 'Death Screenshot'],
  ['Temizle', 'Clear'],
  ['YUKLENIYOR...', 'UPLOADING...'],
  ['SCREENSHOT YUKLE', 'UPLOAD SCREENSHOT'],
  ['Regear Yönetimi', 'Regear Management'],
  ['Regear YÃ¶netimi', 'Regear Management'],
  ['Content Bazlı Regear Kontrolü', 'Content-Based Regear Control'],
  ['Content BazlÄ± Regear KontrolÃ¼', 'Content-Based Regear Control'],
  ['Content bazlı talepleri yönet, role göre sabit regear tutarı belirle ve onay sırasında ödemeyi otomatik olarak oyuncu bakiyesine işle.', 'Manage content-based requests, set fixed regear amounts by role, and automatically apply payouts to player balances during approval.'],
  ['Content bazlÄ± talepleri yÃ¶net, role gÃ¶re sabit regear tutarÄ± belirle ve onay sÄ±rasÄ±nda Ã¶demeyi otomatik olarak oyuncu bakiyesine iÅŸle.', 'Manage content-based requests, set fixed regear amounts by role, and automatically apply payouts to player balances during approval.'],
  ['Yeni content başlığı', 'New content title'],
  ['Yeni content baÅŸlÄ±ÄŸÄ±', 'New content title'],
  ['Ekle', 'Add'],
  ['Contentler', 'Contents'],
  ['adet', 'items'],
  ['bekleyen', 'pending'],
  ['sonuç', 'resolved'],
  ['sonuÃ§', 'resolved'],
  ['Henüz aktif content yok.', 'There is no active content yet.'],
  ['HenÃ¼z aktif content yok.', 'There is no active content yet.'],
  ['Regear Tutarları', 'Regear Amounts'],
  ['Regear TutarlarÄ±', 'Regear Amounts'],
  ['Seçili Content', 'Selected Content'],
  ['SeÃ§ili Content', 'Selected Content'],
  ['Content seç', 'Select content'],
  ['Content seÃ§', 'Select content'],
  ['Bekleyen Talepler', 'Pending Requests'],
  ['Sol taraftan bir content seç.', 'Select a content from the left.'],
  ['Sol taraftan bir content seÃ§.', 'Select a content from the left.'],
  ['Bu content için bekleyen regear yok.', 'There are no pending regear requests for this content.'],
  ['Bu content iÃ§in bekleyen regear yok.', 'There are no pending regear requests for this content.'],
  ['Rol Tutarı', 'Role Amount'],
  ['Rol TutarÄ±', 'Role Amount'],
  ['Gönderim', 'Submitted At'],
  ['GÃ¶nderim', 'Submitted At'],
  ['Screenshot', 'Screenshot'],
  ['Görüntüyü aç', 'Open image'],
  ['GÃ¶rÃ¼ntÃ¼yÃ¼ aÃ§', 'Open image'],
  ['Onayla', 'Approve'],
  ['Reddet', 'Reject'],
  ['Sonuçlananlar', 'Resolved'],
  ['SonuÃ§lananlar', 'Resolved'],
  ['Bu content için sonuç kaydı yok.', 'There are no resolved records for this content.'],
  ['Bu content iÃ§in sonuÃ§ kaydÄ± yok.', 'There are no resolved records for this content.'],
  ['Onaylandı', 'Approved'],
  ['OnaylandÄ±', 'Approved'],
  ['Reddedildi', 'Rejected'],
  ['Guild Sipariş Merkezi', 'Guild Order Center'],
  ['Guild SipariÅŸ Merkezi', 'Guild Order Center'],
  ['İhtiyacın olan itemleri ara, sepete ekle ve tek sipariş olarak gönder. Hazır olduğunda shop kanalından teslim bilgisi alacaksın.', 'Search the items you need, add them to cart, and submit them as a single order. When ready, you will receive delivery details from the shop channel.'],
  ['Ä°htiyacÄ±n olan itemleri ara, sepete ekle ve tek sipariÅŸ olarak gÃ¶nder. HazÄ±r olduÄŸunda shop kanalÄ±ndan teslim bilgisi alacaksÄ±n.', 'Search the items you need, add them to cart, and submit them as a single order. When ready, you will receive delivery details from the shop channel.'],
  ['Shop siparişi göndermek için önce oyun içi karakterini Discord hesabına bağlaman gerekiyor.', 'You need to link your in-game character to your Discord account before submitting a shop order.'],
  ['Shop sipariÅŸi gÃ¶ndermek iÃ§in Ã¶nce oyun iÃ§i karakterini Discord hesabÄ±na baÄŸlaman gerekiyor.', 'You need to link your in-game character to your Discord account before submitting a shop order.'],
  ['Albion Item Arama', 'Albion Item Search'],
  ['Örn: carving, soldier armor, bag, cape, T8', 'Ex: carving, soldier armor, bag, cape, T8'],
  ['Ã–rn: carving, soldier armor, bag, cape, T8', 'Ex: carving, soldier armor, bag, cape, T8'],
  ['Itemler aranıyor...', 'Searching items...'],
  ['Itemler aranÄ±yor...', 'Searching items...'],
  ['Sepete Ekle', 'Add to Cart'],
  ['Sonuç bulunamadı.', 'No results found.'],
  ['SonuÃ§ bulunamadÄ±.', 'No results found.'],
  ['Sipariş Sepeti', 'Order Cart'],
  ['SipariÅŸ Sepeti', 'Order Cart'],
  ['Adet', 'Quantity'],
  ['Sepetin şu an boş.', 'Your cart is currently empty.'],
  ['Sepetin ÅŸu an boÅŸ.', 'Your cart is currently empty.'],
  ['Sipariş Gönderiliyor...', 'Submitting Order...'],
  ['SipariÅŸ GÃ¶nderiliyor...', 'Submitting Order...'],
  ['Sepeti Onayla', 'Confirm Cart'],
  ['Karakter', 'Character'],
  ['Bağlı değil', 'Not linked'],
  ['BaÄŸlÄ± deÄŸil', 'Not linked'],
  ['Sipariş Geçmişim', 'My Order History'],
  ['SipariÅŸ GeÃ§miÅŸim', 'My Order History'],
  ['Chest:', 'Chest:'],
  ['Konum:', 'Location:'],
  ['Henüz gönderilmiş shop siparişin yok.', 'You have not submitted a shop order yet.'],
  ['HenÃ¼z gÃ¶nderilmiÅŸ shop sipariÅŸin yok.', 'You have not submitted a shop order yet.'],
  ['Sipariş Yönetimi', 'Order Management'],
  ['SipariÅŸ YÃ¶netimi', 'Order Management'],
  ['Siparişleri hazırla, chest teslim bilgisini gir ve onayladığında shop kanalına otomatik bildirim gönder.', 'Prepare orders, enter chest delivery details, and automatically send a notification to the shop channel when approved.'],
  ['SipariÅŸleri hazÄ±rla, chest teslim bilgisini gir ve onayladÄ±ÄŸÄ±nda shop kanalÄ±na otomatik bildirim gÃ¶nder.', 'Prepare orders, enter chest delivery details, and automatically send a notification to the shop channel when approved.'],
  ['Bekleyen Siparişler', 'Pending Orders'],
  ['Bekleyen SipariÅŸler', 'Pending Orders'],
  ['Karakter:', 'Character:'],
  ['Bekliyor', 'Pending'],
  ['Chest yeri / island chest adı', 'Chest location / island chest name'],
  ['Chest yeri / island chest adÄ±', 'Chest location / island chest name'],
  ['Konum / teslim notu', 'Location / delivery note'],
  ['Reddetmek için sebep gir', 'Enter a reason for rejection'],
  ['Reddetmek iÃ§in sebep gir', 'Enter a reason for rejection'],
  ['Onaylanıyor...', 'Approving...'],
  ['OnaylanÄ±yor...', 'Approving...'],
  ['Hazır Olarak Onayla', 'Approve As Ready'],
  ['HazÄ±r Olarak Onayla', 'Approve As Ready'],
  ['Reddediliyor...', 'Rejecting...'],
  ['Bekleyen shop siparişi yok.', 'There are no pending shop orders.'],
  ['Bekleyen shop sipariÅŸi yok.', 'There are no pending shop orders.'],
  ['Sonuçlanan Siparişler', 'Resolved Orders'],
  ['SonuÃ§lanan SipariÅŸler', 'Resolved Orders'],
  ['Hazırlandı', 'Prepared'],
  ['HazÄ±rlandÄ±', 'Prepared'],
  ['Henüz sonuçlanan shop siparişi yok.', 'There are no resolved shop orders yet.'],
  ['HenÃ¼z sonuÃ§lanan shop sipariÅŸi yok.', 'There are no resolved shop orders yet.'],
  ['Sistem Ayarlari', 'System Settings'],
  ['Yonetim erisim seviyesi:', 'Management access level:'],
  ['Kullanici Profili', 'User Profile'],
  ['Discord baglantili yetkilendirme', 'Discord-linked authorization'],
  ['Global isim', 'Global name'],
  ['Aktif Konfig', 'Active Config'],
  ['Site ve guild baglantilari', 'Site and guild connections'],
  ['Site adi', 'Site name'],
  ['Guild etiketi', 'Guild tag'],
  ['Shop adi', 'Shop name'],
  ['Battle pass adi', 'Battle pass name'],
  ['Albion guild id', 'Albion guild id'],
  ['Discord guild id', 'Discord guild id'],
  ['Discord uye rol id', 'Discord member role id'],
  ['Sunucu konfigu yukleniyor...', 'Loading server config...'],
  ['Kalici site isimleri ve guild id degerleri Vercel env uzerinden yonetilir. Buradaki reset ve sync islemleri aktif sunucu konfigunu kullanir; istersen asagida gecici guild id override girebilirsin.', 'Persistent site names and guild ids are managed via Vercel env values. Reset and sync actions here use the active server config; you can optionally enter a temporary guild id override below.'],
  ['Guild Gecis Araclari', 'Guild Transition Tools'],
  ['Sync veya tum veriyi sifirlayip yeniden kur', 'Run sync or reset all data and rebuild'],
  ['Guild id gir veya bos birak', 'Enter guild id or leave empty'],
  ['Bos birakirsan aktif env icindeki guild id kullanilir. Sadece sync mevcut oyunculari korur; reset+sync oyuncular, bakiyeler, split gecmisi, regear, battle pass, shop ve Discord eslesmelerini temizler.', 'If left blank, the active guild id from env is used. Sync only preserves current players; reset + sync clears players, balances, split history, regear, battle pass, shop, and Discord mappings.'],
  ['Sync Calisiyor...', 'Sync Running...'],
  ['Sadece Sync Calistir', 'Run Sync Only'],
  ['Manuel Oyuncu Ekle', 'Add Manual Player'],
  ['Guilde yeni giren biri killboarda gec dusuyorsa nickname ile rostera ekle. Sonraki sync ayni nicki resmi oyuncuya tasir.', 'If a new guild member appears late on the killboard, add them to the roster by nickname. The next sync will merge the same nickname into the official player automatically.'],
  ['Oyuncu nickname', 'Player nickname'],
  ['Ekleniyor...', 'Adding...'],
  ['Nickname Ekle', 'Add Nickname'],
  ['Destructive Islem', 'Destructive Action'],
  ['Bu aksiyon tum oyuncu verilerini ve tum operasyon gecmisini siler. Ardindan secilen guild rosteri sifirdan import edilir.', 'This action deletes all player data and the full operation history. Then the selected guild roster is imported from scratch.'],
  ['Onay metni', 'Confirmation text'],
  ['Reset ve Sync Calisiyor...', 'Reset and Sync Running...'],
  ['Tum Veriyi Sifirla ve Guildi Yeniden Kur', 'Reset All Data and Rebuild Guild'],
];

const replaceUiText = (value, replacements) => {
  let nextValue = value;

  for (const [source, target] of replacements) {
    if (nextValue.includes(source)) {
      nextValue = nextValue.split(source).join(target);
    }
  }

  return nextValue;
};

const applyUiTranslations = (root, replacements) => {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const original = node.textContent || '';
    const translated = replaceUiText(original, replacements);
    if (translated !== original) {
      node.textContent = translated;
    }
    node = walker.nextNode();
  }

  root.querySelectorAll('[placeholder],[title]').forEach((element) => {
    ['placeholder', 'title'].forEach((attribute) => {
      const original = element.getAttribute(attribute);
      if (!original) return;
      const translated = replaceUiText(original, replacements);
      if (translated !== original) {
        element.setAttribute(attribute, translated);
      }
    });
  });
};

const ContentFallback = () => (
  <div className="rounded-[2rem] border border-white/5 bg-stone-950/40 p-8 text-sm text-stone-500 shadow-2xl backdrop-blur-xl">
    Sayfa yukleniyor...
  </div>
);

function App() {
  const {
    activeTab,
    setActiveTab,
    user,
    token,
    fetchPlayers,
    fetchDiscordLinks,
    fetchPendingSplits,
    fetchRegearContents,
    fetchRegearAmounts,
    fetchRegearSubmissions,
    fetchWithdrawalRequests,
    fetchShopOrders,
    fetchBattlePass,
    players,
    discordLinks,
  } = useStore();

  const [goldPrice, setGoldPrice] = useState(0);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'tr';
    return window.sessionStorage.getItem(LANGUAGE_STORAGE_KEY) || 'tr';
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  });
  const languageMenuRef = useRef(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = SITE_NAME;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');

    if (tab && SUPPORTED_TABS.has(tab)) {
      setActiveTab(tab);
    }
  }, [setActiveTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);

    if (activeTab && activeTab !== 'Dashboard') {
      url.searchParams.set('tab', activeTab);
    } else {
      url.searchParams.delete('tab');
    }

    window.history.replaceState({}, '', url);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!languageMenuRef.current?.contains(event.target)) {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof document === 'undefined' || language !== 'en') return undefined;

    const root = document.querySelector('main');
    if (!root) return undefined;

    applyUiTranslations(root, EN_UI_REPLACEMENTS);

    const observer = new MutationObserver(() => {
      applyUiTranslations(root, EN_UI_REPLACEMENTS);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title'],
    });

    return () => observer.disconnect();
  }, [activeTab, language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(nextTheme === 'dark' ? 'dark-theme' : 'light-theme');
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;

    fetchPlayers();
    fetchDiscordLinks();
    fetchRegearAmounts();
  }, [user, fetchDiscordLinks, fetchPlayers, fetchRegearAmounts]);

  useEffect(() => {
    if (!user) return;

    switch (activeTab) {
      case 'Dashboard':
        fetchPendingSplits();
        fetchRegearSubmissions();
        break;
      case 'Bank':
      case 'Activity':
        fetchPendingSplits();
        break;
      case 'History':
      case 'Analytics':
        fetchPendingSplits();
        fetchRegearSubmissions();
        break;
      case 'Approvals':
        fetchPendingSplits();
        break;
      case 'Regear':
        fetchRegearContents();
        fetchRegearAmounts();
        break;
      case 'RegearApprovals':
        fetchRegearContents();
        fetchRegearAmounts();
        fetchRegearSubmissions();
        break;
      case 'Withdraw':
      case 'WithdrawalApprovals':
        fetchWithdrawalRequests();
        break;
      case 'Shop':
      case 'ShopOrders':
        fetchShopOrders();
        break;
      case 'BattlePass':
      case 'BattlePassAdmin':
        if (FEATURES.battlePass) {
          fetchBattlePass();
        }
        break;
      default:
        break;
    }
  }, [
    activeTab,
    fetchBattlePass,
    fetchPendingSplits,
    fetchRegearContents,
    fetchRegearAmounts,
    fetchRegearSubmissions,
    fetchShopOrders,
    fetchWithdrawalRequests,
    user,
  ]);

  useEffect(() => {
    if (!user || !token) return undefined;

    const fetchGold = async () => {
      try {
        const res = await fetch('/api/gold-price', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        setGoldPrice(data?.price || 0);
      } catch (error) {
        console.error('Failed to fetch gold price:', error);
      }
    };

    fetchGold();
    const interval = setInterval(fetchGold, 60000);
    return () => clearInterval(interval);
  }, [token, user]);

  if (!user) {
    return <Login />;
  }

  const playerLinkedId = discordLinks[user.id];
  const linkedPlayer = players.find((player) => player.id === playerLinkedId);
  const totalBalance = linkedPlayer ? linkedPlayer.balance : 0;
  const formatCurrency = (value) => new Intl.NumberFormat('tr-TR').format(Math.floor(value || 0));
  const activeLanguage = labelMap[language] || labelMap.tr;
  const activeTitles = headerTitleMap[language] || headerTitleMap.tr;
  const activeThemeLabels = themeLabelMap[language] || themeLabelMap.tr;
  const selectedLanguage =
    languageOptions.find((option) => option.value === language) || languageOptions[0];
  const selectedLanguageFlag = `https://flagicons.lipis.dev/flags/4x3/${selectedLanguage.countryCode}.svg`;
  const isDarkTheme = theme === 'dark';

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard language={language} />;
      case 'Bank':
        return <Bank language={language} />;
      case 'Split':
        return <SplitCalculator language={language} />;
      case 'Withdraw':
        return <WithdrawalRequest language={language} />;
      case 'Approvals':
        return <SplitApprovals language={language} />;
      case 'Regear':
        return <RegearSubmit language={language} />;
      case 'RegearApprovals':
        return <RegearAdmin language={language} />;
      case 'WithdrawalApprovals':
        return <WithdrawalAdmin language={language} />;
      case 'BattlePass':
        return FEATURES.battlePass ? <BattlePassView language={language} /> : <Dashboard language={language} />;
      case 'BattlePassAdmin':
        return FEATURES.battlePass ? <BattlePassAdmin language={language} /> : <Dashboard language={language} />;
      case 'Shop':
        return <Shop language={language} />;
      case 'ShopOrders':
        return <ShopAdmin language={language} />;
      case 'Analytics':
        return <GuildAnalytics language={language} />;
      case 'Activity':
        return <ActivityLog language={language} />;
      case 'History':
        return <HistoryView language={language} />;
      case 'Settings':
        return <Settings language={language} />;
      default:
        return <Dashboard language={language} />;
    }
  };

  const isScrollLocked = ['Split', 'Regear', 'Activity', 'History', 'Withdraw'].includes(activeTab);

  return (
    <div className={`flex h-screen overflow-hidden font-body ${
      isDarkTheme
        ? 'bg-[#111] text-white selection:bg-red-500/30'
        : 'bg-surface text-on-surface selection:bg-secondary/20 selection:text-stone-950'
    }`}>
      <Sidebar language={language} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AccountLinkModal language={language} />
        <header className="z-40 flex h-16 flex-shrink-0 items-center justify-between border-b border-white/5 bg-stone-950/40 px-8 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-xl font-black tracking-tight text-white uppercase italic drop-shadow-lg lg:text-2xl">
              {activeTitles[activeTab] || activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex h-16 items-center gap-10 border-l border-white/5 px-8">
              <div className="group flex items-center gap-3 transition-all">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-900/20 bg-amber-950/30 shadow-lg">
                  <img
                    src="https://assets.albiononline.com/assets/images/shop/category-icons/gold.png?cb=3.5.0"
                    alt="Gold"
                    className="h-6 w-6 object-contain"
                  />
                </div>
                <div className="text-right">
                  <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest leading-none text-stone-600">
                    {activeLanguage.liveGold}
                  </p>
                  <p className="font-headline text-sm font-black text-amber-500 italic drop-shadow-[0_0_10px_rgba(233,195,73,0.3)]">
                    {formatCurrency(goldPrice)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-stone-900 shadow-lg">
                  <img src="/silver.png" alt="Silver" className="h-5 w-5 object-contain" />
                </div>
                <div className="text-right">
                  <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest leading-none text-stone-600">
                    {activeLanguage.totalBalance}
                  </p>
                  <p className="font-headline text-sm font-black text-white italic">
                    {formatCurrency(totalBalance)} Silver
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 border-l border-white/5 pl-8">
              <button
                type="button"
                onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-stone-950/60 px-4 py-2 text-sm font-bold text-white outline-none transition-all hover:border-white/20"
                aria-label={isDarkTheme ? activeThemeLabels.light : activeThemeLabels.dark}
                title={isDarkTheme ? activeThemeLabels.light : activeThemeLabels.dark}
              >
                {isDarkTheme ? <SunMedium size={16} className="text-amber-400" /> : <MoonStar size={16} className="text-stone-500" />}
                <span>{isDarkTheme ? activeThemeLabels.light : activeThemeLabels.dark}</span>
              </button>

              <div className="relative" ref={languageMenuRef}>
                <button
                  type="button"
                  onClick={() => setLanguageMenuOpen((current) => !current)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-stone-950/60 px-4 py-2 text-sm font-bold text-white outline-none transition-all hover:border-white/20"
                  aria-label="Language selector"
                  aria-expanded={languageMenuOpen}
                >
                  <img
                    src={selectedLanguageFlag}
                    alt={selectedLanguage.label}
                    className="h-4 w-6 rounded-[2px] object-cover"
                  />
                  <span>{selectedLanguage.label}</span>
                  <ChevronDown size={14} className="text-stone-400" />
                </button>

                {languageMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 min-w-full overflow-hidden rounded-xl border border-white/10 bg-stone-950/95 shadow-2xl backdrop-blur-xl">
                    {languageOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setLanguage(option.value);
                          setLanguageMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold transition-colors ${
                          option.value === language
                            ? 'bg-white/10 text-white'
                            : 'text-stone-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <img
                          src={`https://flagicons.lipis.dev/flags/4x3/${option.countryCode}.svg`}
                          alt={option.label}
                          className="h-4 w-6 rounded-[2px] object-cover"
                        />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className={`relative flex-1 p-8 lg:p-10 ${isScrollLocked ? 'overflow-hidden' : 'overflow-auto'}`}>
          <Suspense fallback={<ContentFallback />}>
            {renderContent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
