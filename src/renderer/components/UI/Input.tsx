import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  rows?: number;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, icon, className = '', id, ...props }) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="input-wrapper">
      {label && <label className="input-label" htmlFor={inputId}>{label}</label>}
      <div className={`input-field-wrap ${icon ? 'has-icon' : ''} ${error ? 'has-error' : ''}`}>
        {icon && <span className="input-icon">{icon}</span>}
        <input id={inputId} className={`input-field ${className}`} {...props} />
      </div>
      {error && <span className="input-error">{error}</span>}
      {hint && !error && <span className="input-hint">{hint}</span>}
    </div>
  );
};

export const TextArea: React.FC<TextAreaProps> = ({ label, error, hint, rows = 3, className = '', id, ...props }) => {
  const inputId = id || `textarea-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="input-wrapper">
      {label && <label className="input-label" htmlFor={inputId}>{label}</label>}
      <textarea id={inputId} rows={rows} className={`input-field input-textarea ${error ? 'has-error' : ''} ${className}`} {...props} />
      {error && <span className="input-error">{error}</span>}
      {hint && !error && <span className="input-hint">{hint}</span>}
    </div>
  );
};
