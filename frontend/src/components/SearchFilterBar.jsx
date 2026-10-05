import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, User, Tag, SlidersHorizontal } from 'lucide-react';

export default function SearchFilterBar({ filters, onFilterChange, members = [] }) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced search text 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onFilterChange({ search: searchTerm });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const clearFilters = () => {
    setSearchTerm('');
    onFilterChange({
      search: '',
      status: '',
      priority: '',
      assignee: '',
      labels: '',
      dueBefore: '',
      dueAfter: '',
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.priority ||
    filters.assignee ||
    filters.labels ||
    filters.dueBefore ||
    filters.dueAfter;

  return (
    <div className="glass-panel p-3.5 rounded-2xl mb-6 space-y-3 border border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks by title or description..."
            className="w-full bg-slate-900/90 border border-slate-700/70 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-400 outline-none transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Selects */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="bg-slate-900/90 border border-slate-700/70 text-slate-300 text-xs rounded-xl px-2.5 py-2 outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority || ''}
            onChange={(e) => onFilterChange({ priority: e.target.value })}
            className="bg-slate-900/90 border border-slate-700/70 text-slate-300 text-xs rounded-xl px-2.5 py-2 outline-none focus:border-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={filters.assignee || ''}
            onChange={(e) => onFilterChange({ assignee: e.target.value })}
            className="bg-slate-900/90 border border-slate-700/70 text-slate-300 text-xs rounded-xl px-2.5 py-2 outline-none focus:border-indigo-500"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.user._id} value={m.user._id}>
                {m.user.name}
              </option>
            ))}
          </select>

          {/* Toggle Advanced Filters */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors border ${
              showAdvanced || filters.labels || filters.dueBefore || filters.dueAfter
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 font-medium flex items-center space-x-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Expansion */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Filter by Label
            </label>
            <input
              type="text"
              value={filters.labels || ''}
              onChange={(e) => onFilterChange({ labels: e.target.value })}
              placeholder="e.g. frontend, bug"
              className="w-full bg-slate-900/90 border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Due On or After
            </label>
            <input
              type="date"
              value={filters.dueAfter || ''}
              onChange={(e) => onFilterChange({ dueAfter: e.target.value })}
              className="w-full bg-slate-900/90 border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Due On or Before
            </label>
            <input
              type="date"
              value={filters.dueBefore || ''}
              onChange={(e) => onFilterChange({ dueBefore: e.target.value })}
              className="w-full bg-slate-900/90 border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
