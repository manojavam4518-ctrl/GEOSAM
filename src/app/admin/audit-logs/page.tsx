'use client';

import React, { useEffect, useState } from 'react';
import { formatDateTimeIndian } from '@/utils/dateUtils';
import { History, Loader2, Info } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  async function loadLogs() {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      const res = await fetch(`/api/admin/audit-logs?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination);
        if (data.logs?.length > 0 && !selectedLog) {
          setSelectedLog(data.logs[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">System Action Audit Trails</h1>
        <p className="text-xs text-slate-500 mt-1">Audit administrative changes including payment approvals, pricing revisions, and session logouts</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs">
          No audit logs recorded in database yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Audit List Table (2 Columns) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Administrator</th>
                    <th className="px-4 py-3">Action Type</th>
                    <th className="px-4 py-3 text-right">Target Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`hover:bg-slate-50 cursor-pointer transition ${
                          isSelected ? 'bg-emerald-50/50 font-semibold' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTimeIndian(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-semibold">{log.adminEmail}</td>
                        <td className="px-4 py-3 text-slate-800">{log.action}</td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-[9px] truncate max-w-[80px]">
                          {log.relatedRecordId || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Metadata Inspector Panel (1 Column) */}
          <div className="space-y-4">
            {selectedLog && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-[#0F4C3A] text-white p-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider">Audit Log Details</h3>
                  <span className="block text-[8px] text-emerald-100 font-mono mt-0.5">{selectedLog.id}</span>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Timestamp</span>
                    <span className="text-slate-700 font-semibold">{formatDateTimeIndian(selectedLog.timestamp)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Admin Operator</span>
                    <span className="text-slate-700 font-semibold">{selectedLog.adminEmail}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Action Performed</span>
                    <span className="text-[#0F4C3A] font-bold text-sm">{selectedLog.action}</span>
                  </div>

                  {selectedLog.relatedRecordId && (
                    <div>
                      <span className="text-slate-400 block font-bold text-[9px] uppercase">Target Record ID</span>
                      <span className="text-slate-600 font-mono select-all bg-slate-50 px-2 py-0.5 rounded border text-[10px]">
                        {selectedLog.relatedRecordId}
                      </span>
                    </div>
                  )}

                  {selectedLog.metadata && (
                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-slate-400 block font-bold text-[9px] uppercase mb-1">Audit Metadata</span>
                      <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-1.5 px-3 rounded-lg text-xs font-bold disabled:opacity-50 transition"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-slate-500 self-center">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
            disabled={page === pagination.pages}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-1.5 px-3 rounded-lg text-xs font-bold disabled:opacity-50 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
