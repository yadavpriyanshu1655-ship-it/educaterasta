import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className="text-slate-400 font-medium">Syllabus Completion</span>
          <span className="text-slate-200 font-semibold">{clampedProgress}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-800 rounded-full overflow-hidden ${heightClasses}`}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: color || (clampedProgress === 100 ? '#10b981' : '#0ea5e9'),
          }}
        />
      </div>
    </div>
  );
};

