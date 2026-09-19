'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Lock,
  Clock,
  LogIn,
  LogOut,
  HelpCircle,
  FileCheck,
  XCircle,
  User,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AttendancePage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'my_attendance' | 'daily' | 'monthly' | 'corrections'>('my_attendance');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Staff My Attendance State
  const [myToday, setMyToday] = useState<any>(null);
  const [myMonthlyRecords, setMyMonthlyRecords] = useState<any[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionStatus, setCorrectionStatus] = useState('PRESENT');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Admin Pending Corrections
  const [pendingCorrections, setPendingCorrections] = useState<any[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Admin Daily Mode State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyStatusMap, setDailyStatusMap] = useState<Record<string, { status: string; remarks: string }>>({});

  // Admin Monthly Mode State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          if (data.user?.isAdditionalUser) {
            setActiveTab('my_attendance');
          } else if (data.user?.role === 'ORG_ADMIN' || data.user?.role === 'ADMIN') {
            setActiveTab('daily');
          }
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err);
      }
    }
    init();
  }, []);

  async function loadMyAttendance() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/organization/attendance/my');
      if (res.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setMyToday(data.todayAttendance || null);
        setMyMonthlyRecords(data.monthlyAttendances || []);
      }
    } catch (err) {
      console.error('Failed to load my attendance:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    setCheckingIn(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/organization/attendance/check-in', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check in.');
      setMessage('Check-in recorded successfully!');
      await loadMyAttendance();
    } catch (err: any) {
      setError(err.message || 'Error checking in.');
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    setCheckingOut(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/organization/attendance/check-out', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check out.');
      setMessage(`Check-out recorded! Working Hours: ${data.attendance?.workingHours || 'N/A'}`);
      await loadMyAttendance();
    } catch (err: any) {
      setError(err.message || 'Error checking out.');
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleCorrectionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingCorrection(true);
    setError('');
    try {
      const res = await fetch('/api/organization/attendance/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: correctionDate,
          reason: correctionReason,
          requestedStatus: correctionStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit correction request.');
      setMessage('Attendance correction request submitted to Organization Admin.');
      setCorrectionModalOpen(false);
      setCorrectionReason('');
      await loadMyAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction.');
    } finally {
      setSubmittingCorrection(false);
    }
  }

  async function handleAdminCorrectionAction(attendanceId: string, decision: 'APPROVE' | 'REJECT') {
    setActionLoadingId(attendanceId);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/organization/attendance/correction', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId,
          decision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update correction request.');
      setMessage(`Correction request ${decision.toLowerCase()}d successfully.`);
      await loadDailyAttendance();
    } catch (err: any) {
      setError(err.message || 'Error updating correction.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function loadDailyAttendance() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/organization/attendance?date=${selectedDate}`);
      if (res.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setPendingCorrections(data.pendingCorrections || []);

        const initialMap: Record<string, { status: string; remarks: string }> = {};
        (data.employees || []).forEach((emp: any) => {
          const rec = (data.attendances || []).find((a: any) => a.employeeId === emp.id);
          initialMap[emp.id] = {
            status: rec ? rec.status : 'PRESENT',
            remarks: rec?.remarks || '',
          };
        });
        setDailyStatusMap(initialMap);
      }
    } catch (err) {
      console.error('Failed to load daily attendance:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonthlyAttendance() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/organization/attendance?month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setMonthlyRecords(data.attendances || []);
      }
    } catch (err) {
      console.error('Failed to load monthly attendance:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'my_attendance') {
      loadMyAttendance();
    } else if (activeTab === 'daily' || activeTab === 'corrections') {
      loadDailyAttendance();
    } else if (activeTab === 'monthly') {
      loadMonthlyAttendance();
    }
  }, [activeTab, selectedDate, selectedMonth, selectedYear]);

  function setEmployeeStatus(empId: string, status: string) {
    setDailyStatusMap((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status,
      },
    }));
  }

  function setEmployeeRemarks(empId: string, remarks: string) {
    setDailyStatusMap((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        remarks,
      },
    }));
  }

  async function handleSaveDailyAttendance() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const records = Object.entries(dailyStatusMap).map(([employeeId, val]) => ({
        employeeId,
        status: val.status,
        remarks: val.remarks,
      }));

      const res = await fetch('/api/organization/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save attendance.');
      setMessage(`Attendance for ${selectedDate} saved successfully.`);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }

  function getMonthlySummary(empId: string) {
    const empAtt = monthlyRecords.filter((a) => a.employeeId === empId);
    const present = empAtt.filter((a) => a.status === 'PRESENT').length;
    const absent = empAtt.filter((a) => a.status === 'ABSENT').length;
    const leave = empAtt.filter((a) => a.status === 'LEAVE').length;
    const halfDay = empAtt.filter((a) => a.status === 'HALF_DAY').length;

    return { present, absent, leave, halfDay, totalMarked: empAtt.length };
  }

  const isOrgAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'ADMIN';

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
              Organization Management capabilities are accessible exclusively through your GEO TRANSIT-issued <strong>Organization Admin (ORG_ADMIN)</strong> account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Attendance Register</h1>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'my_attendance'
              ? 'Log daily presence, clock check-in/check-out times, and request corrections'
              : 'Organization daily attendance marking, leaves, and monthly summaries'}
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('my_attendance')}
            className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'my_attendance' ? 'bg-[#0F4C3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Attendance
          </button>
          {isOrgAdmin && (
            <>
              <button
                onClick={() => setActiveTab('daily')}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'daily' ? 'bg-[#0F4C3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily Marking
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'monthly' ? 'bg-[#0F4C3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Summary
              </button>
              <button
                onClick={() => setActiveTab('corrections')}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'corrections' ? 'bg-[#0F4C3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Correction Requests</span>
                {pendingCorrections.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingCorrections.length}
                  </span>
                )}
              </button>
            </>
          )}
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

      {/* TAB 1: MY ATTENDANCE (STAFF & ADMIN) */}
      {activeTab === 'my_attendance' && (
        <div className="space-y-6">
          {/* Today's Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Attendance</span>
                <h3 className="text-base font-extrabold text-[#0F4C3A] mt-0.5">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Status:</span>
                {!myToday ? (
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                    Not Checked In
                  </span>
                ) : myToday.status === 'PRESENT' ? (
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    PRESENT
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
                    {myToday.status}
                  </span>
                )}
              </div>
            </div>

            {/* Check-In / Check-Out Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Check In Info */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Check In Time</span>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                    {myToday?.checkIn
                      ? new Date(myToday.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Check Out Info */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Check Out Time</span>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                    {myToday?.checkOut
                      ? new Date(myToday.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Working Hours */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Working Hours</span>
                  <p className="text-sm font-extrabold text-[#0F4C3A] mt-0.5">
                    {myToday?.workingHours || (myToday?.checkIn && !myToday?.checkOut ? 'In Progress' : '—')}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
              {!myToday?.checkIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2.5 px-6 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>CHECK IN NOW</span>
                </button>
              ) : !myToday?.checkOut ? (
                <button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white py-2.5 px-6 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  <span>CHECK OUT NOW</span>
                </button>
              ) : (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Day Completed ({myToday.workingHours})</span>
                </div>
              )}

              <button
                onClick={() => setCorrectionModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ml-auto"
              >
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>Request Attendance Correction</span>
              </button>
            </div>
          </div>

          {/* Monthly Attendance Records Table for Current User */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#0F4C3A] mb-4">My Monthly Attendance History</h3>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-[#1E8262] animate-spin" />
              </div>
            ) : myMonthlyRecords.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No attendance records logged for this month yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Check In</th>
                      <th className="py-2.5 px-3">Check Out</th>
                      <th className="py-2.5 px-3">Working Hours</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myMonthlyRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#0F4C3A]">
                          {r.workingHours || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'HALF_DAY'
                                ? 'bg-amber-100 text-amber-800'
                                : r.status === 'LEAVE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {r.correctionStatus === 'PENDING' ? (
                            <span className="text-amber-600 font-semibold">[Correction Pending] {r.remarks}</span>
                          ) : (
                            r.remarks || '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DAILY ATTENDANCE MARKING (ADMIN) */}
      {activeTab === 'daily' && isOrgAdmin && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0F4C3A]" />
              <span className="text-xs font-bold text-slate-700 uppercase">Select Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#1E8262]"
              />
            </div>

            <button
              onClick={handleSaveDailyAttendance}
              disabled={saving || employees.length === 0}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving Attendance...' : 'Save Attendance'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs">
              No active employees available to mark attendance.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{emp.name}</span>
                        <span className="text-[10px] text-slate-400">{emp.employeeId}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{emp.designation || 'Staff'}</td>
                      <td className="py-3 px-4">
                        <select
                          value={dailyStatusMap[emp.id]?.status || 'PRESENT'}
                          onChange={(e) => setEmployeeStatus(emp.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs font-bold text-slate-800"
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="ABSENT">ABSENT</option>
                          <option value="HALF_DAY">HALF DAY</option>
                          <option value="LEAVE">LEAVE</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Optional remarks"
                          value={dailyStatusMap[emp.id]?.remarks || ''}
                          onChange={(e) => setEmployeeRemarks(emp.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded p-1 text-xs text-slate-700 w-full max-w-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MONTHLY SUMMARY (ADMIN) */}
      {activeTab === 'monthly' && isOrgAdmin && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-4">
            <span className="text-xs font-bold text-slate-700 uppercase">Month & Year:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Present</th>
                  <th className="py-3 px-4">Absent</th>
                  <th className="py-3 px-4">Leave</th>
                  <th className="py-3 px-4">Half Day</th>
                  <th className="py-3 px-4">Paid Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const s = getMonthlySummary(emp.id);
                  const paidDays = s.present + s.leave + s.halfDay * 0.5;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">{emp.name}</td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold">{s.present}</td>
                      <td className="py-3 px-4 text-rose-600 font-semibold">{s.absent}</td>
                      <td className="py-3 px-4 text-blue-600 font-semibold">{s.leave}</td>
                      <td className="py-3 px-4 text-amber-600 font-semibold">{s.halfDay}</td>
                      <td className="py-3 px-4 text-[#0F4C3A] font-extrabold">{paidDays}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CORRECTION REQUESTS (ADMIN) */}
      {activeTab === 'corrections' && isOrgAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#0F4C3A]">Pending Staff Attendance Correction Requests</h3>
          {pendingCorrections.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No pending correction requests.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingCorrections.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-slate-800 text-xs">{item.employee?.name || 'Employee'}</span>
                    <span className="text-[10px] text-slate-400 ml-2">
                      Date: {new Date(item.date).toLocaleDateString('en-IN')}
                    </span>
                    <p className="text-xs text-slate-600 mt-1">
                      Reason: <span className="font-medium text-slate-800">{item.correctionReason || 'Not specified'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAdminCorrectionAction(item.id, 'APPROVE')}
                      disabled={actionLoadingId === item.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAdminCorrectionAction(item.id, 'REJECT')}
                      disabled={actionLoadingId === item.id}
                      className="bg-rose-600 hover:bg-rose-700 text-white py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: REQUEST ATTENDANCE CORRECTION */}
      {correctionModalOpen && (
        <Modal
          isOpen={correctionModalOpen}
          onClose={() => setCorrectionModalOpen(false)}
          title="Request Attendance Correction"
        >
          <form onSubmit={handleCorrectionSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Attendance Date</label>
              <input
                type="date"
                value={correctionDate}
                onChange={(e) => setCorrectionDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Requested Status</label>
              <select
                value={correctionStatus}
                onChange={(e) => setCorrectionStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none font-bold"
              >
                <option value="PRESENT">PRESENT</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="LEAVE">LEAVE</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for Correction</label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                required
                rows={3}
                placeholder="Describe why your attendance needs correction (e.g., forgot to check out, system network error)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingCorrection}
                className="px-5 py-2 bg-[#0F4C3A] hover:bg-[#1E8262] text-white rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {submittingCorrection ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Submit Correction Request</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
