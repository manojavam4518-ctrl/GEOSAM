'use client';

import React, { useEffect, useState } from 'react';
import { formatDateTimeIndian } from '@/utils/dateUtils';
import { Smartphone, Monitor, Tablet, Loader2, LogOut, CheckCircle2 } from 'lucide-react';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function loadDevices() {
    try {
      const [meRes, devRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/devices')
      ]);

      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
      }

      if (devRes.ok) {
        const data = await devRes.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  async function handleLogoutDevice(sessionId: string) {
    if (!confirm('Are you sure you want to terminate this login session? The device will be logged out immediately.')) {
      return;
    }

    setActionLoading(sessionId);
    setMessage('');

    try {
      const res = await fetch('/api/devices/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to logout device.');
      }

      setMessage(data.message || 'Session terminated.');
      
      if (data.loggedOutSelf) {
        // Redirect to login if they logged out themselves
        window.location.href = '/login';
      } else {
        await loadDevices();
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  }

  function getDeviceIcon(type: string) {
    if (type === 'Mobile') return <Smartphone className="w-5 h-5" />;
    if (type === 'Tablet') return <Tablet className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  const deviceLimit = user?.isDemo ? 1 : user?.activeSubscription?.deviceLimit || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">My Active Devices</h1>
        <p className="text-xs text-slate-500 mt-1">Manage and monitor simultaneously logged-in client sessions</p>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Slots Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm max-w-md">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Licensing Allocation</h3>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-extrabold text-[#0F4C3A]">
              {devices.length} / {deviceLimit}
            </span>
            <span className="text-slate-500 text-xs font-medium ml-1">Active Slots Used</span>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase">
            {user?.isDemo ? 'Demo Mode' : 'Premium Mode'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-[#1E8262] h-full transition-all duration-300"
            style={{ width: `${Math.min(100, (devices.length / deviceLimit) * 100)}%` }}
          ></div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 font-light">
          If your device limit is full, remotely terminate any active session below to free up a slot instantly.
        </p>
      </div>

      {/* Devices List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-[#F4F7F6]">
          <h3 className="font-bold text-xs text-[#0F4C3A] uppercase tracking-wider">Session Logins</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {devices.map((dev) => (
            <div key={dev.id} className="p-5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex gap-4 items-start">
                <div className={`p-2.5 rounded-lg flex items-center justify-center shrink-0 ${
                  dev.isCurrent
                    ? 'bg-[#E8F5E9] text-[#0F4C3A] border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {getDeviceIcon(dev.deviceType)}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800">{dev.deviceName}</span>
                    {dev.isCurrent && (
                      <span className="bg-[#E8F5E9] text-[#0F4C3A] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200">
                        Current Session
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500 mt-1 leading-normal font-light">
                    Browser: <strong>{dev.browser}</strong> | OS: <strong>{dev.os}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Logged in: {formatDateTimeIndian(dev.loginDate)} | Active: {formatDateTimeIndian(dev.lastActive)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleLogoutDevice(dev.id)}
                disabled={actionLoading !== null}
                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-400 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                {actionLoading === dev.id ? 'Logging out...' : dev.isCurrent ? 'Log Out' : 'Remote Log Out'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
