import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import CreateOrgModal from './components/CreateOrgModal';

function MainApp() {
  const { user, loading, activeOrg } = useAuth();
  const [currentTab, setCurrentTab] = useState('board'); // 'board' | 'members' | 'audit'
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-medium">
        Initializing TaskNest workspace...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Navbar
          onOpenCreateOrg={() => setShowCreateOrgModal(true)}
          onNavigate={(tab) => setCurrentTab(tab)}
          currentTab={currentTab}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {currentTab === 'board' && <DashboardPage />}
          {currentTab === 'members' && <MembersPage />}
          {currentTab === 'audit' && <AuditLogsPage />}
        </main>

        {showCreateOrgModal && (
          <CreateOrgModal onClose={() => setShowCreateOrgModal(false)} />
        )}
      </div>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
