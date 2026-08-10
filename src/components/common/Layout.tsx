import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Building2,
  Users,
  Coins,
  TicketPercent,
  FileBarChart2,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  Menu,
  X,
  Shuffle,
  Truck,
  ArrowRightLeft,
  ShoppingBag,
  Store,
  DollarSign,
  Wifi,
  WifiOff,
  Download,
  Smartphone,
  Cloud,
  RefreshCw
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    currentUser,
    logout,
    notifications,
    markNotificationRead,
    clearNotifications,
    users,
    login,
    syncQueue,
    triggerSync,
    isSyncing
  } = useApp();
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Mobile-first: start collapsed on desktop / hidden on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // 1. Online/Offline state tracking
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 2. PWA installation prompt capture
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('App successfully installed by user');
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  if (!currentUser) return <>{children}</>;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Quick Switcher to let reviewer test all 3 roles easily
  const triggerRoleSwitch = async (roleName: string) => {
    const targetUser = users.find((u) => u.role === roleName);
    if (targetUser) {
      await login(targetUser.username, 'adminpassword'); // default simulated password
      navigate('/');
    } else {
      // Find any with that role
      const fallbackUser = users.find((u) => u.role === roleName);
      if (fallbackUser) {
        await login(fallbackUser.username, 'depotpassword');
        navigate('/');
      }
    }
  };

  // Configure Sidebar links based on role
  const getSidebarLinks = () => {
    switch (currentUser.role) {
      case 'Super Admin':
        return [
          { label: 'Dashboard', path: '/', icon: LayoutDashboard },
          { label: 'Product Master', path: '/products', icon: Package },
          { label: 'Depot Master', path: '/depots', icon: Warehouse },
          { label: 'Sales Office Master', path: '/sales-offices', icon: Building2 },
          { label: 'User Master', path: '/users', icon: Users },
          { label: 'Price List Master', path: '/price-list', icon: Coins },
          { label: 'Scheme List Master', path: '/scheme-list', icon: TicketPercent },
          { label: 'Line Sale Master', path: '/line-sale-master', icon: Store },
          { label: 'Reports', path: '/reports', icon: FileBarChart2 },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];
      case 'Depot Person':
        return [
          { label: 'Depot Dashboard', path: '/', icon: LayoutDashboard },
          { label: 'Goods Issue', path: '/goods-issue', icon: Truck },
          { label: 'Goods Return', path: '/goods-return', icon: ArrowRightLeft },
          { label: 'Reports & Audits', path: '/reports', icon: FileBarChart2 },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];
      case 'Sales Officer':
        return [
          { label: 'Officer Dashboard', path: '/', icon: LayoutDashboard },
          { label: 'Sales Entry Form', path: '/sales-entry', icon: ShoppingBag },
          { label: 'Price & Schemes', path: '/prices-schemes', icon: TicketPercent },
          { label: 'Store Accounts', path: '/sales-offices', icon: Store },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];
      default:
        return [];
    }
  };

  // Mobile Bottom Navigation Links (thumb-reachable primary targets)
  const getBottomNavLinks = () => {
    switch (currentUser.role) {
      case 'Super Admin':
        return [
          { label: 'Home', path: '/', icon: LayoutDashboard },
          { label: 'Products', path: '/products', icon: Package },
          { label: 'Users', path: '/users', icon: Users },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];
      case 'Depot Person':
        return [
          { label: 'Home', path: '/', icon: LayoutDashboard },
          { label: 'Issue', path: '/goods-issue', icon: Truck },
          { label: 'Return', path: '/goods-return', icon: ArrowRightLeft },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];
      case 'Sales Officer':
        return [
          { label: 'Home', path: '/', icon: LayoutDashboard },
          { label: 'Sales Entry', path: '/sales-entry', icon: ShoppingBag },
          { label: 'Offers', path: '/prices-schemes', icon: TicketPercent },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];
      default:
        return [];
    }
  };

  const menuItems = getSidebarLinks();
  const bottomMenuItems = getBottomNavLinks();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex" id="app-layout">
      {/* Mobile Sidebar backdrop overlay for smooth dismiss */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden"
            id="sidebar-mobile-backdrop"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <aside
        id="desktop-sidebar"
        className={`bg-slate-900 text-slate-300 fixed md:static inset-y-0 left-0 z-45 w-64 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-20'
        } md:translate-x-0 transition-all duration-300 ease-in-out flex flex-col border-r border-slate-800 shadow-xl`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/60 justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-display font-bold text-lg shadow-md shadow-brand-500/20">
              LS
            </div>
            {isSidebarOpen && (
              <span className="font-display font-bold tracking-tight text-white text-base">
                LIVE SALE <span className="text-brand-400">ERP</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            id="toggle-sidebar"
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* User Identity Banner */}
        <div className="p-4 border-b border-slate-800/40 bg-slate-950/20">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/20">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm uppercase">
                {currentUser.employeeName.substring(0, 2)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{currentUser.employeeName}</p>
                <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-400 border border-brand-500/30 uppercase tracking-wider mt-1">
                  {currentUser.role}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm uppercase">
                {currentUser.employeeName.substring(0, 2)}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                id={`sidebar-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/40 bg-slate-950/20">
          <button
            onClick={handleLogout}
            id="sidebar-logout"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0" id="main-content-panel">
        {/* Navigation Navbar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-sm shadow-slate-100/40">
          {/* Left: Mobile Sidebar toggle, connection status, and title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              id="mobile-sidebar-toggle"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-slate-800 text-sm md:text-base tracking-tight hidden sm:block">
                Live Sale ERP
              </h2>
              
              {/* Connection Status Badge */}
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                isOnline 
                  ? 'bg-emerald-50/80 text-emerald-700 border-emerald-100' 
                  : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{isOnline ? 'ONLINE' : 'OFFLINE MODE'}</span>
              </div>

              {/* Cloud Sync Queue Indicator */}
              {syncQueue.length > 0 && (
                <button
                  onClick={() => triggerSync()}
                  disabled={isSyncing}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${
                    isSyncing
                      ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 cursor-pointer'
                  }`}
                  id="sync-pwa-header-btn"
                  title="Offline items pending synchronization. Click to sync manually."
                >
                  {isSyncing ? (
                    <RefreshCw className="h-2.5 w-2.5 animate-spin text-blue-600" />
                  ) : (
                    <Cloud className="h-2.5 w-2.5 text-indigo-500" />
                  )}
                  <span>
                    {isSyncing ? 'SYNCING...' : `${syncQueue.length} PENDING SYNC`}
                  </span>
                </button>
              )}

              {/* PWA Install Button */}
              {showInstallBtn && (
                <button
                  onClick={handleInstallApp}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-xs transition-colors"
                  id="install-pwa-header-btn"
                >
                  <Download className="h-3 w-3" />
                  <span className="hidden xs:inline">INSTALL APP</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Quick Role-Switcher, Notifications, Profile Dropdown */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Live Role Switcher (Highly responsive demo tool) */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
                <Shuffle className="h-3 w-3" /> DEMO ROLE:
              </span>
              {(['Super Admin', 'Depot Person', 'Sales Officer'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => triggerRoleSwitch(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    currentUser.role === r
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                id="navbar-notification-bell"
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-50 relative border border-slate-100"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Box */}
              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-4"
                      id="notifications-dropdown"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <span className="font-display font-semibold text-slate-800 text-sm">Notifications</span>
                        <button
                          onClick={clearNotifications}
                          className="text-[11px] font-semibold text-brand-600 hover:underline"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No recent notifications</p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => markNotificationRead(n.id)}
                              className={`p-2 rounded-lg transition-colors cursor-pointer text-xs ${
                                n.read ? 'bg-white' : 'bg-brand-50/50 hover:bg-brand-50'
                              } border-l-4 ${
                                n.type === 'success'
                                  ? 'border-emerald-500'
                                  : n.type === 'warning'
                                  ? 'border-amber-500'
                                  : 'border-brand-500'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <p className="font-semibold text-slate-800">{n.title}</p>
                                <span className="text-[10px] text-slate-400">{n.time}</span>
                              </div>
                              <p className="text-slate-500 mt-1">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                id="navbar-profile-trigger"
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm uppercase">
                  {currentUser.employeeName.substring(0, 2)}
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-2"
                      id="profile-dropdown-box"
                    >
                      <div className="px-4 py-2 border-b border-slate-50">
                        <p className="text-sm font-semibold text-slate-800">{currentUser.employeeName}</p>
                        <p className="text-xs text-slate-400 truncate">{currentUser.username}</p>
                      </div>

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" /> Account Settings
                      </button>

                      <div className="h-[1px] bg-slate-100 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" /> Log Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content - pb-20 on mobile prevents content hiding behind bottom nav */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8" id="main-content-route-target">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile Bottom Navigation (Fixed bottom, only visible on small viewports) */}
        <nav
          className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-150 md:hidden flex items-center justify-around px-2 z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]"
          id="mobile-bottom-navigation"
        >
          {bottomMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                id={`bottom-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                  isActive ? 'text-brand-600 font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                <Icon className={`h-5 w-5 mb-0.5 ${isActive ? 'text-brand-600 scale-105' : 'text-slate-400'} transition-transform`} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Layout;
