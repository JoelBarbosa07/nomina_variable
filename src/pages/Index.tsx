
import { useState, useEffect } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { ReportForm } from '@/components/ReportForm';
import { SupervisionView } from '@/components/SupervisionView';
import { ChatInterface } from '@/components/ChatInterface';

const Index = () => {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Verificar si hay usuario logueado
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('apiEndpoint');
    setUser(null);
    setCurrentPage('dashboard');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'reports':
        return <ReportForm />;
      case 'supervision':
        return <SupervisionView />;
      case 'chat':
        return <ChatInterface />;
      default:
        return <Dashboard user={user} />;
    }
  };

  if (!user) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        onLogout={handleLogout}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        user={user}
      />
      <main className="flex-1 overflow-auto">
        {renderCurrentPage()}
      </main>
    </div>
  );
};

export default Index;
