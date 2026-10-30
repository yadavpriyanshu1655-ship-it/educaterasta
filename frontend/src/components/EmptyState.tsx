import React from 'react';
import { PlusIcon } from './Icons';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center bg-slate-800/30 border border-dashed border-slate-700/80 rounded-2xl flex flex-col items-center justify-center ${className}`}>
      {icon && <div className="p-3 bg-slate-800 rounded-2xl text-slate-400 mb-3">{icon}</div>}
      <h4 className="text-base font-semibold text-slate-200">{title}</h4>
      <p className="mt-1 text-xs text-slate-400 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

