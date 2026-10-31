import React from 'react';
import { TopicStatus, TopicPriority, SessionStatus } from '../types';

interface BadgeProps {
  type:
    | 'status'
    | 'priority'
    | 'session_status'
    | 'difficulty'
    | 'quiz_status'
    | 'classification'
    | 'mistake_category';
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
  } else if (type === 'difficulty') {
    switch (String(value).toLowerCase()) {
      case 'easy':
        label = 'Easy';
        colorStyles = 'bg-emerald-950/70 text-emerald-300 border-emerald-800';
        break;
      case 'medium':
        label = 'Medium';
        colorStyles = 'bg-sky-950/70 text-sky-300 border-sky-800';
        break;
      case 'hard':
        label = 'Hard';
        colorStyles = 'bg-rose-950/70 text-rose-300 border-rose-800';
        break;
    }
  } else if (type === 'quiz_status') {
    switch (String(value).toLowerCase()) {
      case 'published':
        label = 'Published';
        colorStyles = 'bg-emerald-950/70 text-emerald-300 border-emerald-800';
        break;
      case 'draft':
        label = 'Draft';
        colorStyles = 'bg-amber-950/70 text-amber-300 border-amber-800';
        break;
    }
  } else if (type === 'classification') {
    switch (value) {
      case 'Strong':
        colorStyles = 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
        break;
      case 'Moderate':
        colorStyles = 'bg-sky-950/80 text-sky-300 border-sky-700';
        break;
      case 'Needs Improvement':
        colorStyles = 'bg-amber-950/80 text-amber-300 border-amber-700';
        break;
      case 'Weak':
        colorStyles = 'bg-rose-950/80 text-rose-300 border-rose-700 font-bold';
        break;
      case 'Insufficient Data':
        colorStyles = 'bg-slate-800 text-slate-400 border-slate-700';
        break;
    }
  } else if (type === 'mistake_category') {
    label = String(value).replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    switch (value) {
      case 'repeated_mistake':
        colorStyles = 'bg-rose-950 text-rose-300 border-rose-700 font-bold';
        break;
      case 'conceptual':
        colorStyles = 'bg-amber-950/70 text-amber-300 border-amber-700';
        break;
      case 'calculation':
        colorStyles = 'bg-purple-950/70 text-purple-300 border-purple-700';
        break;
      case 'incorrect_selection':
        colorStyles = 'bg-orange-950/70 text-orange-300 border-orange-700';
        break;
      case 'incomplete':
      case 'time_pressure':
        colorStyles = 'bg-slate-800 text-slate-300 border-slate-700';
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
