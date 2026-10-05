import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Search, Filter, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogsPage() {
  const { activeOrg, canViewAuditLogs } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (activeOrg && canViewAuditLogs) {
      fetchAuditLogs(1);
    }
  }, [activeOrg, search, actionFilter, entityFilter, startDate, endDate]);

  const fetchAuditLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        organizationId: activeOrg._id,
        page,
        limit: 15,
      });

      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity', entityFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!canViewAuditLogs) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center space-y-3 max-w-md mx-auto">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-100">Access Denied</h3>
        <p className="text-xs text-slate-400">
          Audit logs are strictly reserved for Organization ADMIN and OWNER roles.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>Organization Audit Logs</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Complete security audit trail of all task, project, and member actions in {activeOrg?.name}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or entity..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-slate-200 outline-none focus:border-indigo-500"
          />
        </div>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="">All Actions</option>
          <option value="TASK_CREATE">TASK_CREATE</option>
          <option value="TASK_UPDATE">TASK_UPDATE</option>
          <option value="TASK_STATUS_CHANGE">TASK_STATUS_CHANGE</option>
          <option value="TASK_ASSIGNEE_CHANGE">TASK_ASSIGNEE_CHANGE</option>
          <option value="TASK_DELETE">TASK_DELETE</option>
          <option value="MEMBER_ADD">MEMBER_ADD</option>
          <option value="MEMBER_REMOVE">MEMBER_REMOVE</option>
        </select>

        {/* Entity Filter */}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="">All Entities</option>
          <option value="TASK">TASK</option>
          <option value="PROJECT">PROJECT</option>
          <option value="MEMBER">MEMBER</option>
          <option value="ORGANIZATION">ORGANIZATION</option>
        </select>

        {/* Reset */}
        <button
          onClick={() => {
            setSearch('');
            setActionFilter('');
            setEntityFilter('');
            setStartDate('');
            setEndDate('');
          }}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
        >
          Reset Filters
        </button>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading audit logs...</div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Entity</th>
                    <th className="p-3.5">Old Value</th>
                    <th className="p-3.5">New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 font-sans">
                        No audit log entries matching filters.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 text-slate-400 font-sans">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3.5 font-semibold text-indigo-300 font-sans">
                          {log.user?.name || log.user?.email || 'User'}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">{log.entity}</td>
                        <td className="p-3.5 text-rose-300/80 truncate max-w-[150px]">
                          {log.oldValue ? JSON.stringify(log.oldValue) : '-'}
                        </td>
                        <td className="p-3.5 text-emerald-300/80 truncate max-w-[150px]">
                          {log.newValue ? JSON.stringify(log.newValue) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3.5 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing page <span className="font-semibold text-slate-200">{pagination.page}</span> of{' '}
                <span className="font-semibold text-slate-200">{pagination.totalPages}</span> ({pagination.total} total logs)
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchAuditLogs(pagination.page - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchAuditLogs(pagination.page + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
