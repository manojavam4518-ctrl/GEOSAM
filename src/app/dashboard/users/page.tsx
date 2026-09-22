'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  Shield,
  Check,
  UserX,
  KeyRound,
  Layers,
  Sparkles,
  ShoppingCart,
  Minus,
  AlertTriangle,
  Edit2,
  Smartphone,
  Mail,
  Phone,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function OrganizationUserAccountsPage() {
  const [userLicenses, setUserLicenses] = useState<any[]>([]);
  const [licenseCapacity, setLicenseCapacity] = useState<{
    purchased: number;
    used: number;
    available: number;
  }>({ purchased: 0, used: 0, available: 0 });
  const [remainingOrgDays, setRemainingOrgDays] = useState<number>(0);
  const [orgSubscriptionExpiry, setOrgSubscriptionExpiry] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Active Modules & Payment Gateway Settings from DB
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  // ADD USER MODAL STATE (Direct Module Selection)
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addMobile, setAddMobile] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addDuration, setAddDuration] = useState<number>(3);
  const [selectedModuleKeys, setSelectedModuleKeys] = useState<string[]>([]);
  const [addPaymentMethod, setAddPaymentMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [addUtr, setAddUtr] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Eligibility & Price Calculation State
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // EDIT MODULES MODAL STATE
  const [editModulesModalOpen, setEditModulesModalOpen] = useState(false);
  const [targetUserForModules, setTargetUserForModules] = useState<any | null>(null);
  const [editSelectedModuleKeys, setEditSelectedModuleKeys] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);

  // EDIT USER DETAILS MODAL STATE
  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false);
  const [targetUserForDetails, setTargetUserForDetails] = useState<any | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [editEmailInput, setEditEmailInput] = useState('');
  const [editMobileInput, setEditMobileInput] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // RESET PASSWORD MODAL STATE
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [targetUserForPassword, setTargetUserForPassword] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // VIEW USER / LICENSE MODAL STATE
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (statusFilter) q.set('status', statusFilter);

      const res = await fetch(`/api/organization/users?${q.toString()}`);
      if (res.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUserLicenses(data.userLicenses || []);
        setLicenseCapacity(data.licenseCapacity || { purchased: 0, used: 0, available: 0 });
        setRemainingOrgDays(data.remainingOrgDays || 0);
        setOrgSubscriptionExpiry(data.orgSubscriptionExpiry || null);
        setOrganizationName(data.organizationName || '');
      }
    } catch (err) {
      console.error('Failed to load user accounts:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadData();
  }

  // Fetch available platform modules and payment settings on mount
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [modulesRes, payRes] = await Promise.all([
          fetch('/api/admin/modules'),
          fetch('/api/admin/settings/payment'),
        ]);

        if (modulesRes.ok) {
          const mData = await modulesRes.json();
          const activeMods = (mData.modules || []).filter((m: any) => m.active);
          setAvailableModules(activeMods);
        }

        if (payRes.ok) {
          const payData = await payRes.json();
          setPaymentSettings(payData.paymentSettings);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    fetchMetadata();
  }, []);

  // Fetch live parent subscription eligibility and pricing for selected modules
  async function fetchEligibility(duration: number, modules: string[]) {
    if (modules.length === 0) {
      setEligibilityData(null);
      return;
    }
    setCheckingEligibility(true);
    try {
      const res = await fetch(
        `/api/organization/user-licenses/eligibility?duration=${duration}&usersCount=1&modules=${encodeURIComponent(
          modules.join(',')
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        setEligibilityData(data.eligibility);
      }
    } catch (err) {
      console.error('Failed to fetch eligibility:', err);
    } finally {
      setCheckingEligibility(false);
    }
  }

  // Open Add User Modal
  function openAddModal() {
    setAddName('');
    setAddEmail('');
    setAddMobile('');
    setAddPassword('');
    setShowAddPassword(false);
    setAddDuration(3);
    setAddUtr('');
    setAddPaymentMethod('UPI');
    setError('');
    setMessage('');

    // Default select first 2 common modules if available
    const defaultSelection = availableModules
      .filter((m) => ['WEIGHT_CALCULATOR', 'RATE_CALCULATOR'].includes(m.key))
      .map((m) => m.key);
    const initialKeys = defaultSelection.length > 0 ? defaultSelection : availableModules.slice(0, 2).map((m) => m.key);
    setSelectedModuleKeys(initialKeys);

    setAddModalOpen(true);
    fetchEligibility(3, initialKeys);
  }

  function handleToggleModuleSelection(key: string) {
    const updated = selectedModuleKeys.includes(key)
      ? selectedModuleKeys.filter((k) => k !== key)
      : [...selectedModuleKeys, key];
    setSelectedModuleKeys(updated);
    fetchEligibility(addDuration, updated);
  }

  function handleDurationChange(duration: number) {
    setAddDuration(duration);
    fetchEligibility(duration, selectedModuleKeys);
  }

  function handleSelectAllModules() {
    const allKeys = availableModules.map((m) => m.key);
    setSelectedModuleKeys(allKeys);
    fetchEligibility(addDuration, allKeys);
  }

  function handleClearAllModules() {
    setSelectedModuleKeys([]);
    setEligibilityData(null);
  }

  // Submit Add User & License
  async function handleCreateUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!addName.trim() || !addEmail.trim()) {
      setError('Name and Email are required.');
      return;
    }

    if (!addPassword || addPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (selectedModuleKeys.length === 0) {
      setError('Please select at least one module for this user account.');
      return;
    }

    const needsPayment = licenseCapacity.available <= 0;
    if (needsPayment && !addUtr.trim()) {
      setError('Please enter the Payment Transaction ID / UTR.');
      return;
    }

    setCreatingUser(true);
    try {
      const res = await fetch('/api/organization/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          mobile: addMobile.trim() || '9876543210',
          password: addPassword,
          assignedModules: selectedModuleKeys,
          duration: addDuration,
          paymentMethod: addPaymentMethod,
          utr: addUtr.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account.');
      }

      setMessage(data.message || `User account '${addName.trim()}' processed successfully.`);
      setAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating user.');
    } finally {
      setCreatingUser(false);
    }
  }

  // Open Edit Modules Modal
  function openEditModulesModal(lic: any) {
    const userRecord = lic.user || lic;
    setTargetUserForModules(userRecord);
    setEditSelectedModuleKeys(userRecord.assignedModules || lic.assignedModules || []);
    setError('');
    setMessage('');
    setEditModulesModalOpen(true);
  }

  function handleToggleEditModule(key: string) {
    setEditSelectedModuleKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSaveModulesSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUserForModules) return;

    if (editSelectedModuleKeys.length === 0) {
      setError('A user account must have at least one assigned module.');
      return;
    }

    setSavingModules(true);
    setError('');
    try {
      const res = await fetch(`/api/organization/users/${targetUserForModules.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedModules: editSelectedModuleKeys }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update assigned modules.');
      }

      setMessage(data.message || `Modules updated for ${targetUserForModules.name}.`);
      setEditModulesModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update modules.');
    } finally {
      setSavingModules(false);
    }
  }

  // Open Edit User Details Modal
  function openEditDetailsModal(lic: any) {
    const userRecord = lic.user || lic;
    setTargetUserForDetails(userRecord);
    setEditNameInput(userRecord.name || lic.userName || '');
    setEditEmailInput(userRecord.email || lic.userEmail || '');
    setEditMobileInput(userRecord.mobile || lic.userMobile || '');
    setError('');
    setMessage('');
    setEditDetailsModalOpen(true);
  }

  async function handleSaveDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUserForDetails) return;

    if (!editNameInput.trim() || !editEmailInput.trim()) {
      setError('Name and Email are required.');
      return;
    }

    setSavingDetails(true);
    setError('');
    try {
      const res = await fetch(`/api/organization/users/${targetUserForDetails.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editNameInput.trim(),
          email: editEmailInput.trim(),
          mobile: editMobileInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user details.');
      }

      setMessage(data.message || `Details updated for ${editNameInput.trim()}.`);
      setEditDetailsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update user details.');
    } finally {
      setSavingDetails(false);
    }
  }

  // Toggle User Active / Disabled Status
  async function handleToggleUserStatus(userId: string, currentStatus: string, userName: string) {
    const targetStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (
      !confirm(
        `Are you sure you want to ${targetStatus === 'ACTIVE' ? 'activate' : 'deactivate'} user account '${userName}'?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/organization/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user status.');
      }

      setMessage(data.message);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.');
    }
  }

  // Open Reset Password Modal
  function openResetPasswordModal(userRecord: any) {
    setTargetUserForPassword(userRecord);
    setNewPasswordInput('');
    setShowNewPassword(false);
    setPasswordModalOpen(true);
  }

  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUserForPassword) return;

    if (!newPasswordInput || newPasswordInput.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch(`/api/organization/users/${targetUserForPassword.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setMessage(data.message || 'Password updated securely.');
      setPasswordModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  }

  // Helper to compute module price for current duration
  function getModulePriceForDuration(mod: any, duration: number): number {
    if (duration === 3) return mod.price3Months > 0 ? mod.price3Months : (mod.monthlyPrice || 0) * 3;
    if (duration === 6) return mod.price6Months > 0 ? mod.price6Months : (mod.monthlyPrice || 0) * 6;
    if (duration === 12) return mod.price12Months > 0 ? mod.price12Months : (mod.monthlyPrice || 0) * 12;
    return (mod.monthlyPrice || 0) * duration;
  }

  if (isForbidden) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F4C3A]">Administrator Access Required</h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
              User Accounts management is accessible exclusively through your Organization Administrator or Company Owner account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#0F4C3A]" />
            <h1 className="text-xl font-bold text-[#0F4C3A]">User Accounts & License Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Provision staff employee accounts using direct module selection. Assign exact features per user with automatic database-driven license calculations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openAddModal}
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* USER LICENSES CAPACITY BANNER */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0F4C3A]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                ORGANIZATION USER LICENSES OVERVIEW
              </span>
            </div>
            <div className="flex items-center gap-6 mt-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Created</span>
                <span className="block text-2xl font-black text-slate-900">
                  {userLicenses.length}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Active Staff</span>
                <span className="block text-2xl font-black text-slate-700">
                  {userLicenses.filter((l) => l.status === 'ACTIVE' && l.user?.status !== 'DISABLED').length}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600">Pre-Paid Available</span>
                <span className="block text-2xl font-black text-emerald-700">
                  {licenseCapacity.available}
                </span>
              </div>
              <div className="hidden lg:block h-8 w-px bg-slate-200" />
              <div className="hidden lg:block">
                <span className="text-[10px] uppercase font-bold text-slate-400">Organization Subscription</span>
                <span className="block text-sm font-extrabold text-[#0F4C3A] mt-1">
                  {remainingOrgDays} Days Remaining {orgSubscriptionExpiry ? `(Until ${new Date(orgSubscriptionExpiry).toLocaleDateString('en-IN')})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 md:pt-0">
            <button
              onClick={openAddModal}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar / Search Filter */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user name, email, or phone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-4 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs p-1.5 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="">All Accounts</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="PENDING_PAYMENT">Pending Approval</option>
            <option value="INACTIVE">Disabled</option>
          </select>
        </div>
      </div>

      {/* User Accounts Management Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[220px]">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : userLicenses.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl text-slate-400 font-medium text-xs shadow-2xs space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <p>No customer employee accounts found.</p>
          <button
            onClick={openAddModal}
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add First User Account
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">User Name</th>
                  <th className="px-4 py-3.5">Email & Phone</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">License Dates</th>
                  <th className="px-4 py-3.5">Assigned Modules</th>
                  <th className="px-4 py-3.5 text-center">License Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userLicenses.map((lic) => {
                  const now = new Date();
                  const isExpired =
                    lic.status === 'EXPIRED' ||
                    (lic.expiryDate && new Date(lic.expiryDate) < now);
                  const isPending = lic.status === 'PENDING_PAYMENT' || lic.paymentStatus === 'PENDING';
                  const userAccount = lic.user;
                  const isUserDisabled = userAccount && userAccount.status === 'DISABLED';
                  const assigned = userAccount?.assignedModules || lic.assignedModules || [];

                  return (
                    <tr key={lic.id} className="hover:bg-slate-50/80 transition">
                      {/* User Name */}
                      <td className="px-4 py-3.5">
                        <span className="block font-extrabold text-slate-900 text-sm">
                          {lic.userName || userAccount?.name}
                        </span>
                        <span className="inline-block text-[10px] text-slate-400">
                          ID: {userAccount?.id ? userAccount.id.slice(-6) : lic.id.slice(-6)}
                        </span>
                      </td>

                      {/* Email & Phone */}
                      <td className="px-4 py-3.5">
                        <span className="block font-semibold text-slate-800">
                          {lic.userEmail || userAccount?.email}
                        </span>
                        <span className="block text-[10.5px] text-slate-400 font-mono mt-0.5">
                          {lic.userMobile || userAccount?.mobile || '—'}
                        </span>
                      </td>

                      {/* Account Status */}
                      <td className="px-4 py-3.5">
                        {isUserDisabled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>

                      {/* License Dates */}
                      <td className="px-4 py-3.5 text-slate-800 font-medium">
                        <span className="block text-xs font-bold text-slate-900">
                          {lic.startDate
                            ? new Date(lic.startDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Pending'}{' '}
                          –{' '}
                          {lic.expiryDate
                            ? new Date(lic.expiryDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          Duration: {lic.duration || 3} Months
                        </span>
                      </td>

                      {/* Assigned Modules Badges */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {(lic.moduleDetails || []).map((m: any) => (
                            <span
                              key={m.key}
                              className="inline-block text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-[#0F4C3A] border border-emerald-200"
                            >
                              {m.name}
                            </span>
                          ))}
                          {(!lic.moduleDetails || lic.moduleDetails.length === 0) && (
                            <span className="text-[10px] text-slate-400 italic">No modules</span>
                          )}
                        </div>
                        <span className="block text-[9px] text-slate-400 font-bold mt-1">
                          {assigned.length} Module{assigned.length === 1 ? '' : 's'} Assigned
                        </span>
                      </td>

                      {/* License Status */}
                      <td className="px-4 py-3.5 text-center">
                        {isPending ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            Pending Approval
                          </span>
                        ) : isExpired ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-red-50 text-red-800 border border-red-200">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedLicense(lic);
                            setViewModalOpen(true);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          title="View user details & license"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>

                        <button
                          onClick={() => openEditModulesModal(lic)}
                          className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0F4C3A] border border-emerald-200 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          title="Edit directly assigned modules"
                        >
                          <Layers className="w-3 h-3" />
                          Edit Modules
                        </button>

                        <button
                          onClick={() => openEditDetailsModal(lic)}
                          className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          title="Edit user profile details"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>

                        {userAccount && (
                          <>
                            <button
                              onClick={() =>
                                handleToggleUserStatus(
                                  userAccount.id,
                                  userAccount.status,
                                  userAccount.name || lic.userName
                                )
                              }
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer border ${
                                isUserDisabled
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              }`}
                              title={isUserDisabled ? 'Activate user account' : 'Deactivate user account'}
                            >
                              {isUserDisabled ? 'Activate' : 'Deactivate'}
                            </button>

                            <button
                              onClick={() => openResetPasswordModal(userAccount)}
                              className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                              title="Reset user password"
                            >
                              <KeyRound className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD USER MODAL (Direct Module Selection System)           */}
      {/* ========================================================= */}
      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Add User Account"
          size="lg"
        >
          <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
            {/* USER DETAILS SECTION */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#0F4C3A]">
                1. User Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Employee / User Name *
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#1E8262]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Email Address (Login Username) *
                  </label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Phone / Mobile Number *
                  </label>
                  <input
                    type="text"
                    value={addMobile}
                    onChange={(e) => setAddMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Password / Set Password Securely *
                  </label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#1E8262]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[9.5px] text-slate-400 mt-1 block">
                    Password is securely encrypted with bcrypt. Plaintext is never stored.
                  </span>
                </div>
              </div>
            </div>

            {/* LICENSE DURATION SELECTOR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#0F4C3A]">
                2. Account Duration
              </span>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { months: 3, label: '3 Months' },
                  { months: 6, label: '6 Months' },
                  { months: 12, label: '12 Months' },
                ].map((d) => {
                  const selected = addDuration === d.months;
                  return (
                    <div
                      key={d.months}
                      onClick={() => handleDurationChange(d.months)}
                      className={`p-3 rounded-xl border-2 transition cursor-pointer text-center ${
                        selected
                          ? 'border-[#0F4C3A] bg-emerald-50/70 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-black text-xs text-slate-900">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SELECT MODULES SECTION */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#0F4C3A]">
                    3. Select Modules ({selectedModuleKeys.length} Selected)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Directly select the modules and features this employee can access.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllModules}
                    className="text-[10px] font-bold text-[#0F4C3A] hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllModules}
                    className="text-[10px] font-bold text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {availableModules.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-xs">
                  No active platform modules available. Please contact Super Admin.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {availableModules.map((mod) => {
                    const isSelected = selectedModuleKeys.includes(mod.key);
                    const modPrice = getModulePriceForDuration(mod, addDuration);

                    return (
                      <div
                        key={mod.key}
                        onClick={() => handleToggleModuleSelection(mod.key)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'border-[#0F4C3A] bg-emerald-50/60 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by container onClick
                            className="mt-0.5 w-4 h-4 text-[#0F4C3A] rounded border-slate-300 focus:ring-[#0F4C3A] cursor-pointer"
                          />
                          <div>
                            <span className="block font-bold text-xs text-slate-900">{mod.name}</span>
                            <span className="block text-[10px] text-slate-500 line-clamp-1">
                              {mod.description || 'Core feature module'}
                            </span>
                            <span className="inline-block text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                              {mod.category}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block font-black text-xs text-[#0F4C3A]">
                            ₹{modPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {addDuration}M
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AUTOMATIC PRICE SUMMARY & SUBSCRIPTION EXPIRY RESTRICTION CHECK */}
            {checkingEligibility ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#1E8262]" />
                <span>Calculating pricing breakdown from database...</span>
              </div>
            ) : eligibilityData ? (
              <div className="space-y-3">
                {/* Expiry rule warning if prorated */}
                {eligibilityData.isProrated && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-xs">
                          Full selected duration is not available because the organization subscription expires earlier.
                        </span>
                        <span className="text-[11px] text-amber-800 block mt-0.5">
                          User licenses cannot extend beyond the organization subscription expiry date.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/80 text-[11px]">
                      <div>
                        <span className="text-amber-700">Remaining subscription days:</span>
                        <span className="font-black block text-amber-950">
                          {eligibilityData.remainingSubscriptionDays} Days
                        </span>
                      </div>
                      <div>
                        <span className="text-amber-700">Maximum eligible license period:</span>
                        <span className="font-black block text-amber-950">
                          {eligibilityData.maxAvailableDays} Days
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="bg-[#F4F7F6] border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Price Summary Breakdown
                  </span>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {(eligibilityData.moduleBreakdown || []).map((m: any) => (
                      <div key={m.key} className="flex justify-between text-slate-700">
                        <span>{m.name}</span>
                        <span className="font-bold text-slate-900">₹{m.price.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-600">
                    <span>License Duration:</span>
                    <span className="font-bold">{addDuration} Months ({eligibilityData.maxAvailableDays} Days eligible)</span>
                  </div>

                  {eligibilityData.isProrated && (
                    <div className="flex justify-between text-amber-800 text-xs">
                      <span>Prorated Applicable Amount:</span>
                      <span className="font-bold">₹{eligibilityData.totalPayable.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-black text-slate-900">
                    <span>Total User License:</span>
                    <span className="text-base text-[#0F4C3A]">
                      ₹{eligibilityData.totalPayable.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* PAYMENT INFORMATION */}
            {licenseCapacity.available > 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <div>
                  <span className="font-bold block">Pre-Approved Capacity Available</span>
                  <span className="text-[11px] text-emerald-700">
                    Your organization has {licenseCapacity.available} unused pre-paid user license slot(s). One slot will be consumed for this user upon creation.
                  </span>
                </div>
                <span className="bg-emerald-100 text-emerald-900 font-extrabold px-2.5 py-1 rounded text-[10px] uppercase shrink-0">
                  Ready to Activate
                </span>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#0F4C3A]">
                  4. Payment & Verification
                </span>

                {paymentSettings && (
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 text-xs">
                    <span className="block text-[9.5px] font-bold text-[#0F4C3A] uppercase mb-1">
                      Payment Account Details
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 text-[9px] block">UPI ID</span>
                        <span className="font-mono font-bold text-slate-800">{paymentSettings.upiId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] block">Bank Account</span>
                        <span className="font-mono font-bold text-slate-800">
                          {paymentSettings.bankName} - {paymentSettings.bankAccountNumber} (IFSC: {paymentSettings.bankIfsc})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={addPaymentMethod}
                      onChange={(e: any) => setAddPaymentMethod(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-semibold focus:outline-none"
                    >
                      <option value="UPI">UPI Transfer</option>
                      <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Transaction Reference / UTR *
                    </label>
                    <input
                      type="text"
                      value={addUtr}
                      onChange={(e) => setAddUtr(e.target.value)}
                      placeholder="e.g. 423456789012"
                      required={licenseCapacity.available <= 0}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#1E8262]"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingUser || selectedModuleKeys.length === 0}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-6 rounded-lg font-bold transition cursor-pointer shadow-sm"
              >
                {creatingUser
                  ? 'Processing...'
                  : licenseCapacity.available > 0
                  ? 'Create User Account'
                  : 'Submit User License & Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* EDIT MODULES MODAL (Requirement 8)                        */}
      {/* ========================================================= */}
      {targetUserForModules && editModulesModalOpen && (
        <Modal
          isOpen={editModulesModalOpen}
          onClose={() => setEditModulesModalOpen(false)}
          title={`Edit Modules — ${targetUserForModules.name}`}
          size="lg"
        >
          <form onSubmit={handleSaveModulesSubmit} className="space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-slate-500">Employee: </span>
                <span className="font-extrabold text-slate-900">{targetUserForModules.name}</span>
                <span className="text-slate-400 ml-2">({targetUserForModules.email})</span>
              </div>
              <span className="text-xs font-bold text-[#0F4C3A]">
                {editSelectedModuleKeys.length} Modules Selected
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2">
                Select Assigned Modules:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {availableModules.map((mod) => {
                  const isSelected = editSelectedModuleKeys.includes(mod.key);

                  return (
                    <div
                      key={mod.key}
                      onClick={() => handleToggleEditModule(mod.key)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-[#0F4C3A] bg-emerald-50/60 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 text-[#0F4C3A] rounded border-slate-300 focus:ring-[#0F4C3A] cursor-pointer"
                        />
                        <div>
                          <span className="block font-bold text-xs text-slate-900">{mod.name}</span>
                          <span className="block text-[10px] text-slate-500 line-clamp-1">
                            {mod.description || 'Core feature module'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-extrabold text-[#0F4C3A] shrink-0">
                        ₹{(mod.monthlyPrice || 0).toLocaleString('en-IN')}/mo
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
              Note: Updating module assignments immediately modifies this employee&apos;s dashboard visibility and backend API authorization permissions.
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModulesModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingModules || editSelectedModuleKeys.length === 0}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-6 rounded-lg font-bold transition cursor-pointer shadow-sm"
              >
                {savingModules ? 'Saving...' : 'Save Assigned Modules'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* EDIT USER DETAILS MODAL (Requirement 9)                   */}
      {/* ========================================================= */}
      {targetUserForDetails && editDetailsModalOpen && (
        <Modal
          isOpen={editDetailsModalOpen}
          onClose={() => setEditDetailsModalOpen(false)}
          title={`Edit User Details — ${targetUserForDetails.name}`}
          size="md"
        >
          <form onSubmit={handleSaveDetailsSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#1E8262]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={editEmailInput}
                onChange={(e) => setEditEmailInput(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Mobile / Phone Number
              </label>
              <input
                type="text"
                value={editMobileInput}
                onChange={(e) => setEditMobileInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditDetailsModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingDetails}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-5 rounded-lg font-bold transition cursor-pointer"
              >
                {savingDetails ? 'Saving...' : 'Save User Details'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* RESET PASSWORD MODAL (Requirement 9)                      */}
      {/* ========================================================= */}
      {targetUserForPassword && passwordModalOpen && (
        <Modal
          isOpen={passwordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
          title={`Reset Password — ${targetUserForPassword.name}`}
          size="sm"
        >
          <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs">
            <p className="text-slate-600">
              Set a new password for <strong>{targetUserForPassword.name}</strong> ({targetUserForPassword.email}):
            </p>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pr-10 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#1E8262]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[9.5px] text-slate-400 mt-1">
                Passwords must remain securely hashed with bcrypt. Never stored or recoverable in plaintext.
              </p>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resettingPassword}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-5 rounded-lg font-bold transition cursor-pointer"
              >
                {resettingPassword ? 'Updating...' : 'Set New Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* VIEW DETAILS & LICENSE MODAL (Requirement 9)              */}
      {/* ========================================================= */}
      {selectedLicense && viewModalOpen && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`User & License Details — ${selectedLicense.userName || selectedLicense.user?.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-[#F4F7F6] p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Employee Name:</span>
                <span className="font-bold text-slate-900">
                  {selectedLicense.userName || selectedLicense.user?.name}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Email Address:</span>
                <span className="font-bold text-slate-900">
                  {selectedLicense.userEmail || selectedLicense.user?.email}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Phone Number:</span>
                <span className="font-bold text-slate-900">
                  {selectedLicense.userMobile || selectedLicense.user?.mobile || '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Account Status:</span>
                <span className="font-extrabold text-[#0F4C3A]">
                  {selectedLicense.user?.status || 'ACTIVE'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">License Duration:</span>
                <span className="font-bold text-slate-800">{selectedLicense.duration || 3} Months</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">License Start Date:</span>
                <span className="font-bold text-slate-800">
                  {selectedLicense.startDate
                    ? new Date(selectedLicense.startDate).toLocaleDateString('en-IN')
                    : 'Pending Super Admin approval'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">License Expiry Date:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedLicense.expiryDate
                    ? new Date(selectedLicense.expiryDate).toLocaleDateString('en-IN')
                    : '—'}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Assigned Modules ({(selectedLicense.moduleDetails || []).length})
              </span>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {(selectedLicense.moduleDetails || []).map((m: any) => (
                  <div
                    key={m.key}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <div>
                        <span className="font-bold text-slate-800 block">{m.name}</span>
                        {m.description && (
                          <span className="text-[10px] text-slate-400 block">{m.description}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      {m.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  openEditModulesModal(selectedLicense);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 text-[#0F4C3A] border border-emerald-200 py-1.5 px-4 rounded-lg font-bold cursor-pointer"
              >
                Edit Modules
              </button>
              <button
                onClick={() => setViewModalOpen(false)}
                className="bg-[#0F4C3A] text-white py-1.5 px-4 rounded-lg font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
