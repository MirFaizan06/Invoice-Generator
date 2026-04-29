import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TitleBar } from './components/TitleBar/index';
import { Layout } from './components/Layout/index';
import { ToastContainer } from './components/UI/Toast';
import { useBusinessStore } from './store/business.store';
import { OnboardingPage } from './pages/Onboarding/index';
import { DashboardPage } from './pages/Dashboard/index';
import { CreateInvoicePage } from './pages/CreateInvoice/index';
import { InvoicePreviewPage } from './pages/InvoicePreview/index';
import { HistoryPage } from './pages/History/index';
import { FinancePage } from './pages/Finance/index';
import { SettingsPage } from './pages/Settings/index';

type AppState = 'loading' | 'onboarding' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const fetchAll = useBusinessStore((s) => s.fetchAll);

  useEffect(() => {
    const init = async () => {
      const done = await window.electronAPI.settings.get('onboarding_complete');
      const businesses = await window.electronAPI.business.getAll();
      if (done === 'true' && businesses.length > 0) {
        await fetchAll();
        setAppState('app');
      } else {
        setAppState('onboarding');
      }
    };
    init();
  }, [fetchAll]);

  if (appState === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TitleBar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-pulse" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (appState === 'onboarding') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TitleBar />
        <OnboardingPage onComplete={async () => { await fetchAll(); setAppState('app'); }} />
      </div>
    );
  }

  return (
    <HashRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TitleBar />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/create-invoice" element={<CreateInvoicePage />} />
            <Route path="/invoice/:id" element={<InvoicePreviewPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <ToastContainer />
      </div>
    </HashRouter>
  );
}
