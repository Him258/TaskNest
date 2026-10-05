import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import {
  Layers,
  ChevronDown,
  Plus,
  Users,
  FileText,
  LogOut,
  Shield,
  Briefcase,
} from 'lucide-react';

export default function Navbar({ onOpenCreateOrg, onNavigate, currentTab }) {
  const { user, organizations, activeOrg, switchOrganization, role, logout, canManageMembers, canViewAuditLogs } = useAuth();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getRoleBadgeColor = (r) => {
    switch (r) {
      case 'OWNER': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ADMIN': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'MEMBER': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Organization Switcher */}
        <div className="flex items-center space-x-6">
          <div
            onClick={() => onNavigate('board')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              TaskNest
            </span>
          </div>

          {/* Org Selector */}
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[140px] font-semibold">{activeOrg?.name || 'Select Org'}</span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded border font-semibold ${getRoleBadgeColor(role)}`}>
                {role}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {orgDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 glass-panel rounded-xl shadow-xl z-50 py-1 border border-slate-700/60">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Organizations
                </div>
                {organizations.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => {
                      switchOrganization(org._id);
                      setOrgDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-indigo-600/20 transition-colors ${
                      org._id === activeOrg?._id ? 'text-indigo-400 font-semibold bg-indigo-600/10' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {org.role}
                    </span>
                  </button>
                ))}
                <div className="border-t border-slate-800 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setOrgDropdownOpen(false);
                      onOpenCreateOrg();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-indigo-400 hover:bg-indigo-600/20 font-medium flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Organization</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onNavigate('board')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              currentTab === 'board' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Projects & Board</span>
          </button>

          {canManageMembers && (
            <button
              onClick={() => onNavigate('members')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                currentTab === 'members' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members</span>
            </button>
          )}

          {canViewAuditLogs && (
            <button
              onClick={() => onNavigate('audit')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                currentTab === 'audit' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>
          )}
        </nav>

        {/* User Actions & Notifications */}
        <div className="flex items-center space-x-3">
          <NotificationDropdown />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-semibold text-slate-200">{user?.name}</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{user?.email}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 glass-panel rounded-xl shadow-xl z-50 py-1 border border-slate-700/60">
                <div className="px-3 py-2 border-b border-slate-800 text-xs">
                  <div className="font-semibold text-slate-200">{user?.name}</div>
                  <div className="text-slate-400 text-[10px]">{user?.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
