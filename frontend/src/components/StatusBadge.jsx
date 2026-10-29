import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

export const StatusBadge = ({ status, statusColor, isUnrecognized, severity, size = 'normal' }) => {
  let label = status;
  let colorKey = statusColor || 'gray';

  if (isUnrecognized || status === 'Unrecognized pattern') {
    label = 'Unrecognized Pattern';
    colorKey = 'gray';
  } else if (status === 'healthy') {
    label = 'Healthy';
    colorKey = 'green';
  } else if (status === 'shading/soiling') {
    label = 'Dust / Shade';
  } else if (status === 'open-circuit') {
    label = 'Open Wiring Fault';
  } else if (status === 'short-circuit') {
    label = 'Short Circuit Fault';
  } else if (status === 'overheating') {
    label = 'Overheating';
  } else if (status === 'aging') {
    label = 'Panel Aging';
  }

  const colorStyles = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    amber: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    red: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    gray: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  };

  const icons = {
    green: <CheckCircle2 className={size === 'large' ? "w-5 h-5" : "w-4 h-4"} />,
    amber: <AlertTriangle className={size === 'large' ? "w-5 h-5" : "w-4 h-4"} />,
    red: <AlertOctagon className={size === 'large' ? "w-5 h-5" : "w-4 h-4"} />,
    gray: <HelpCircle className={size === 'large' ? "w-5 h-5" : "w-4 h-4"} />
  };

  const selectedStyle = colorStyles[colorKey] || colorStyles.gray;
  const selectedIcon = icons[colorKey] || icons.gray;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs sm:text-sm font-bold tracking-wide shadow-sm ${selectedStyle}`}>
      {selectedIcon}
      <span className="capitalize">{label}</span>
      {severity && colorKey !== 'green' && (
        <span className="ml-1 text-[11px] opacity-90 px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 uppercase tracking-wider font-extrabold">
          {severity}
        </span>
      )}
    </div>
  );
};
