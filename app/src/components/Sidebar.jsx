import { useStore } from '../store';
import { TAB_PERMISSIONS } from '../roles';
import { FEATURES } from '../features';
import { GUILD_NAME, SHOP_NAME, SITE_NAME } from '../appConfig';
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Landmark,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Trophy,
} from 'lucide-react';

const navItems = [
  { id: 'Dashboard', icon: LayoutDashboard, label: { tr: 'Anasayfa', en: 'Dashboard' } },
  { id: 'Bank', icon: Landmark, label: { tr: 'Bakiye', en: 'Balance' } },
  { id: 'Split', icon: ReceiptText, label: { tr: 'Loot Split', en: 'Loot Split' } },
  { id: 'Withdraw', icon: ArrowRightLeft, label: { tr: 'Para Cekim/Gonderim', en: 'Withdraw/Send' } },
  { id: 'Approvals', icon: ShieldCheck, label: { tr: 'Split Onaylari', en: 'Split Approvals' } },
  { id: 'Regear', icon: Send, label: { tr: 'Regear Gonder', en: 'Submit Regear' } },
  { id: 'RegearApprovals', icon: ShieldCheck, label: { tr: 'Regear Yonetimi', en: 'Regear Management' } },
  { id: 'WithdrawalApprovals', icon: ShieldCheck, label: { tr: 'Para Cekim Yonetimi', en: 'Withdrawal Management' } },
  { id: 'BattlePass', icon: Trophy, label: { tr: 'Battle Pass', en: 'Battle Pass' }, feature: 'battlePass' },
  { id: 'BattlePassAdmin', icon: ShieldCheck, label: { tr: 'Battle Pass Yonetimi', en: 'Battle Pass Admin' }, feature: 'battlePass' },
  { id: 'Shop', icon: ShoppingCart, label: { tr: SHOP_NAME, en: SHOP_NAME }, feature: 'shop' },
  { id: 'ShopOrders', icon: ShieldCheck, label: { tr: 'Siparis Yonetimi', en: 'Shop Orders' }, feature: 'shop' },
  { id: 'Analytics', icon: BarChart3, label: { tr: 'Analiz', en: 'Analytics' } },
  { id: 'Activity', icon: Activity, label: { tr: 'Aktivite', en: 'Activity' } },
  { id: 'History', icon: ScrollText, label: { tr: 'Gecmis', en: 'History' } },
  { id: 'Settings', icon: Settings, label: { tr: 'Ayarlar', en: 'Settings' } },
];

const roleLabels = {
  tr: {
    admin: 'Yonetici',
    chief: 'Yetkili',
    member: 'Uye',
    logout: 'Cikis Yap',
  },
  en: {
    admin: 'Admin',
    chief: 'Chief',
    member: 'Member',
    logout: 'Log Out',
  },
};

const getVisibleNavItems = (userRole) =>
  navItems.filter((item) => {
    if (item.feature && !FEATURES[item.feature]) return false;

    const allowedRoles = TAB_PERMISSIONS[item.id] || [];
    return allowedRoles.includes(userRole);
  });

const isManagementItem = (itemId) => {
  const allowedRoles = TAB_PERMISSIONS[itemId] || [];
  return !allowedRoles.includes('member');
};

export function Sidebar({ language = 'tr' }) {
  const { activeTab, setActiveTab, user, logout } = useStore();
  const userRole = user?.role || 'member';
  const activeLabels = roleLabels[language] || roleLabels.tr;
  const visibleNavItems = getVisibleNavItems(userRole);
  const primaryNavItems = visibleNavItems.filter((item) => !isManagementItem(item.id));
  const managementNavItems = visibleNavItems.filter((item) => isManagementItem(item.id));
  const activeGuildName = user?.guild_name || GUILD_NAME;

  const renderNavButton = (item) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`flex w-full items-center gap-4 rounded-lg border border-transparent px-4 py-3 font-headline text-xs font-bold uppercase tracking-tighter transition-all ${
          isActive
            ? 'border-red-900/30 border-l-2 border-l-secondary bg-red-900/20 text-red-500'
            : 'text-stone-500 hover:bg-white/5 hover:text-stone-200'
        }`}
      >
        <Icon size={18} className={isActive ? 'text-red-500' : 'text-stone-500'} />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-left">
          {item.label[language] || item.label.tr}
        </span>
      </button>
    );
  };

  return (
    <aside className="z-50 flex h-screen w-64 flex-shrink-0 flex-col border-r border-white/5 bg-stone-950/80 py-6 shadow-2xl">
      <div className="mb-10 px-6">
        <div className="flex items-center justify-center">
          <div className="flex h-16 w-full max-w-[220px] items-center justify-center">
            <img
              src="/brand-logo.png"
              alt={`${SITE_NAME} logo`}
              className="sidebar-brand-logo h-full w-full object-contain object-center"
            />
          </div>
        </div>
      </div>

      <nav className="custom-scrollbar flex-1 overflow-y-auto px-4">
        <div className="space-y-2">
          {primaryNavItems.map(renderNavButton)}
        </div>

        {managementNavItems.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-500">
                {language === 'en' ? 'Management' : 'Yonetim Sekmeleri'}
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-2">
              {managementNavItems.map(renderNavButton)}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto border-t border-white/5 px-6 pt-6">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          {user?.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
              alt="Avatar"
              className="h-8 w-8 rounded-lg"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-900/20 font-bold text-red-500">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-xs font-bold text-white">{user?.global_name || user?.username}</p>
            <p className="truncate text-[10px] uppercase text-stone-500">{activeGuildName}</p>
          </div>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-900/20 bg-red-950/20 text-red-500 transition-all hover:bg-red-950/40 hover:text-red-400"
            title={activeLabels.logout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
