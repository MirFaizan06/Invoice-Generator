import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppStore, type Toast } from '../../store/app.store';
import './Toast.css';

const icons: Record<string, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error: <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const removeToast = useAppStore((s) => s.removeToast);
  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-icon">{icons[toast.type]}</div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      <button className="toast-close" onClick={() => removeToast(toast.id)}>
        <X size={13} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useAppStore((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
};
