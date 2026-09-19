'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, Plus, Edit2, UserCheck, UserX, Loader2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import Modal from '@/components/Modal';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [joiningDate, setJoiningDate] = useState('');

  async function loadEmployees() {
    setLoading(true);
    try {
      const q = new URLSearchParams({ search, status: statusFilter });
      const res = await fetch(`/api/organization/employees?${q.toString()}`);
      if (res.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, [statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadEmployees();
  }

  function openCreateModal() {
    setEditingEmp(null);
    setName('');
    setMobile('');
    setEmail('');
    setDesignation('Employee');
    setDepartment('General');
    setBasicSalary('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(emp: any) {
    setEditingEmp(emp);
    setName(emp.name || '');
    setMobile(emp.mobile || '');
    setEmail(emp.email || '');
    setDesignation(emp.designation || 'Employee');
    setDepartment(emp.department || 'General');
    setBasicSalary(emp.basicSalary ? emp.basicSalary.toString() : '');
    setJoiningDate(emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '');
    setError('');
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name || !mobile) {
      setError('Employee name and mobile number are required.');
      return;
    }

    setSaving(true);
    try {
      const method = editingEmp ? 'PUT' : 'POST';
      const body: any = {
        name,
        mobile,
        email,
        designation,
        department,
        basicSalary: basicSalary ? parseFloat(basicSalary) : 0,
        joiningDate,
      };

      if (editingEmp) {
        body.id = editingEmp.id;
      }

      const res = await fetch('/api/organization/employees', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save employee.');
      }

      setMessage(data.message || 'Employee saved successfully.');
      setModalOpen(false);
      await loadEmployees();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(emp: any) {
    const nextStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`Are you sure you want to set ${emp.name} to ${nextStatus}?`)) return;

    try {
      const res = await fetch('/api/organization/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: emp.id,
          name: emp.name,
          mobile: emp.mobile,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        setMessage(`Employee ${emp.name} is now ${nextStatus}.`);
        await loadEmployees();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }

  if (isForbidden) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F4C3A]">Organization Admin Access Required</h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
              Organization Management capabilities (Employee Directory, Attendance Register, Payroll & Salary Slips) are accessible exclusively through your GEO TRANSIT-issued <strong>Organization Admin (ORG_ADMIN)</strong> account.
            </p>
          </div>
          <div className="bg-white border border-amber-200 rounded-xl p-4 max-w-lg mx-auto text-left text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">How to access this feature:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Purchase an active subscription (Minimum 2-device plan).</li>
              <li>Once payment is approved, your Organization Admin credentials are sent to your email.</li>
              <li>Log in using the ORG_ADMIN credentials to manage employees, attendance, and payroll.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Employee Management</h1>
          <p className="text-xs text-slate-500 mt-1">Register, view, filter, and manage employees in your organization</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Register New Employee
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, phone, designation..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-[#1E8262] text-[#1c2e24]"
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
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs p-1.5 focus:bg-white focus:outline-none text-slate-700"
          >
            <option value="">All Employees</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs">
          No employees registered yet. Click &quot;Register New Employee&quot; to add one.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ID & Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Role & Dept</th>
                  <th className="px-4 py-3">Basic Salary</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 mb-0.5">
                        {emp.employeeId}
                      </span>
                      <span className="block font-bold text-slate-900">{emp.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="block font-mono">{emp.mobile}</span>
                      {emp.email && <span className="block text-[10px]">{emp.email}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold block text-slate-800">{emp.designation}</span>
                      <span className="text-[10px] text-slate-400 block">{emp.department}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0F4C3A]">
                      INR {(emp.basicSalary || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                          emp.status === 'ACTIVE'
                            ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {emp.status === 'ACTIVE' ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEmp ? 'Edit Employee Details' : 'Register New Employee'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#1c2e24] focus:outline-none focus:border-[#1E8262]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mobile / Phone *</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#1c2e24] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#1c2e24] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Logistics Manager"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Operations"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Basic Salary (INR)</label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                placeholder="25000"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-5 rounded-lg font-bold text-xs transition cursor-pointer"
            >
              {saving ? 'Saving...' : editingEmp ? 'Update Employee' : 'Register Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
