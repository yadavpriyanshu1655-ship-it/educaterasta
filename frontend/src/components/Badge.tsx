import React from 'react';
import { TopicStatus, TopicPriority, SessionStatus } from '../types';

interface BadgeProps {
  type: 'status' | 'priority' | 'session_status';
  value: TopicStatus | TopicPriority | SessionStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  let label = String(value);
  let colorStyles = 'bg-slate-800 text-slate-300 border-slate-700';

  if (type === 'status') {
    switch (value) {
      case 'completed':
        label = 'Completed';
        colorStyles = 'bg-emerald-950/70 text-emerald-300 border-emerald-800';
        break;
      case 'in_progress':
        label = 'In Progress';
        colorStyles = 'bg-amber-950/70 text-amber-300 border-amber-800';
        break;
      case 'not_started':
        label = 'Not Started';
        colorStyles = 'bg-slate-800 text-slate-400 border-slate-700';
        break;
    }
  } else if (type === 'priority') {
    switch (value) {
      case 'high':
        label = 'High Priority';
        colorStyles = 'bg-rose-950/70 text-rose-300 border-rose-800';
        break;
      case 'medium':
        label = 'Medium';
        colorStyles = 'bg-sky-950/70 text-sky-300 border-sky-800';
        break;
      case 'low':
        label = 'Low';
        colorStyles = 'bg-slate-800 text-slate-400 border-slate-700';
        break;
    }
  } else if (type === 'session_status') {
    switch (value) {
      case 'completed':
        label = 'Completed';
        colorStyles = 'bg-emerald-950/70 text-emerald-300 border-emerald-800';
        break;
      case 'pending':
        label = 'Pending';
        colorStyles = 'bg-sky-950/70 text-sky-300 border-sky-800';
        break;
      case 'missed':
        label = 'Missed';
        colorStyles = 'bg-rose-950/70 text-rose-300 border-rose-800';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorStyles} ${className}`}
    >
      {label}
    </span>
  );
};

