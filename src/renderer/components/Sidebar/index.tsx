import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FilePlus, FileText, Search, TrendingUp, Settings, Building2, ChevronRight, Code2, Users, Briefcase, ScrollText } from 'lucide-react';
import { useBusinessStore } from '../../store/business.store';
import './Sidebar.css';

const navItems = [
  { path: '/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
  { path: '/clients', icon: <Users size={17} />, label: 'Clients' },
  { path: '/projects', icon: <Briefcase size={17} />, label: 'Projects' },
  { path: '/documents', icon: <ScrollText size={17} />, label: 'Documents' },
  { path: '/create-invoice', icon: <FilePlus size={17} />, label: 'New Invoice' },
  { path: '/history', icon: <FileText size={17} />, label: 'Invoice History' },
  { path: '/search', icon: <Search size={17} />, label: 'Search' },
  { path: '/finance', icon: <TrendingUp size={17} />, label: 'Finance' },
  { path: '/settings', icon: <Settings size={17} />, label: 'Settings' },
];

export const Sidebar: React.FC = () => {
  const { activeBusiness, businesses } = useBusinessStore();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <FileText size={18} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-title">BizDesk</div>
          <div className="sidebar-logo-subtitle">by Tech Bytes Design</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-section">
          <span className="sidebar-nav-label">Menu</span>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <span className="sidebar-nav-item-icon">{item.icon}</span>
              <span className="sidebar-nav-item-text">{item.label}</span>
              <ChevronRight size={13} className="sidebar-nav-item-arrow" />
            </NavLink>
          ))}
        </div>

        <div className="sidebar-nav-section" style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <NavLink to="/developer" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} style={{ opacity: 0.7 }}>
            <span className="sidebar-nav-item-icon"><Code2 size={17} /></span>
            <span className="sidebar-nav-item-text">Developer</span>
            <ChevronRight size={13} className="sidebar-nav-item-arrow" />
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-business">
        <div className="sidebar-business-icon">
          {activeBusiness?.logo_path ? (
            <img src={`file://${activeBusiness.logo_path}`} alt="logo" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 3 }} />
          ) : (
            <Building2 size={14} />
          )}
        </div>
        <div className="sidebar-business-info">
          <div className="sidebar-business-name">{activeBusiness?.name || 'No Business'}</div>
          <div className="sidebar-business-count">{businesses.length} profile{businesses.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </aside>
  );
};
