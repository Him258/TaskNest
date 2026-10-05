import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Trash2, Shield, AlertCircle } from 'lucide-react';

export default function MembersPage() {
  const { activeOrg, canManageMembers, role: userRole } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      fetchMembers();
    }
  }, [activeOrg]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/organizations/${activeOrg._id}/members`);
      setMembers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/organizations/${activeOrg._id}/members`, {
        email: newEmail,
        role: newRole,
      });

      setMembers([...members, res.data]);
      setNewEmail('');
      alert('Member added successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, targetRole) => {
    try {
      await api.patch(`/organizations/${activeOrg._id}/members/${userId}`, {
        role: targetRole,
      });
      setMembers(
        members.map((m) => (m.user._id === userId ? { ...m, role: targetRole } : m))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from this organization?`)) {
      try {
        await api.delete(`/organizations/${activeOrg._id}/members/${userId}`);
        setMembers(members.filter((m) => m.user._id !== userId));
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to remove member');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Organization Members</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage members and roles for {activeOrg?.name}
          </p>
        </div>
      </div>

      {!canManageMembers && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Only organization ADMIN and OWNER can manage members and assign roles.</span>
        </div>
      )}

      {/* Add Member Card */}
      {canManageMembers && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <span>Add New Member</span>
          </h3>

          <form onSubmit={handleAddMember} className="flex flex-wrap gap-3 items-end text-xs">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-slate-400 mb-1">User Email Address</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="colleague@test.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="w-36">
              <label className="block text-slate-400 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
              >
                <option value="VIEWER">Viewer</option>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !newEmail.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </form>
        </div>
      )}

      {/* Members List Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading members...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Joined</th>
                  {canManageMembers && <th className="p-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members.map((m) => (
                  <tr key={m.membershipId || m.user._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-semibold text-slate-100 flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs">
                        {m.user?.name ? m.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span>{m.user?.name}</span>
                    </td>
                    <td className="p-3.5 text-slate-400">{m.user?.email}</td>
                    <td className="p-3.5">
                      {canManageMembers && m.role !== 'OWNER' ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.user._id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-200 outline-none"
                        >
                          <option value="VIEWER">VIEWER</option>
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="OWNER">OWNER</option>
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded border bg-slate-800 text-slate-300 border-slate-700">
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    {canManageMembers && (
                      <td className="p-3.5 text-right">
                        {m.role !== 'OWNER' && (
                          <button
                            onClick={() => handleRemoveMember(m.user._id, m.user.name)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
