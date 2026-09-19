'use client';

import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle2, Loader2, Send } from 'lucide-react';

export default function AdminSmtpSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState('TLS');
  const [fromName, setFromName] = useState('GEO TRANSIT Support');
  const [fromEmail, setFromEmail] = useState('');
  
  // Test email state
  const [testRecipient, setTestRecipient] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings/smtp');
        if (res.ok) {
          const data = await res.json();
          const s = data.smtp;
          setHost(s.host || '');
          setPort(s.port.toString());
          setUsername(s.username || '');
          setPassword(s.hasPassword ? '*****' : '');
          setEncryption(s.encryption || 'TLS');
          setFromName(s.fromName || 'GEO TRANSIT');
          setFromEmail(s.fromEmail || '');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!host || !port || !username || !fromEmail) {
      setError('Host, Port, Username and From Email are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: parseInt(port) || 587,
          username,
          password,
          encryption,
          fromName,
          fromEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings.');
      }

      setMessage(data.message || 'SMTP Settings saved.');
      setPassword('*****'); // Mask password on success
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTestEmail(e: React.MouseEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!testRecipient) {
      setError('Please provide a recipient email address to send the test message.');
      return;
    }

    setTesting(true);
    try {
      const res = await fetch('/api/admin/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: parseInt(port) || 587,
          username,
          password,
          encryption,
          fromName,
          fromEmail,
          isTest: true,
          testRecipient,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Test email failed.');
      }

      setMessage(data.message || 'Test email sent successfully.');
    } catch (err: any) {
      setError(err.message || 'An error occurred during test email delivery.');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">SMTP Mailer Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure physical outgoing mail server SMTP connections and test delivery paths</p>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form: SMTP coordinate configs (2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider border-b pb-2 mb-4">
              Mailer Coordinates
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#1c2e24] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="587"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="smtp_user_id"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#1c2e24] focus:outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Password / App Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#1c2e24] focus:outline-none font-mono"
                  required
                />
                <p className="text-[9px] text-slate-400 mt-1 font-normal">
                  For Gmail (smtp.gmail.com), use a 16-character Google App Password.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Encryption Mode</label>
                <select
                  value={encryption}
                  onChange={(e) => setEncryption(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none"
                >
                  <option value="TLS">STARTTLS (587)</option>
                  <option value="SSL">SSL/TLS (465)</option>
                  <option value="NONE">Unencrypted (25/8025)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Name</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Email Address</label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="no-reply@geotransit.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#1c2e24] focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2.5 rounded-lg font-bold text-xs transition mt-6 shadow-md"
            >
              {saving ? 'Saving mailer details...' : 'Save SMTP Coordinate details'}
            </button>
          </form>
        </div>

        {/* Right Panel: Send Test Email (1 Column) */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider border-b pb-2">
            Send Test Message
          </span>
          <p className="text-[11px] text-slate-500 font-light leading-relaxed">
            Verify if the saved SMTP configurations can successfully handshake and deliver messages.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Recipient Address</label>
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="test@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:outline-none"
              />
            </div>

            <button
              onClick={handleSendTestEmail}
              disabled={testing || !host || !username}
              className="w-full bg-[#1E8262] hover:bg-[#0F4C3A] disabled:bg-slate-200 text-white py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Test Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
