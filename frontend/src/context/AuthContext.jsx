import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('tasknest_token') || null);
  const [organizations, setOrganizations] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user details and organizations on startup or token change
  useEffect(() => {
    const loadAuthData = async () => {
      if (!token) {
        setUser(null);
        setOrganizations([]);
        setActiveOrg(null);
        setLoading(false);
        return;
      }

      try {
        initSocket(token);
        const [userRes, orgsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/organizations'),
        ]);

        setUser(userRes.data);
        const orgs = orgsRes.data || [];
        setOrganizations(orgs);

        const savedOrgId = localStorage.getItem('tasknest_active_org_id');
        const match = orgs.find((o) => o._id === savedOrgId);

        if (match) {
          setActiveOrg(match);
        } else if (orgs.length > 0) {
          setActiveOrg(orgs[0]);
          localStorage.setItem('tasknest_active_org_id', orgs[0]._id);
        } else {
          setActiveOrg(null);
        }
      } catch (err) {
        console.error('Failed to load user session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadAuthData();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, ...userData } = res.data;
    localStorage.setItem('tasknest_token', newToken);
    setToken(newToken);
    setUser(userData);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token: newToken, ...userData } = res.data;
    localStorage.setItem('tasknest_token', newToken);
    setToken(newToken);
    setUser(userData);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('tasknest_token');
    localStorage.removeItem('tasknest_active_org_id');
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setActiveOrg(null);
    disconnectSocket();
  };

  const switchOrganization = (orgId) => {
    const found = organizations.find((o) => o._id === orgId);
    if (found) {
      setActiveOrg(found);
      localStorage.setItem('tasknest_active_org_id', found._id);
    }
  };

  const refreshOrganizations = async () => {
    if (!token) return;
    try {
      const res = await api.get('/organizations');
      setOrganizations(res.data);
      if (activeOrg) {
        const updated = res.data.find((o) => o._id === activeOrg._id);
        if (updated) setActiveOrg(updated);
      }
    } catch (err) {
      console.error('Failed to refresh orgs:', err);
    }
  };

  // Helper getters for permissions
  const role = activeOrg ? activeOrg.role : 'VIEWER';
  const isOwner = role === 'OWNER';
  const isAdmin = role === 'ADMIN' || isOwner;
  const isMember = role === 'MEMBER' || isAdmin;
  const isViewer = role === 'VIEWER';

  const canCreateTask = isMember;
  const canDeleteTask = isAdmin;
  const canManageMembers = isAdmin;
  const canViewAuditLogs = isAdmin;
  const canCreateProject = isAdmin;

  const canEditTask = (task) => {
    if (!task) return false;
    if (isAdmin) return true;
    if (isMember) {
      const isAssignee = task.assignee && (task.assignee._id === user?._id || task.assignee === user?._id);
      const isCreator = task.createdBy && (task.createdBy._id === user?._id || task.createdBy === user?._id);
      return isAssignee || isCreator;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        organizations,
        activeOrg,
        role,
        isOwner,
        isAdmin,
        isMember,
        isViewer,
        canCreateTask,
        canDeleteTask,
        canManageMembers,
        canViewAuditLogs,
        canCreateProject,
        canEditTask,
        login,
        register,
        logout,
        switchOrganization,
        refreshOrganizations,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
