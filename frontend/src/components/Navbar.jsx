import React from 'react';
import { useSelection } from '../context/SelectionContext';
import { Sun, Moon, LayoutGrid, Activity, Layers, Zap, Shield, Sparkles, ClipboardCheck } from 'lucide-react';

export const Navbar = () => {
  const { currentView, setCurrentView, darkMode, setDarkMode, summaryData } = useSelection();

  const navItems = [
    { id: 'overview', label: 'Station Overview', icon: LayoutGrid, count: summaryData?.total_panels },
    { id: 'diagnose', label: 'Diagnose', icon: Activity, urgentCount: summaryData?.urgent_panels_count },
    { id: 'patterns', label: 'Patterns & AI Space', icon: Layers },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 flex flex-col justify-between shrink-0 select-none shadow-sm transition-colors duration-200">
      <div>
        {/* Brand Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Zap className="w-5 h-5 fill-amber-100 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                  SolarGuard
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 leading-none">
                  XAI
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Station Fault & Diagnostics
              </p>
            </div>
          </div>

          {/* Station Status Chip */}
          <div className="mt-4 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300 text-[11px]">
                Station Alpha-01
              </span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Live
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col space-y-1.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-500/20 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.urgentCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.urgentCount}
                  </span>
                )}
                {item.count !== undefined && !item.urgentCount && (
                  <span className="text-[10px] text-gray-400 font-medium">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Shift Handover Button */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80">
          <button
            onClick={() => setIsHandoverModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Shift Handover</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-200/60 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Transfer
            </span>
          </button>
        </div>
      </div>

      {/* Footer Info & Theme Toggle */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {/* Model Accuracy Badge */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/80">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400">Diagnosis Engine</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">SHAP + Tree</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-gray-500 dark:text-gray-400">Validation Acc.</span>
            <span className="font-bold text-gray-900 dark:text-white">98.4%</span>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors border border-gray-200/60 dark:border-gray-800"
        >
          <div className="flex items-center gap-2">
            {darkMode ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <span>{darkMode ? 'Dark Theme' : 'Light Theme'}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
            Toggle
          </span>
        </button>
      </div>
    </aside>
  );
};
