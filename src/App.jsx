import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { TraderProvider, useTrader } from './context/TraderContext';
import Layout from './components/Layout';
import PostTradeModal from './components/PostTradeModal';
import Onboarding from './pages/Onboarding';
import Explore from './pages/Explore';
import StockDetail from './pages/StockDetail';
import Portfolio from './pages/Portfolio';
import Orders from './pages/Orders';
import Learn from './pages/Learn';

function AppContent() {
  const { state } = useTrader();
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  if (!state.account.initialized) {
    return <Onboarding />;
  }

  const handleNavigate = (tab) => {
    setSelectedSymbol(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStock = (symbol) => {
    setSelectedSymbol(symbol);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout activeTab={activeTab} onNavigate={handleNavigate}>
      {selectedSymbol ? (
        <StockDetail symbol={selectedSymbol} onBack={() => setSelectedSymbol(null)} />
      ) : activeTab === 'explore' ? (
        <Explore onSelectStock={handleSelectStock} />
      ) : activeTab === 'portfolio' ? (
        <Portfolio onSelectStock={handleSelectStock} />
      ) : activeTab === 'orders' ? (
        <Orders onSelectStock={handleSelectStock} />
      ) : (
        <Learn />
      )}
      <PostTradeModal />
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <TraderProvider>
        <AppContent />
      </TraderProvider>
    </ThemeProvider>
  );
}
