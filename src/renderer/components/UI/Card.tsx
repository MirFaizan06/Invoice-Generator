import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  bordered?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  bordered = true,
  hoverable = false,
  onClick,
}) => {
  return (
    <div
      className={`card card-p-${padding} ${bordered ? 'card-bordered' : ''} ${hoverable ? 'card-hoverable' : ''} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {children}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trend?: { value: number; label: string };
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, color = 'blue', trend }) => {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-card-header">
        <div className="stat-card-icon">{icon}</div>
        {trend && (
          <span className={`stat-card-trend ${trend.value >= 0 ? 'positive' : 'negative'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
};
