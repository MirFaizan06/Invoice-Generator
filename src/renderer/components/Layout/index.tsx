import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar/index';
import './Layout.css';

export const Layout: React.FC = () => {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
};
