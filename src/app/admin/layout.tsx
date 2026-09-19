'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CheckSquare,
  FileText,
  Smartphone,
  Navigation,
  DollarSign,
  Mail,
  FileCode,
  Layout,
  History,
  LogOut,
  Menu,
  X,
  Loader2,
  Tags,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  UserCheck,
  MapPin,
  Package,
  ShoppingCart,
  ClipboardList,
  Truck,
  ShoppingBag,
  BarChart3,
  Shield,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('adminSidebarCollapsed');
    if (stored === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    sessionStorage.setItem('adminSidebarCollapsed', String(nextVal));
  };

  useEffect(() => {
    async function checkAdminAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          throw new Error('Not authenticated');
        }
        const data = await res.json();
        if (data.user?.role !== 'ADMIN') {
          router.push('/dashboard');
          return;
        }
        setAdmin(data.user);
      } catch (err) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAdminAuth();
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  const menuGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      title: 'SUBSCRIPTIONS & BILLING',
      items: [
        { name: 'Subscription Plans', path: '/admin/plans', icon: DollarSign },
        { name: 'Subscription Payments', path: '/admin/payments', icon: CreditCard },
        { name: 'User Licenses', path: '/admin/user-license-payments', icon: UserCheck },
        { name: 'User License Pricing', path: '/admin/user-license-pricing', icon: Tags },
        { name: 'Shopping Payments', path: '/admin/packaging/payments', icon: CreditCard },
      ],
    },
    {
      title: 'ACCESS CONTROL',
      items: [
        { name: 'Platform Roles', path: '/admin/roles', icon: Shield },
        { name: 'Platform Modules', path: '/admin/module-pricing', icon: Tags },
      ],
    },
    {
      title: 'ORGANIZATIONS & USERS',
      items: [
        { name: 'Organizations', path: '/admin/organizations', icon: Users },
        { name: 'User Accounts', path: '/admin/users', icon: UserCheck },
      ],
    },
    {
      title: 'LOGISTICS',
      items: [
        { name: 'Rate Cards', path: '/admin/rate-cards', icon: Tags },
        { name: 'Courier Companies', path: '/admin/couriers', icon: Truck },
        { name: 'Quotations', path: '/admin/quotations', icon: FileText },
        { name: 'Sales Follow-up', path: '/admin/sales-follow-up', icon: UserCheck },
        { name: 'Pincodes & Regions', path: '/admin/pincodes', icon: MapPin },
        { name: 'Logistics Reports', path: '/admin/reports', icon: BarChart3 },
      ],
    },
    {
      title: 'SHOPPING',
      items: [
        { name: 'Packaging Overview', path: '/admin/packaging', icon: ShoppingBag },
        { name: 'Products', path: '/admin/packaging/products', icon: Package },
        { name: 'Orders', path: '/admin/packaging/orders', icon: ShoppingCart },
        { name: 'Custom Requirements', path: '/admin/packaging', icon: ClipboardList },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Email / SMTP', path: '/admin/settings/smtp', icon: Mail },
        { name: 'Invoice & PDF Templates', path: '/admin/settings/templates', icon: Layout },
        { name: 'Audit Logs', path: '/admin/audit-logs', icon: History },
        { name: 'Global Settings', path: '/admin/settings/demo', icon: Settings },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#1E8262] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-sm">Verifying administrator console authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-[#0F4C3A] text-white border-b border-emerald-800 h-16 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1 rounded-lg text-emerald-100 hover:bg-[#145d47]"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-white text-[#0F4C3A] flex items-center justify-center font-bold text-lg">
              G
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white">GEO TRANSIT Admin</span>
              <span className="block text-[9px] text-emerald-200 font-semibold uppercase tracking-wider -mt-1 leading-none">
                Enterprise Platform Console
              </span>
            </div>
          </div>
          {/* Collapse/Expand toggle for desktop sidebar */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-1.5 rounded-lg text-emerald-200 hover:bg-[#145d47] transition ml-4 shrink-0 cursor-pointer"
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
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-emerald-800/40 transition cursor-pointer group border border-transparent hover:border-emerald-700/50"
          >
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold leading-tight text-white group-hover:text-emerald-200">{admin?.name || 'Admin'}</span>
              <span className="text-[9px] text-emerald-200 uppercase font-semibold tracking-wider">Super Administrator</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white text-[#0F4C3A] flex items-center justify-center font-bold text-sm shadow-2xs group-hover:scale-105 transition duration-150">
              {admin?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-emerald-200 group-hover:text-white transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2 animate-fade-in text-slate-800">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <span className="block text-xs font-extrabold text-slate-900 truncate">{admin?.name || 'Administrator'}</span>
                  <span className="block text-[10px] text-slate-500 font-medium truncate mt-0.5">Super Administrator Console</span>
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
          <nav className={`flex-grow space-y-6 ${(!sidebarCollapsed || isHovered) ? 'p-4' : 'p-2'}`}>
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {(!sidebarCollapsed || isHovered) && (
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                    {group.title}
                  </span>
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
                      className={`group flex items-center rounded-lg text-xs font-bold transition-all duration-180 ${
                        !showText ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5 hover:translate-x-0.5'
                      } ${
                        active
                          ? 'bg-[#E8F5E9] text-[#0F4C3A] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-[#0F4C3A] hover:bg-[#E8F5E9]/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-180 group-hover:scale-110 ${active ? 'text-[#0F4C3A]' : 'text-slate-400 group-hover:text-[#0F4C3A]'}`} />
                      {showText && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

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
                <span className="font-bold text-sm text-[#0F4C3A]">GEO TRANSIT Admin</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-grow space-y-6">
                {menuGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                      {group.title}
                    </span>
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
                  <span>Logout Admin Session</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-grow p-6 md:p-8 overflow-y-auto w-full min-w-0">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
