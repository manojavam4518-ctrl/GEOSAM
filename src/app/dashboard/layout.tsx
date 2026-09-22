'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateIndian } from '@/utils/dateUtils';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Scale,
  History,
  CreditCard,
  FileText,
  Smartphone,
  Navigation,
  MapPin,
  User,
  UserCheck,
  LogOut,
  Menu,
  X,
  Loader2,
  Tags,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calculator,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  Calendar,
  DollarSign,
  Lock,
  WalletCards,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Forced Password Change State
  const [curPassword, setCurPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');

  async function handleChangePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwdError('');

    if (!curPassword || !newPassword || !confirmPassword) {
      setPwdError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }

    setPwdSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: curPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setUser((prev: any) => ({ ...prev, mustChangePassword: false }));
    } catch (err: any) {
      setPwdError(err.message || 'An error occurred.');
    } finally {
      setPwdSaving(false);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('sidebarCollapsed');
    if (stored === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    sessionStorage.setItem('sidebarCollapsed', String(nextVal));
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          throw new Error('Not authenticated');
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  const isOrgAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'ADMIN';
  const isOwner = user?.role === 'OWNER';
  const isAdditionalUser = Boolean(user?.isAdditionalUser);
  const assignedModules = user?.assignedModules || [];
  const activeModuleKeys = user?.activeModuleKeys || [];

  const rawMenuGroups = [
    ...(isOrgAdmin
      ? [
          {
            title: 'ORGANIZATION',
            items: [
              { name: 'Employee Directory', path: '/dashboard/employees', icon: Users, moduleKey: 'EMPLOYEE_MANAGEMENT' },
              { name: 'Attendance Register', path: '/dashboard/attendance', icon: Calendar, moduleKey: 'ATTENDANCE' },
              { name: 'Payroll & Salary Slips', path: '/dashboard/payroll', icon: DollarSign, moduleKey: 'PAYROLL' },
              { name: 'User Accounts', path: '/dashboard/users', icon: UserCheck },
            ],
          },
        ]
      : isOwner
      ? [
          {
            title: 'ORGANIZATION',
            items: [
              { name: 'User Accounts', path: '/dashboard/users', icon: UserCheck },
            ],
          },
        ]
      : isAdditionalUser && (assignedModules.includes('EMPLOYEE_MANAGEMENT') || assignedModules.includes('ATTENDANCE') || assignedModules.includes('PAYROLL'))
      ? [
          {
            title: 'ORGANIZATION',
            items: [
              ...(assignedModules.includes('EMPLOYEE_MANAGEMENT')
                ? [{ name: 'Employee Directory', path: '/dashboard/employees', icon: Users, moduleKey: 'EMPLOYEE_MANAGEMENT' }]
                : []),
              ...(assignedModules.includes('ATTENDANCE')
                ? [{ name: 'Attendance Register', path: '/dashboard/attendance', icon: Calendar, moduleKey: 'ATTENDANCE' }]
                : []),
              ...(assignedModules.includes('PAYROLL')
                ? [{ name: 'Payroll & Salary Slips', path: '/dashboard/payroll', icon: DollarSign, moduleKey: 'PAYROLL' }]
                : []),
            ],
          },
        ]
      : []),
    {
      title: 'LOGISTICS',
      items: [
        { name: 'Dashboard Overview', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Weight Calculator', path: '/dashboard/calculator', icon: Scale, moduleKey: 'WEIGHT_CALCULATOR' },
        { name: 'Rate Calculator', path: '/dashboard/rate-calculator', icon: Calculator, moduleKey: 'RATE_CALCULATOR' },
        { name: 'Rate Cards', path: '/dashboard/rate-cards', icon: Tags, moduleKey: 'RATE_CARDS' },
        { name: 'Counter Cash Ledger', path: '/dashboard/cash-ledger', icon: WalletCards, moduleKey: 'COUNTER_CASH_LEDGER' },
        { name: 'Pincode Lookup', path: '/dashboard/pincode-serviceability', icon: MapPin, moduleKey: 'PINCODE_LOOKUP' },
        { name: 'Carrier Tracking', path: '/dashboard/tracking', icon: Navigation, moduleKey: 'CARRIER_TRACKING' },
        { name: 'Calculation History', path: '/dashboard/history', icon: History, moduleKey: 'CALCULATION_HISTORY' },
        { name: 'Sales Follow-Up', path: '/dashboard/sales-follow-up', icon: UserCheck, moduleKey: 'SALES_FOLLOW_UP' },
      ],
    },
    {
      title: 'CARGO PACKAGING SHOP',
      items: [
        { name: 'Packaging Shop', path: '/dashboard/packaging', icon: ShoppingCart, moduleKey: 'PACKAGING_SHOP' },
        { name: 'My Packaging Orders', path: '/dashboard/packaging/orders', icon: Package, moduleKey: 'PACKAGING_SHOP' },
        { name: 'Custom Requirements', path: '/dashboard/packaging/requirements', icon: ClipboardList, moduleKey: 'PACKAGING_SHOP' },
      ],
    },
    {
      title: 'ACCOUNT & BILLING',
      items: [
        { name: 'Company Profile', path: '/dashboard/profile', icon: User },
        { name: 'Quotations Tracker', path: '/dashboard/quotations', icon: FileText, moduleKey: 'QUOTATIONS' },
        ...(!isAdditionalUser
          ? [
              { name: 'Subscriptions', path: '/dashboard/subscriptions', icon: CreditCard },
              { name: 'Invoices', path: '/dashboard/invoices', icon: FileText },
            ]
          : []),
        { name: 'Device Sessions', path: '/dashboard/devices', icon: Smartphone },
      ],
    },
  ];

  // Dynamic Module Filtering:
  // 1. If Super Admin deactivated the module in PlatformModule, it is excluded for all customer users.
  // 2. For Additional Users, strictly filter out any menu items that are not in assigned modules.
  // 3. For Primary Company Users (!isAdditionalUser), show active entitled modules.
  const menuGroups = rawMenuGroups
    .map((group) => {
      const filteredItems = group.items.filter((item: any) => {
        if (!item.moduleKey) return true; // General item (Overview, Profile, Devices, User Accounts)

        // Super Admin module catalogue activation check
        if (activeModuleKeys.length > 0 && !activeModuleKeys.includes(item.moduleKey)) {
          return false;
        }

        // Additional users must have module assigned to their license
        if (isAdditionalUser) {
          return assignedModules.includes(item.moduleKey);
        }

        return true;
      });
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#1E8262] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-sm">Verifying secure device session...</p>
        </div>
      </div>
    );
  }

  if (user?.mustChangePassword) {
    return (
      <div className="min-h-screen bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[#0F4C3A]">First Login Password Setup</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              For security, you must change your temporary password before accessing the Organization Admin Console.
            </p>
          </div>
          <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
            {pwdError && (
              <div className="bg-red-50 text-red-600 border border-red-200 p-2.5 rounded-lg text-xs font-semibold">
                {pwdError}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Temporary Password</label>
              <input
                type="password"
                value={curPassword}
                onChange={(e) => setCurPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={pwdSaving}
              className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm mt-4 cursor-pointer"
            >
              {pwdSaving ? 'Updating Password...' : 'Set New Password & Activate Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-lg">
              G
            </div>
            <div>
              <span className="font-bold text-sm text-[#0F4C3A] tracking-tight">GEO TRANSIT</span>
              <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider -mt-1 leading-none">
                Enterprise Logistics Console
              </span>
            </div>
          </div>
          {/* Collapse/Expand toggle for desktop sidebar */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-1.5 rounded-lg text-[#0F4C3A] hover:bg-slate-100 transition ml-4 shrink-0"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Profile Menu Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100/80 transition cursor-pointer group border border-transparent hover:border-slate-200"
          >
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-800 leading-tight group-hover:text-[#0F4C3A]">{user?.name || 'User'}</span>
              <span className="text-[10px] text-slate-500 font-medium">{user?.company || 'Logistics Client'}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center font-bold text-sm border border-emerald-200 shadow-2xs group-hover:scale-105 transition duration-150">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <span className="block text-xs font-extrabold text-slate-900 truncate">{user?.name || 'User'}</span>
                  <span className="block text-[10px] text-slate-500 font-medium truncate mt-0.5">{user?.company || 'Logistics Client'}</span>
                </div>
                <div className="py-1">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-[#E8F5E9]/60 hover:text-[#0F4C3A] transition"
                  >
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Company Profile</span>
                  </Link>
                </div>
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Body: Sidebar + Content */}
      <div className="flex-grow flex h-[calc(100vh-64px)] overflow-hidden relative">
        {/* Desktop Sidebar Spacer to push/adjust content layout dynamically */}
        <div className={`hidden md:block shrink-0 transition-all duration-300 ${
          (!sidebarCollapsed || isHovered) ? 'w-64' : 'w-16'
        }`} />

        {/* Desktop Sidebar */}
        <aside 
          onMouseEnter={() => { if (sidebarCollapsed) setIsHovered(true); }}
          onMouseLeave={() => setIsHovered(false)}
          className={`hidden md:flex flex-col bg-white border-r border-slate-200 absolute left-0 top-0 bottom-0 z-30 overflow-y-auto overflow-x-hidden transition-all duration-300 shadow-sm ${
            (!sidebarCollapsed || isHovered) ? 'w-64' : 'w-16'
          }`}
        >
          <nav className={`flex-grow space-y-5 ${(!sidebarCollapsed || isHovered) ? 'py-4 pr-3 pl-0' : 'p-2'}`}>
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {(!sidebarCollapsed || isHovered) && (
                  <div className="mx-3 mt-4 mb-2 px-2 py-1 border-b border-slate-200/80 flex items-center justify-between">
                    <span className="block text-[10.5px] font-black text-slate-600 uppercase tracking-widest">
                      {group.title}
                    </span>
                  </div>
                )}
                {group.items.map((item) => {
                  const active = pathname === item.path;
                  const Icon = item.icon;
                  const showText = !sidebarCollapsed || isHovered;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      title={!showText ? item.name : undefined}
                      className={`group flex items-center text-xs font-bold transition-all duration-180 ${
                        !showText 
                          ? 'justify-center p-2.5 rounded-lg' 
                          : 'gap-3 px-3.5 py-2.5 border-l-4 pl-3.5 rounded-r-xl rounded-l-none'
                      } ${
                        active
                          ? showText
                            ? 'bg-emerald-50 text-[#0F4C3A] border-[#0F4C3A] font-black shadow-2xs'
                            : 'bg-emerald-100/80 text-[#0F4C3A]'
                          : showText
                            ? 'text-slate-700 hover:text-[#0F4C3A] hover:bg-emerald-50/60 hover:border-[#107c5a]/40 border-transparent hover:translate-x-0.5'
                            : 'text-slate-600 hover:text-[#0F4C3A] hover:bg-emerald-50/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-180 group-hover:scale-110 ${active ? 'text-[#0F4C3A] font-bold' : 'text-slate-500 group-hover:text-[#107c5a]'}`} />
                      {showText && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          
          {/* Active subscription summary */}
          {(!sidebarCollapsed || isHovered) && (
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Subscription Status
              </span>
              {isAdditionalUser ? (
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-lg shadow-sm">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Assigned Role</span>
                  <span className="block text-xs font-extrabold text-[#0F4C3A] truncate mt-0.5">
                    {user?.assignedRoleName || 'Additional User'}
                  </span>
                  <div className="mt-2 space-y-1 text-[9px] text-slate-500 font-medium">
                    <div className="flex justify-between">
                      <span>Modules:</span>
                      <span className="font-bold text-slate-700">{assignedModules.length} Active</span>
                    </div>
                    {user?.userLicense?.expiryDate && (
                      <div className="flex justify-between">
                        <span>Expires:</span>
                        <span className="font-semibold text-slate-700">{formatDateIndian(user.userLicense.expiryDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : user?.accessStatus === 'SUBSCRIPTION_ACTIVE' ? (
                <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg shadow-sm">
                  <span className="block text-[10px] font-extrabold text-[#0F4C3A] uppercase truncate">
                    {user?.activeSubscription?.planName || 'Active'}
                  </span>
                  <div className="mt-2 space-y-1 text-[9px] text-slate-500 font-medium">
                    <div className="flex justify-between">
                      <span>Devices:</span>
                      <span className="font-bold text-slate-700">{user?.activeDevicesCount} / {user?.activeSubscription?.deviceLimit || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expires:</span>
                      <span className="font-semibold text-slate-700">{user?.activeSubscription?.endDate ? formatDateIndian(user.activeSubscription.endDate) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ) : user?.accessStatus === 'PAYMENT_PENDING' ? (
                <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg shadow-sm">
                  <span className="block text-[10px] font-extrabold text-blue-800 uppercase">Payment Pending</span>
                  <span className="block text-slate-500 text-[9px] mt-1 font-medium leading-tight">
                    Verifying transaction proof...
                  </span>
                </div>
              ) : user?.accessStatus === 'DEMO_ACTIVE' ? (
                <div className="bg-amber-50/30 border border-amber-200/60 p-3 rounded-lg shadow-sm">
                  <span className="block text-[10px] font-extrabold text-amber-800 uppercase">Demo Period</span>
                  <span className="block text-slate-500 text-[9px] mt-1 font-medium leading-tight">
                    Rate Cards & premium active
                  </span>
                  <Link
                    href="/dashboard/subscriptions"
                    className="block text-center bg-[#0F4C3A] hover:bg-[#1E8262] text-white text-[9px] font-bold py-1.5 rounded mt-2.5 transition shadow-sm"
                  >
                    Upgrade Plan
                  </Link>
                </div>
              ) : user?.accessStatus === 'DEMO_EXPIRED' ? (
                <div className="bg-red-50/30 border border-red-200/65 p-3 rounded-lg">
                  <span className="block text-[10px] font-extrabold text-red-800 uppercase">Demo Expired</span>
                  <Link
                    href="/dashboard/subscriptions"
                    className="block text-center bg-red-655 hover:bg-red-755 text-white text-[9px] font-bold py-1.5 rounded mt-2 transition"
                  >
                    Upgrade Now
                  </Link>
                </div>
              ) : (
                <div className="bg-red-50/30 border border-red-200/65 p-3 rounded-lg">
                  <span className="block text-[10px] font-extrabold text-red-800 uppercase">Subscription Expired</span>
                  <Link
                    href="/dashboard/subscriptions"
                    className="block text-center bg-red-655 hover:bg-red-755 text-white text-[9px] font-bold py-1.5 rounded mt-2 transition"
                  >
                    Renew Now
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Dedicated Sidebar Bottom Logout Option */}
          <div className="p-3 border-t border-slate-200/80 bg-white mt-auto">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 p-2.5 rounded-xl transition-all duration-180 cursor-pointer ${
                (!sidebarCollapsed || isHovered) ? 'gap-3 px-3.5' : 'justify-center'
              }`}
              title={sidebarCollapsed && !isHovered ? "Log Out" : undefined}
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              {(!sidebarCollapsed || isHovered) && <span>Log Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Drawer Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
            
            <aside className="relative flex flex-col w-64 max-w-xs bg-white h-full shadow-2xl p-4 animate-fade-in shrink-0 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold text-sm text-[#0F4C3A]">GEO TRANSIT</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-grow space-y-5">
                {menuGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="mx-1 my-1 px-3 py-1.5 rounded-lg bg-slate-100/90 border border-slate-200/60 shadow-2xs">
                      <span className="block text-[10.5px] font-bold text-[#0F4C3A] uppercase tracking-wider">
                        {group.title}
                      </span>
                    </div>
                    {group.items.map((item) => {
                      const active = pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                            active
                              ? 'bg-[#E8F5E9] text-[#0F4C3A]'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? 'text-[#0F4C3A]' : 'text-slate-400'}`} />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className="border-t border-slate-200 pt-4 mt-auto">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Logout Session</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-grow p-6 md:p-8 overflow-y-auto w-full min-w-0">
          <div className="w-full">
            {(() => {
              const protectedPaths = [
                '/dashboard',
                '/dashboard/calculator',
                '/dashboard/rate-cards',
                '/dashboard/history',
                '/dashboard/tracking',
                '/dashboard/pincode-serviceability'
              ];
              const isProtectedPath = protectedPaths.includes(pathname);
              const isExpired = user?.accessStatus === 'DEMO_EXPIRED' || user?.accessStatus === 'SUBSCRIPTION_EXPIRED';
              const isPending = user?.accessStatus === 'PAYMENT_PENDING';

              if (isProtectedPath && isExpired) {
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg mx-auto text-center shadow-md my-12">
                    <div className="w-16 h-16 bg-red-50 text-red-600 flex items-center justify-center rounded-full mx-auto mb-6">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-[#0F4C3A]">
                      {user?.accessStatus === 'DEMO_EXPIRED' ? 'Your 10-day demo period has ended.' : 'Your subscription has expired.'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      Subscribe to a GEO TRANSIT plan to continue using Rate Cards, Weight Calculator and other premium features.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
                      <button
                        onClick={() => router.push('/dashboard/subscriptions')}
                        className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 px-6 rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        View Subscription Plans
                      </button>
                      <button
                        onClick={() => router.push('/dashboard/subscriptions')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-6 rounded-xl text-xs font-bold transition"
                      >
                        Upgrade Now
                      </button>
                    </div>
                  </div>
                );
              }

              if (isProtectedPath && isPending) {
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg mx-auto text-center shadow-md my-12">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 flex items-center justify-center rounded-full mx-auto mb-6 animate-pulse">
                      <Loader2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-[#0F4C3A]">
                      Payment Verification Pending
                    </h2>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      We are currently verifying your transaction ID / UTR number. Once the administrator approves the payment, your GEO TRANSIT premium access will be restored automatically.
                    </p>
                    <div className="mt-8">
                      <button
                        onClick={() => router.push('/dashboard/subscriptions')}
                        className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 px-6 rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        View Subscription History
                      </button>
                    </div>
                  </div>
                );
              }

              // Global check: If Super Admin deactivated the module in catalogue, block direct URL access
              const PLATFORM_ROUTE_MAP = [
                { pathPrefix: '/dashboard/calculator', moduleKey: 'WEIGHT_CALCULATOR', name: 'Weight Calculator' },
                { pathPrefix: '/dashboard/rate-calculator', moduleKey: 'RATE_CALCULATOR', name: 'Rate Calculator' },
                { pathPrefix: '/dashboard/rate-cards', moduleKey: 'RATE_CARDS', name: 'Rate Cards' },
                { pathPrefix: '/dashboard/pincode-serviceability', moduleKey: 'PINCODE_LOOKUP', name: 'Pincode Lookup' },
                { pathPrefix: '/dashboard/tracking', moduleKey: 'CARRIER_TRACKING', name: 'Carrier Tracking' },
                { pathPrefix: '/dashboard/history', moduleKey: 'CALCULATION_HISTORY', name: 'Calculation History' },
                { pathPrefix: '/dashboard/sales-follow-up', moduleKey: 'SALES_FOLLOW_UP', name: 'Sales Follow-Up' },
                { pathPrefix: '/dashboard/quotations', moduleKey: 'QUOTATIONS', name: 'Quotations Tracker' },
                { pathPrefix: '/dashboard/packaging', moduleKey: 'PACKAGING_SHOP', name: 'Cargo Packaging Shop' },
                { pathPrefix: '/dashboard/employees', moduleKey: 'EMPLOYEE_MANAGEMENT', name: 'Employee Directory' },
                { pathPrefix: '/dashboard/attendance', moduleKey: 'ATTENDANCE', name: 'Attendance Register' },
                { pathPrefix: '/dashboard/payroll', moduleKey: 'PAYROLL', name: 'Payroll & Salary Slips' },
                { pathPrefix: '/dashboard/cash-ledger', moduleKey: 'COUNTER_CASH_LEDGER', name: 'Counter Cash Ledger' },
              ];

              if (user?.role !== 'ADMIN' && activeModuleKeys.length > 0) {
                const deactivatedRoute = PLATFORM_ROUTE_MAP.find(
                  (m) => pathname.startsWith(m.pathPrefix) && !activeModuleKeys.includes(m.moduleKey)
                );
                if (deactivatedRoute) {
                  return (
                    <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-lg mx-auto text-center shadow-md my-12">
                      <div className="w-16 h-16 bg-amber-50 text-amber-600 flex items-center justify-center rounded-full mx-auto mb-6">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">Module Currently Disabled</h2>
                      <div className="inline-block bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs font-bold mt-2">
                        Module: {deactivatedRoute.name}
                      </div>
                      <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                        The <strong>{deactivatedRoute.name}</strong> module is currently deactivated by the platform administrator.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
                        <button
                          onClick={() => router.push('/dashboard')}
                          className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 px-6 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          Return to Dashboard
                        </button>
                      </div>
                    </div>
                  );
                }
              }

              // Security: Check Additional User module assignment
              if (isAdditionalUser) {
                if (user?.status !== 'ACTIVE') {
                  return (
                    <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg mx-auto text-center shadow-md my-12">
                      <div className="w-16 h-16 bg-red-50 text-red-600 flex items-center justify-center rounded-full mx-auto mb-6">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h2 className="text-xl font-bold text-red-700">Account Disabled</h2>
                      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        Your user account has been disabled by your Organization Administrator. Please contact your organization owner for assistance.
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={handleLogout}
                          className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  );
                }

                // Check unassigned module access
                const ROUTE_MODULE_MAP = [
                  { pathPrefix: '/dashboard/calculator', moduleKey: 'WEIGHT_CALCULATOR', name: 'Weight Calculator' },
                  { pathPrefix: '/dashboard/rate-calculator', moduleKey: 'RATE_CALCULATOR', name: 'Rate Calculator' },
                  { pathPrefix: '/dashboard/rate-cards', moduleKey: 'RATE_CARDS', name: 'Rate Cards' },
                  { pathPrefix: '/dashboard/pincode-serviceability', moduleKey: 'PINCODE_LOOKUP', name: 'Pincode Lookup' },
                  { pathPrefix: '/dashboard/tracking', moduleKey: 'CARRIER_TRACKING', name: 'Carrier Tracking' },
                  { pathPrefix: '/dashboard/history', moduleKey: 'CALCULATION_HISTORY', name: 'Calculation History' },
                  { pathPrefix: '/dashboard/sales-follow-up', moduleKey: 'SALES_FOLLOW_UP', name: 'Sales Follow-Up' },
                  { pathPrefix: '/dashboard/quotations', moduleKey: 'QUOTATIONS', name: 'Quotations Tracker' },
                  { pathPrefix: '/dashboard/packaging', moduleKey: 'PACKAGING_SHOP', name: 'Cargo Packaging Shop' },
                  { pathPrefix: '/dashboard/employees', moduleKey: 'EMPLOYEE_MANAGEMENT', name: 'Employee Directory' },
                  { pathPrefix: '/dashboard/attendance', moduleKey: 'ATTENDANCE', name: 'Attendance Register' },
                  { pathPrefix: '/dashboard/payroll', moduleKey: 'PAYROLL', name: 'Payroll & Salary Slips' },
                  { pathPrefix: '/dashboard/cash-ledger', moduleKey: 'COUNTER_CASH_LEDGER', name: 'Counter Cash Ledger' },
                  { pathPrefix: '/dashboard/users', moduleKey: 'USER_ACCOUNTS', name: 'User Accounts' },
                ];

                const matchedModule = ROUTE_MODULE_MAP.find((m) => pathname.startsWith(m.pathPrefix));
                if (matchedModule) {
                  if (matchedModule.moduleKey === 'USER_ACCOUNTS' || !assignedModules.includes(matchedModule.moduleKey)) {
                    return (
                      <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-lg mx-auto text-center shadow-md my-12">
                        <div className="w-16 h-16 bg-amber-50 text-amber-600 flex items-center justify-center rounded-full mx-auto mb-6">
                          <Lock className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
                        <div className="inline-block bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs font-bold mt-2">
                          Module: {matchedModule.name}
                        </div>
                        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                          Your employee account does not have permission to access the <strong>{matchedModule.name}</strong> module. This feature has not been assigned to your user license by your Organization Administrator.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
                          <button
                            onClick={() => router.push('/dashboard')}
                            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 px-6 rounded-xl text-xs font-bold transition shadow-sm"
                          >
                            Return to Dashboard
                          </button>
                        </div>
                      </div>
                    );
                  }
                }
              }

              return children;
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}
