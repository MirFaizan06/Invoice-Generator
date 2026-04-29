import React from 'react';
import { Mail, Phone, Github, Code2, ExternalLink } from 'lucide-react';
import './DeveloperContact.css';

export const DeveloperContactPage: React.FC = () => {
  const open = (url: string) => window.electronAPI.shell.openPath(url);

  return (
    <div className="page-content dev-contact-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Developer Contact</h1>
          <p className="page-subtitle">Get in touch with the InvoDesk team</p>
        </div>
      </div>

      <div className="dev-contact-layout">
        <div className="dev-card">
          <div className="dev-avatar">
            <Code2 size={36} color="#fff" />
          </div>
          <div className="dev-name">Mir Faizan</div>
          <div className="dev-role">Full Stack Developer · Tech Bytes Design</div>
          <div className="dev-bio">
            Building InvoDesk — a professional offline invoicing system for freelancers and small businesses.
            Available for custom software, web development, and automation projects.
          </div>

          <div className="dev-contacts">
            <a className="dev-contact-item" onClick={() => open('mailto:mirfaizan8803@gmail.com')}>
              <div className="dev-contact-icon" style={{ background: '#EFF6FF' }}>
                <Mail size={18} color="#2563EB" />
              </div>
              <div>
                <div className="dev-contact-label">Email</div>
                <div className="dev-contact-value">mirfaizan8803@gmail.com</div>
              </div>
              <ExternalLink size={13} className="dev-contact-arrow" />
            </a>

            <a className="dev-contact-item" onClick={() => open('tel:+919596524832')}>
              <div className="dev-contact-icon" style={{ background: '#F0FDF4' }}>
                <Phone size={18} color="#16A34A" />
              </div>
              <div>
                <div className="dev-contact-label">Phone / WhatsApp</div>
                <div className="dev-contact-value">+91 9596 524 832</div>
              </div>
              <ExternalLink size={13} className="dev-contact-arrow" />
            </a>

            <a className="dev-contact-item" onClick={() => open('https://github.com/MirFaizan06')}>
              <div className="dev-contact-icon" style={{ background: '#F9FAFB' }}>
                <Github size={18} color="#111827" />
              </div>
              <div>
                <div className="dev-contact-label">GitHub</div>
                <div className="dev-contact-value">github.com/MirFaizan06</div>
              </div>
              <ExternalLink size={13} className="dev-contact-arrow" />
            </a>
          </div>
        </div>

        <div className="dev-info-card">
          <h3 className="dev-info-title">About InvoDesk</h3>
          <p className="dev-info-text">
            InvoDesk is built with Electron, React, and TypeScript. It runs completely offline —
            your business data never leaves your device.
          </p>
          <div className="dev-info-tags">
            {['Electron', 'React', 'TypeScript', 'SQLite', 'Offline-First'].map((t) => (
              <span key={t} className="dev-tag">{t}</span>
            ))}
          </div>

          <div className="dev-info-divider" />
          <h3 className="dev-info-title">License</h3>
          <p className="dev-info-text">
            Proprietary software developed by Tech Bytes Design. Cannot be redistributed, resold, or modified without permission.
          </p>
          <p className="dev-info-text" style={{ marginTop: 8, fontWeight: 600 }}>
            © 2026 Tech Bytes Design. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
