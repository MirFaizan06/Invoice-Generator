import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TitleBar } from './components/TitleBar/index';
import { Layout } from './components/Layout/index';
import { ToastContainer } from './components/UI/Toast';
import { SplashScreen } from './components/SplashScreen/index';
import { useBusinessStore } from './store/business.store';
import { OnboardingPage } from './pages/Onboarding/index';
import { AuthPage } from './pages/Auth/index';
import { DashboardPage } from './pages/Dashboard/index';
import { CreateInvoicePage } from './pages/CreateInvoice/index';
import { InvoicePreviewPage } from './pages/InvoicePreview/index';
import { HistoryPage } from './pages/History/index';
import { SearchPage } from './pages/Search/index';
import { FinancePage } from './pages/Finance/index';
import { SettingsPage } from './pages/Settings/index';
import { DeveloperContactPage } from './pages/DeveloperContact/index';
import ClientsPage from './pages/Clients/index';
import ProjectsPage from './pages/Projects/index';
import DocumentsPage from './pages/Documents/index';
import DocumentGeneratorPage from './pages/DocumentGenerator/index';

type AppState = 'splash' | 'loading' | 'auth-setup' | 'auth-login' | 'onboarding' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('splash');
  const fetchAll = useBusinessStore((s) => s.fetchAll);

  const initApp = async () => {
    setAppState('loading');
    const done = await window.electronAPI.settings.get('onboarding_complete');
    const businesses = await window.electronAPI.business.getAll();

    if (!done || businesses.length === 0) {
      setAppState('onboarding');
      return;
    }

    const authSetup = await window.electronAPI.auth.isSetup();
    if (!authSetup) {
      setAppState('auth-setup');
      return;
    }

    setAppState('auth-login');
  };

  const onAuthenticated = async () => {
    await fetchAll();
    setAppState('app');
  };

  if (appState === 'splash') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TitleBar />
        <SplashScreen onDone={initApp} />
      </div>
    );
  }

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
        <OnboardingPage onComplete={async () => {
          const authSetup = await window.electronAPI.auth.isSetup();
          if (!authSetup) { setAppState('auth-setup'); return; }
          await fetchAll();
          setAppState('app');
        }} />
      </div>
    );
  }

  if (appState === 'auth-setup') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TitleBar />
        <AuthPage initialView="setup" onAuthenticated={onAuthenticated} />
      </div>
    );
  }

  if (appState === 'auth-login') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TitleBar />
        <AuthPage initialView="login" onAuthenticated={onAuthenticated} />
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
            <Route path="/search" element={<SearchPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/developer" element={<DeveloperContactPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/document-generator" element={<DocumentGeneratorPage />} />
          </Route>
        </Routes>
        <ToastContainer />
      </div>
    </HashRouter>
  );
}
