import React from 'react';
import { useSelection } from '../context/SelectionContext';
import { X, Clock, ShieldAlert, CheckCircle2, AlertTriangle, FileSpreadsheet, UserCheck, Zap, Printer } from 'lucide-react';

export const ShiftHandoverModal = () => {
  const { 
    isHandoverModalOpen, 
    setIsHandoverModalOpen, 
    summaryData, 
    maintenanceLogs, 
    financialMetrics,
    selectPanelAndDiagnose 
  } = useSelection();

  if (!isHandoverModalOpen || !summaryData) return null;

  const urgentPanels = summaryData.urgent_panels_list || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Shift Handover & Station Briefing
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Day Shift Handover
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Station Alpha-01 • Operational Safety & Maintenance Transfer Briefing
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsHandoverModalOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          
          {/* Quick Metrics Deck */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Array Fleet Online</span>
              <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                {summaryData.panels_healthy} / {summaryData.total_panels}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {Math.round((summaryData.panels_healthy / summaryData.total_panels) * 100)}% Generating
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Urgent Electrical</span>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {summaryData.urgent_panels_count} Panels
              </p>
              <p className="text-[10px] text-rose-500 font-medium">Pending Electrician</p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Shift Energy Loss</span>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {summaryData.estimated_energy_lost_kwh} kWh
              </p>
              <p className="text-[10px] text-gray-500 font-medium">Est. Today</p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Est. Revenue Impact</span>
              <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                {financialMetrics.dailyLossFormatted}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">@ {financialMetrics.currencySymbol}{financialMetrics.tariffRate}/kWh</p>
            </div>
          </div>

          {/* Pending Urgent Hazards Handover List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Unresolved Urgent Hazards (Handover Priority)
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                Top {Math.min(5, urgentPanels.length)} of {urgentPanels.length} shown
              </span>
            </div>

            <div className="space-y-1.5">
              {urgentPanels.slice(0, 5).map((item) => (
                <div
                  key={item.panel_id}
                  onClick={() => {
                    setIsHandoverModalOpen(false);
                    selectPanelAndDiagnose(item.panel_id);
                  }}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {item.panel_id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 capitalize">
                      {item.status}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[280px]">
                      {item.reason}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 group-hover:underline">
                    Inspect &rarr;
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Actions Completed This Shift */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Maintenance Actions Logged During Shift ({maintenanceLogs.length})
            </span>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200 dark:border-gray-800">
                    <th className="p-2">Log ID</th>
                    <th className="p-2">Module</th>
                    <th className="p-2">Action Taken</th>
                    <th className="p-2">Time</th>
                    <th className="p-2">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                  {maintenanceLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="p-2 font-mono text-[10px] text-gray-400">{log.id}</td>
                      <td className="p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">{log.panelId}</td>
                      <td className="p-2 font-medium text-gray-700 dark:text-gray-300">{log.action}</td>
                      <td className="p-2 text-gray-400 text-[11px]">{log.timestamp}</td>
                      <td className="p-2 text-gray-500 text-[11px]">{log.operator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Handover Sign-off */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-2">
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
              Shift Transfer Verification
            </span>
            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <span className="text-gray-400">Outgoing Guard / Operator:</span>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">Operator A. Kumar (Shift A)</p>
              </div>
              <div>
                <span className="text-gray-400">Incoming Guard / Operator:</span>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">Operator V. Singh (Shift B)</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
          <button
            onClick={() => setIsHandoverModalOpen(false)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
};
