import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  className = '',
}) => {
  return (
    <div className={`bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow-sm relative overflow-hidden ${className}`}>
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {icon && <div className="text-slate-400 p-1.5 rounded-lg bg-slate-700/50">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-bold text-white tracking-tight">{value}</div>
      {subtitle && <p className="mt-1 text-xs text-slate-400 leading-normal">{subtitle}</p>}
    </div>
  );
};

