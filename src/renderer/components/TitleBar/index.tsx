import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import './TitleBar.css';

export const TitleBar: React.FC = () => {
  return (
    <div className="titlebar">
      <div className="titlebar-drag-area">
        <span className="titlebar-app-name">BizDesk</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn titlebar-min" onClick={() => window.electronAPI.window.minimize()} title="Minimize">
          <Minus size={12} />
        </button>
        <button className="titlebar-btn titlebar-max" onClick={() => window.electronAPI.window.maximize()} title="Maximize">
          <Square size={11} />
        </button>
        <button className="titlebar-btn titlebar-close" onClick={() => window.electronAPI.window.close()} title="Close">
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
