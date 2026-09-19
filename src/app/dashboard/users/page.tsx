'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Check,
  RefreshCw,
  UserX,
  KeyRound,
  Layers,
  Sparkles,
  ShoppingCart,
  Minus,
  Info,
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

  // Predefined Roles & Payment Settings
  const [predefinedRoles, setPredefinedRoles] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  // STAGE 1: BUY USERS MODAL STATE
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buyUsersCount, setBuyUsersCount] = useState<number>(1);
  const [buyDuration, setBuyDuration] = useState<number>(3);
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [buyPaymentMethod, setBuyPaymentMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [buyUtr, setBuyUtr] = useState('');
  const [submittingBuy, setSubmittingBuy] = useState(false);

  // STAGE 2: ADD USER MODAL STATE
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addMobile, setAddMobile] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addRoleId, setAddRoleId] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // EDIT ROLE MODAL STATE
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [targetUserForRole, setTargetUserForRole] = useState<any | null>(null);
  const [newSelectedRoleId, setNewSelectedRoleId] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);

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

  // Fetch roles and payment settings on mount
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [rolesRes, payRes] = await Promise.all([
          fetch('/api/organization/roles'),
          fetch('/api/admin/settings/payment'),
        ]);

        if (rolesRes.ok) {
          const rData = await rolesRes.json();
          const activeRoles = rData.roles || [];
          setPredefinedRoles(activeRoles);
          if (activeRoles.length > 0) {
            setAddRoleId(activeRoles[0].id);
          }
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

  // Fetch live parent subscription eligibility when buying users
  async function fetchEligibility(duration: number, count: number) {
    setCheckingEligibility(true);
    try {
      const res = await fetch(
        `/api/organization/user-licenses/eligibility?duration=${duration}&usersCount=${count}`
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

  // Open Stage 1: Buy Users Modal
  function openBuyModal() {
    setError('');
    setMessage('');
    setBuyUsersCount(1);
    setBuyDuration(3);
    setBuyUtr('');
    setBuyPaymentMethod('UPI');
    setBuyModalOpen(true);
    fetchEligibility(3, 1);
  }

  // Handle duration change in Buy Modal
  function handleDurationChange(duration: number) {
    setBuyDuration(duration);
    fetchEligibility(duration, buyUsersCount);
  }

  // Handle users count change in Buy Modal
  function handleCountChange(newCount: number) {
    const validCount = Math.max(1, newCount);
    setBuyUsersCount(validCount);
    fetchEligibility(buyDuration, validCount);
  }

  // Submit Stage 1: Buy Users Payment Order
  async function handleBuySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!buyUtr.trim()) {
      setError('Please enter the Payment Transaction ID / UTR.');
      return;
    }

    setSubmittingBuy(true);
    try {
      const res = await fetch('/api/organization/user-licenses/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usersCount: buyUsersCount,
          duration: buyDuration,
          paymentMethod: buyPaymentMethod,
          utr: buyUtr.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit user license purchase.');
      }

      setMessage(
        data.message ||
          `Purchase submitted for ${buyUsersCount} user license(s). Awaiting Super Admin payment approval.`
      );
      setBuyModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'An error occurred during purchase.');
    } finally {
      setSubmittingBuy(false);
    }
  }

  // Open Stage 2: Add User Modal
  function openAddModal() {
    if (licenseCapacity.available <= 0) {
      setError(
        'No user licenses are currently available. Purchase additional users to create another account.'
      );
      openBuyModal();
      return;
    }

    setAddName('');
    setAddEmail('');
    setAddMobile('');
    setAddPassword('');
    setShowAddPassword(false);
    if (predefinedRoles.length > 0 && !addRoleId) {
      setAddRoleId(predefinedRoles[0].id);
    }
    setError('');
    setMessage('');
    setAddModalOpen(true);
  }

  // Selected role in Add Modal
  const activeSelectedRole = predefinedRoles.find((r) => r.id === addRoleId) || null;

  // Submit Stage 2: Create User Account
  async function handleCreateUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!addName.trim() || !addEmail.trim()) {
      setError('Name and Email are required.');
      return;
    }

    if (!addPassword || addPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!addRoleId) {
      setError('Please select a predefined role.');
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
          roleId: addRoleId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account.');
      }

      setMessage(
        data.message ||
          `User account '${addName.trim()}' created successfully! Credentials emailed to ${addEmail.trim()}.`
      );
      setAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating user.');
    } finally {
      setCreatingUser(false);
    }
  }

  // Open Edit Role Modal
  function openEditRoleModal(userRecord: any) {
    setTargetUserForRole(userRecord);
    setNewSelectedRoleId(userRecord.assignedRoleId || (predefinedRoles[0]?.id || ''));
    setError('');
    setMessage('');
    setEditRoleModalOpen(true);
  }

  const activeNewRole = predefinedRoles.find((r) => r.id === newSelectedRoleId) || null;

  // Submit Edit Role
  async function handleEditRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUserForRole || !newSelectedRoleId) return;

    setUpdatingRole(true);
    setError('');
    try {
      const res = await fetch(`/api/organization/users/${targetUserForRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: newSelectedRoleId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role.');
      }

      setMessage(data.message || `Role updated successfully to ${activeNewRole?.name}.`);
      setEditRoleModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update role.');
    } finally {
      setUpdatingRole(false);
    }
  }

  // Toggle User Active / Disabled Status
  async function handleToggleUserStatus(userId: string, currentStatus: string) {
    const targetStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (
      !confirm(
        `Are you sure you want to ${targetStatus === 'ACTIVE' ? 'activate' : 'deactivate'} this user account?`
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

  // Submit Reset Password
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

      setMessage(data.message || 'Password updated successfully.');
      setPasswordModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  }

  if (isForbidden) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F4C3A]">Organization Admin Access Required</h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
              User Accounts management is accessible exclusively through your GEO TRANSIT-issued{' '}
              <strong>Organization Admin (ORG_ADMIN)</strong> account.
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
            <h1 className="text-xl font-bold text-[#0F4C3A]">User Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Purchase user license capacity, provision staff accounts with predefined roles, and manage module permissions.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openBuyModal}
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            Buy Users
          </button>
          <button
            onClick={openAddModal}
            disabled={licenseCapacity.available <= 0}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              licenseCapacity.available > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={
              licenseCapacity.available <= 0
                ? 'No user licenses available. Click "Buy Users" first.'
                : 'Add a new user account'
            }
          >
            <Plus className="w-4 h-4" />
            Add User
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

      {/* USER LICENSES CAPACITY BANNER (Section 38) */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0F4C3A]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                USER LICENSES ALLOCATION
              </span>
            </div>
            <div className="flex items-center gap-6 mt-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Purchased</span>
                <span className="block text-2xl font-black text-slate-900">
                  {licenseCapacity.purchased}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Used</span>
                <span className="block text-2xl font-black text-slate-700">
                  {licenseCapacity.used}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600">Available</span>
                <span className="block text-2xl font-black text-emerald-700">
                  {licenseCapacity.available}
                </span>
              </div>
              <div className="hidden lg:block h-8 w-px bg-slate-200" />
              <div className="hidden lg:block">
                <span className="text-[10px] uppercase font-bold text-slate-400">Parent Subscription Remaining</span>
                <span className="block text-sm font-extrabold text-[#0F4C3A] mt-1">
                  {remainingOrgDays} Days {orgSubscriptionExpiry ? `(Expires ${new Date(orgSubscriptionExpiry).toLocaleDateString('en-IN')})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 md:pt-0">
            <button
              onClick={openBuyModal}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              Buy More Users
            </button>
            <button
              onClick={openAddModal}
              disabled={licenseCapacity.available <= 0}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                licenseCapacity.available > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Warning if no available user licenses (Section 38) */}
        {licenseCapacity.available <= 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                No user licenses are currently available. Purchase additional users to create another account.
              </span>
            </div>
            <button
              onClick={openBuyModal}
              className="font-bold underline text-amber-900 hover:text-amber-950 shrink-0 cursor-pointer ml-2"
            >
              Purchase Users Now →
            </button>
          </div>
        )}
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
              placeholder="Search users by name, email, phone, or role..."
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
            <option value="INACTIVE">Disabled</option>
          </select>
        </div>
      </div>

      {/* User Accounts Management Table (Section 37) */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[220px]">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : userLicenses.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl text-slate-400 font-medium text-xs shadow-2xs">
          No additional user accounts created yet.{' '}
          {licenseCapacity.available > 0 ? (
            <button
              onClick={openAddModal}
              className="text-[#0F4C3A] font-bold underline hover:text-[#1E8262]"
            >
              Click here to Add a User
            </button>
          ) : (
            <button
              onClick={openBuyModal}
              className="text-[#0F4C3A] font-bold underline hover:text-[#1E8262]"
            >
              Click here to Buy User Licenses
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Modules Assigned</th>
                  <th className="px-4 py-3">License Validity</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userLicenses.map((lic) => {
                  const now = new Date();
                  const isExpired =
                    lic.status === 'EXPIRED' ||
                    (lic.expiryDate && new Date(lic.expiryDate) < now);
                  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                  const isExpiringSoon =
                    lic.status === 'ACTIVE' &&
                    lic.expiryDate &&
                    new Date(lic.expiryDate) <= sevenDays &&
                    !isExpired;

                  const userAccount = lic.user;
                  const isUserDisabled = userAccount && userAccount.status === 'DISABLED';

                  return (
                    <tr key={lic.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className="block font-bold text-slate-900 text-xs">
                          {lic.userName || userAccount?.name}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {lic.userMobile || userAccount?.mobile}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-700">
                        {lic.userEmail || userAccount?.email}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-[#0F4C3A] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <Shield className="w-3 h-3 text-[#0F4C3A]" />
                          {lic.roleName || userAccount?.assignedRoleName || 'Unassigned'}
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {(lic.moduleDetails || []).map((m: any) => (
                            <span
                              key={m.key}
                              className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {m.name}
                            </span>
                          ))}
                        </div>
                        <span className="block text-[9px] text-slate-400 font-bold mt-1">
                          {(lic.assignedModules || []).length} modules assigned
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-800 font-semibold">
                        <span className="block font-extrabold text-xs text-slate-900">
                          {lic.duration ? `${lic.duration} Months` : 'Standard'}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          Expires:{' '}
                          {lic.expiryDate
                            ? new Date(lic.expiryDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Active'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isUserDisabled ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Disabled
                          </span>
                        ) : isExpired ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-red-50 text-red-800 border border-red-200">
                            Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Expiring Soon
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedLicense(lic);
                            setViewModalOpen(true);
                          }}
                          className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          title="View user modules and license"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>

                        {userAccount && (
                          <>
                            <button
                              onClick={() => openEditRoleModal(userAccount)}
                              className="py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer border border-emerald-200"
                              title="Edit user predefined role"
                            >
                              <Shield className="w-3 h-3" />
                              Change Role
                            </button>

                            <button
                              onClick={() => handleToggleUserStatus(userAccount.id, userAccount.status)}
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
                              Reset Password
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
      {/* STAGE 1: BUY ADDITIONAL USERS MODAL (Section 5 - 14)      */}
      {/* ========================================================= */}
      <Modal
        isOpen={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        title="BUY ADDITIONAL USERS"
        size="lg"
      >
        <form onSubmit={handleBuySubmit} className="space-y-4 text-xs">
          {/* Quantity Selector (Section 5) */}
          <div>
            <label className="block text-[10.5px] font-bold text-slate-700 uppercase mb-2">
              How many users do you want to purchase?
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <button
                  type="button"
                  onClick={() => handleCountChange(buyUsersCount - 1)}
                  disabled={buyUsersCount <= 1}
                  className="p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={buyUsersCount}
                  onChange={(e) => handleCountChange(parseInt(e.target.value, 10) || 1)}
                  className="w-16 text-center font-black text-sm bg-transparent border-x border-slate-200 p-2 text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCountChange(buyUsersCount + 1)}
                  className="p-2 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick count chips */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleCountChange(num)}
                    className={`py-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer border ${
                      buyUsersCount === num
                        ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num} {num === 1 ? 'User' : 'Users'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* License Duration Selector (Section 5, 6, 7) */}
          <div>
            <label className="block text-[10.5px] font-bold text-slate-700 uppercase mb-2">
              License Duration *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { months: 3, label: '3 Months' },
                { months: 6, label: '6 Months' },
                { months: 12, label: '12 Months' },
              ].map((item) => {
                const selected = buyDuration === item.months;
                return (
                  <div
                    key={item.months}
                    onClick={() => handleDurationChange(item.months)}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer text-center ${
                      selected
                        ? 'border-[#0F4C3A] bg-emerald-50/70 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="block font-black text-xs text-slate-900">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PARENT SUBSCRIPTION REMAINING & PRORATION CHECK (Sections 8, 9, 10, 11, 12) */}
          {checkingEligibility ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#1E8262]" />
              <span>Calculating parent subscription eligibility & price...</span>
            </div>
          ) : eligibilityData ? (
            <div className="space-y-3">
              {/* Organization Subscription Remaining */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Organization subscription remaining:</span>
                <span className="font-black text-slate-900 text-sm">
                  {eligibilityData.remainingSubscriptionDays} Days
                </span>
              </div>

              {/* Warning when requested duration exceeds remaining days (Section 9 & 10) */}
              {eligibilityData.isProrated && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-xs">
                        ⚠ {eligibilityData.selectedDurationMonths} Months is not available because the organization subscription expires in {eligibilityData.remainingSubscriptionDays} days.
                      </span>
                      <span className="text-[11px] text-amber-800 block mt-0.5">
                        User licenses cannot extend beyond the organization subscription expiry date.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/80 text-[11px]">
                    <div>
                      <span className="text-amber-700">Selected User License:</span>
                      <span className="font-bold block text-amber-950">
                        {eligibilityData.selectedDurationMonths} Months ({eligibilityData.selectedStandardDays} Days)
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-700">Maximum eligible period:</span>
                      <span className="font-bold block text-amber-950">
                        {eligibilityData.maxAvailableDays} Days
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Calculation Summary (Section 7, 11, 12) */}
              <div className="bg-[#F4F7F6] border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Configured duration price:</span>
                  <span className="font-bold text-slate-800">
                    ₹{eligibilityData.configuredPricePerUser.toLocaleString('en-IN')} / user
                  </span>
                </div>
                {eligibilityData.isProrated && (
                  <div className="flex justify-between border-b border-slate-200/80 pb-2 text-amber-800">
                    <span>Prorated Amount Per User ({eligibilityData.maxAvailableDays} Days):</span>
                    <span className="font-bold">
                      ₹{eligibilityData.calculatedPricePerUser.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Price per User:</span>
                  <span className="font-extrabold text-slate-900">
                    ₹{eligibilityData.calculatedPricePerUser.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Number of Users:</span>
                  <span className="font-extrabold text-slate-900">{buyUsersCount}</span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-black text-slate-900">
                  <span>Total Payable:</span>
                  <span className="text-base text-[#0F4C3A]">
                    ₹{eligibilityData.totalPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Payment Details Box (Section 14 & 34) */}
          {paymentSettings && (
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 space-y-2 text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#0F4C3A]">
                GEO TRANSIT Payment Gateway Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">UPI Payment</span>
                  <span className="block font-mono font-bold text-slate-800">
                    {paymentSettings.upiId || 'geotransit@upi'}
                  </span>
                  <span className="block text-[9.5px] text-slate-500">
                    {paymentSettings.upiName || 'GEO TRANSIT Enterprise'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Bank Account</span>
                  <span className="block font-mono font-bold text-slate-800">
                    {paymentSettings.bankName || 'HDFC Bank'}
                  </span>
                  <span className="block text-[9.5px] text-slate-500">
                    A/C: {paymentSettings.bankAccountNumber || '50200012345678'} (IFSC: {paymentSettings.bankIfsc || 'HDFC0001234'})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method & UTR Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Payment Method *
              </label>
              <select
                value={buyPaymentMethod}
                onChange={(e: any) => setBuyPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-none"
              >
                <option value="UPI">UPI Direct Transfer</option>
                <option value="BANK_TRANSFER">Bank IMPS / NEFT Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Payment Reference / UTR *
              </label>
              <input
                type="text"
                value={buyUtr}
                onChange={(e) => setBuyUtr(e.target.value)}
                placeholder="e.g. 423456789012"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#1E8262]"
                required
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setBuyModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingBuy || !eligibilityData?.hasActiveSubscription}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-6 rounded-lg font-bold transition cursor-pointer shadow-sm"
            >
              {submittingBuy ? 'Submitting Order...' : 'PROCEED TO PAYMENT'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* STAGE 2: ADD USER MODAL (Section 15 - 20)                 */}
      {/* ========================================================= */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="ADD USER ACCOUNT"
        size="md"
      >
        <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <span>
              Available User Licenses: <strong>{licenseCapacity.available} remaining</strong>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
              Slot Consumed on Save
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#1E8262]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Email Address (Login Username) *
              </label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Mobile / Phone Number *
              </label>
              <input
                type="text"
                value={addMobile}
                onChange={(e) => setAddMobile(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Initial Password *
            </label>
            <div className="relative">
              <input
                type={showAddPassword ? 'text' : 'password'}
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pr-10 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#1E8262]"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowAddPassword(!showAddPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Password will be securely hashed with bcrypt. Never stored or recoverable in plaintext.
            </p>
          </div>

          {/* Role Selection (Section 17 & 18) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Select Predefined Role *
            </label>
            <select
              value={addRoleId}
              onChange={(e) => setAddRoleId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-extrabold focus:outline-none text-xs focus:border-[#1E8262]"
              required
            >
              {predefinedRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.modulesCount || r.modules?.length || 0} Modules)
                </option>
              ))}
            </select>
          </div>

          {/* Automatically Display Assigned Modules (Section 18) */}
          {activeSelectedRole && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Assigned Modules for {activeSelectedRole.name} (Read-Only)
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(activeSelectedRole.modules || []).map((m: any) => (
                  <div
                    key={m.key}
                    className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-bold text-slate-800">{m.name}</span>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase">
                      {m.category}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[9.5px] text-slate-400 italic">
                The Organization Admin cannot alter this module list. Modules strictly follow the predefined role.
              </p>
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
              disabled={creatingUser}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-6 rounded-lg font-bold transition cursor-pointer shadow-sm"
            >
              {creatingUser ? 'Creating User...' : 'CREATE USER'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* EDIT ROLE MODAL (Section 26 & 27)                         */}
      {/* ========================================================= */}
      {targetUserForRole && editRoleModalOpen && (
        <Modal
          isOpen={editRoleModalOpen}
          onClose={() => setEditRoleModalOpen(false)}
          title={`Edit Predefined Role — ${targetUserForRole.name}`}
          size="md"
        >
          <form onSubmit={handleEditRoleSubmit} className="space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-slate-500 font-medium">Current Role: </span>
              <span className="font-bold text-slate-800">
                {targetUserForRole.assignedRoleName || 'Unassigned'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Select New Role *
              </label>
              <select
                value={newSelectedRoleId}
                onChange={(e) => setNewSelectedRoleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-extrabold focus:outline-none text-xs focus:border-[#1E8262]"
                required
              >
                {predefinedRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.modulesCount || r.modules?.length || 0} Modules)
                  </option>
                ))}
              </select>
            </div>

            {activeNewRole && (
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider">
                  New Module Entitlements for {activeNewRole.name}
                </span>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(activeNewRole.modules || []).map((m: any) => (
                    <div
                      key={m.key}
                      className="p-2 bg-white border border-emerald-100 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-slate-800">{m.name}</span>
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase">
                        {m.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditRoleModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingRole}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-5 rounded-lg font-bold transition cursor-pointer"
              >
                {updatingRole ? 'Updating Role...' : 'Save Role & Modules'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* RESET PASSWORD MODAL (Section 22)                         */}
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
                Passwords must remain securely hashed. Never stored or visible in plaintext.
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
      {/* VIEW DETAILS MODAL                                        */}
      {/* ========================================================= */}
      {selectedLicense && viewModalOpen && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`User Account Details — ${selectedLicense.userName || selectedLicense.user?.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-[#F4F7F6] p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">User Name:</span>
                <span className="font-bold text-slate-900">
                  {selectedLicense.userName || selectedLicense.user?.name}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">User Email:</span>
                <span className="font-bold text-slate-900">
                  {selectedLicense.userEmail || selectedLicense.user?.email}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Contact Number:</span>
                <span className="font-bold text-slate-900">
                  {selectedLicense.userMobile || selectedLicense.user?.mobile}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Assigned Predefined Role:</span>
                <span className="font-extrabold text-[#0F4C3A]">
                  {selectedLicense.roleName || selectedLicense.user?.assignedRoleName}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">License Duration:</span>
                <span className="font-bold text-slate-800">{selectedLicense.duration} Months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">License Expiry Date:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedLicense.expiryDate
                    ? new Date(selectedLicense.expiryDate).toLocaleDateString('en-IN')
                    : 'Active'}
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
                    className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-bold text-slate-800">{m.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      {m.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
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
