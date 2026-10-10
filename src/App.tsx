import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { storage } from './lib/storage';
import { FinancialProvider } from './context/FinancialContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    setIsAuthenticated(storage.isLoggedIn());
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    storage.logout();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
        Memuat aplikasi keuangan...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <FinancialProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'transactions' && <Transactions />}
        {activeTab === 'settings' && <Settings />}
      </Layout>
    </FinancialProvider>
  );
}

export default App;
