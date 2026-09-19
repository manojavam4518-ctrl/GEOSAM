'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Download, Edit2, Loader2, CheckCircle2, AlertCircle, Filter, Lock } from 'lucide-react';
import { exportSalarySlipPDF } from '@/utils/exportUtils';
import Modal from '@/components/Modal';

export default function PayrollPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Date filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [basicSalary, setBasicSalary] = useState('0');
  const [allowances, setAllowances] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState('UNPAID');
  const [remarks, setRemarks] = useState('');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  async function loadPayroll() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/organization/payroll?month=${selectedMonth}&year=${selectedYear}`);
      if (res.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setSalaryRecords(data.salaryRecords || []);
        setOrganization(data.organization || null);
      }
    } catch (err) {
      console.error('Failed to load payroll:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayroll();
  }, [selectedMonth, selectedYear]);

  function getSalaryRecordForEmp(empId: string) {
    return salaryRecords.find((r) => r.employeeId === empId);
  }

  function openEditSalaryModal(emp: any) {
    setSelectedEmp(emp);
    const rec = getSalaryRecordForEmp(emp.id);
    setBasicSalary(rec?.basicSalary !== undefined ? rec.basicSalary.toString() : (emp.basicSalary || 0).toString());
    setAllowances(rec?.allowances !== undefined ? rec.allowances.toString() : '0');
    setDeductions(rec?.deductions !== undefined ? rec.deductions.toString() : '0');
    setPaymentStatus(rec?.paymentStatus || 'UNPAID');
    setRemarks(rec?.remarks || '');
    setError('');
    setModalOpen(true);
  }

  const computedGross = (parseFloat(basicSalary) || 0) + (parseFloat(allowances) || 0);
  const computedNet = computedGross - (parseFloat(deductions) || 0);

  async function handleSaveSalary(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmp) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/organization/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmp.id,
          month: selectedMonth,
          year: selectedYear,
          basicSalary: parseFloat(basicSalary) || 0,
          allowances: parseFloat(allowances) || 0,
          deductions: parseFloat(deductions) || 0,
          paymentStatus,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save salary record.');
      }

      setMessage(`Salary details for ${selectedEmp.name} saved successfully.`);
      setModalOpen(false);
      await loadPayroll();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadSalarySlip(emp: any) {
    const rec = getSalaryRecordForEmp(emp.id) || {
      basicSalary: emp.basicSalary || 0,
      allowances: 0,
      deductions: 0,
      grossSalary: emp.basicSalary || 0,
      netSalary: emp.basicSalary || 0,
      paymentStatus: 'UNPAID',
    };

    const monthName = monthNames[selectedMonth - 1];
    await exportSalarySlipPDF(rec, emp, organization, monthName, selectedYear);
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
          <h1 className="text-xl font-bold text-[#0F4C3A]">Salary & Payroll Management</h1>
          <p className="text-xs text-slate-500 mt-1">Configure employee earnings, deductions, payment statuses, and generate PDF salary slips</p>
        </div>
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

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-[#0F4C3A]" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold focus:outline-none"
            >
              {monthNames.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value) || 2026)}
              className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs">
          No employees registered. Register employees to configure payroll.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Basic Salary</th>
                  <th className="px-4 py-3">Allowances</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3 font-bold">Net Salary</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const rec = getSalaryRecordForEmp(emp.id);
                  const basic = rec ? rec.basicSalary : (emp.basicSalary || 0);
                  const allow = rec ? rec.allowances : 0;
                  const ded = rec ? rec.deductions : 0;
                  const net = rec ? rec.netSalary : (basic + allow - ded);
                  const status = rec ? rec.paymentStatus : 'UNPAID';

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 mb-0.5">
                          {emp.employeeId}
                        </span>
                        <span className="block font-bold text-slate-900">{emp.name}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">INR {basic.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-medium text-emerald-600">+ INR {allow.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-medium text-red-600">- INR {ded.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-bold text-[#0F4C3A]">
                        INR {net.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => openEditSalaryModal(emp)}
                          className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit Salary
                        </button>
                        <button
                          onClick={() => handleDownloadSalarySlip(emp)}
                          className="py-1 px-2.5 rounded-lg bg-[#0F4C3A] hover:bg-[#1E8262] text-white text-[10px] font-bold transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          Salary Slip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Salary Modal */}
      <Modal
        isOpen={modalOpen && !!selectedEmp}
        onClose={() => setModalOpen(false)}
        title={selectedEmp ? `Configure Salary - ${selectedEmp.name} (${monthNames[selectedMonth - 1]} ${selectedYear})` : 'Configure Salary'}
        size="md"
      >
        <form onSubmit={handleSaveSalary} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Basic Salary (INR)</label>
            <input
              type="number"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#1c2e24] font-bold focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Allowances (INR)</label>
              <input
                type="number"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-emerald-700 font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Deductions (INR)</label>
              <input
                type="number"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-red-700 font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Calculated Summary */}
          <div className="bg-[#F4F7F6] p-3 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between font-medium text-slate-600">
              <span>Gross Salary:</span>
              <span className="font-bold text-slate-900">INR {computedGross.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-bold text-[#0F4C3A] text-sm pt-1 border-t border-slate-200">
              <span>Net Payable Salary:</span>
              <span>INR {computedNet.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-bold focus:outline-none"
            >
              <option value="UNPAID">UNPAID</option>
              <option value="PAID">PAID</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Paid via UPI"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none"
            />
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
              {saving ? 'Saving...' : 'Save Salary Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
