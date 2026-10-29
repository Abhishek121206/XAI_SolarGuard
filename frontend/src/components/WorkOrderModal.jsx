import React from 'react';
import { useSelection } from '../context/SelectionContext';
import { X, Printer, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

export const WorkOrderModal = () => {
  const { 
    isWorkOrderModalOpen, 
    setIsWorkOrderModalOpen, 
    workOrderPanelId, 
    diagnosticsData, 
    markPanelResolved 
  } = useSelection();

  if (!isWorkOrderModalOpen) return null;

  const panel = diagnosticsData.find(p => p.panel_id === workOrderPanelId) || diagnosticsData[0];
  if (!panel) return null;

  // Derive string ID from panel number (e.g. PANEL-601 -> String S-13)
  const panelNumber = parseInt(panel.panel_id.replace(/\D/g, ''), 10) || 1;
  const stringIndex = Math.ceil(panelNumber / 50) || 1;
  const stringId = `STR-${String(stringIndex).padStart(2, '0')}`;
  const isHighVoltage = panel.status === 'open-circuit' || panel.status === 'short-circuit';

  const handlePrint = () => {
    window.print();
  };

  const handleQuickResolve = () => {
    markPanelResolved(panel.panel_id, 'Field Maintenance Verified via Work Order');
    setIsWorkOrderModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] flex flex-col print:border-none print:shadow-none print:p-0 print:m-0">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Field Work Order & Dispatch Ticket
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-300">
                  WO-{panel.panel_id}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                SolarGuard Autonomous Fault Monitoring Dispatch • Station Alpha-01
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Print Work Order Ticket"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsWorkOrderModalOpen(false)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          
          {/* Target Module & Diagnostics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Module ID</span>
              <p className="font-mono text-sm font-black text-gray-900 dark:text-white mt-0.5">{panel.panel_id}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">String Location</span>
              <p className="font-mono text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">{stringId}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Diagnosis</span>
              <p className="text-xs font-black capitalize text-amber-600 dark:text-amber-400 mt-0.5">{panel.status}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Power Gap</span>
              <p className="text-xs font-black text-rose-600 dark:text-rose-400 mt-0.5">
                -{panel.energy_lost_w}W ({panel.energy_loss_pct}%)
              </p>
            </div>
          </div>

          {/* Electrical Safety Notice */}
          {isHighVoltage ? (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900 dark:text-rose-200">
                  CRITICAL ELECTRICAL SAFETY REQUIREMENT (Qualified Electrician Only)
                </p>
                <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                  High-voltage DC hazard detected. String isolator switch for {stringId} MUST be locked out/tagged out (LOTO) before any physical or multimeter inspection.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                Non-live physical task. Station personnel can proceed with surface cleaning or physical shading clearance.
              </p>
            </div>
          )}

          {/* Electrical Telemetry Spot Readings Table */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Measured Physical Telemetry vs Baseline
            </span>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-500">
                    <th className="p-2 text-left">Metric</th>
                    <th className="p-2">Measured</th>
                    <th className="p-2">Expected</th>
                    <th className="p-2">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                  <tr>
                    <td className="p-2 text-left font-medium text-gray-600 dark:text-gray-300">Operating Power (Pmp)</td>
                    <td className="p-2 font-mono font-bold text-rose-600 dark:text-rose-400">{panel.actual_power_w} W</td>
                    <td className="p-2 font-mono text-emerald-600 dark:text-emerald-400">{panel.expected_power_w} W</td>
                    <td className="p-2 font-mono font-bold text-rose-600">-{panel.energy_lost_w} W</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-left font-medium text-gray-600 dark:text-gray-300">Solar Irradiance (G)</td>
                    <td className="p-2 font-mono">{panel.raw_metrics?.irradiance_w_m2 || 'N/A'} W/m²</td>
                    <td className="p-2 font-mono text-gray-400">1000 W/m² STC</td>
                    <td className="p-2 text-gray-400">Optimal Sun</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-left font-medium text-gray-600 dark:text-gray-300">Module Cell Temp (Tc)</td>
                    <td className="p-2 font-mono">{panel.raw_metrics?.temperature_c || 'N/A'} °C</td>
                    <td className="p-2 font-mono text-gray-400">25.0 °C STC</td>
                    <td className="p-2 text-gray-400">Standard</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-left font-medium text-gray-600 dark:text-gray-300">Operating Voltage (Vmp)</td>
                    <td className="p-2 font-mono">{panel.raw_metrics?.v_mp_v || 'N/A'} V</td>
                    <td className="p-2 font-mono text-gray-400">~32.5 V Normal</td>
                    <td className="p-2 text-gray-400">Recorded</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Checklist */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Field Technician Verification Checklist
            </span>
            <div className="space-y-1.5 p-3 rounded-xl bg-gray-50/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-amber-600 focus:ring-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  {isHighVoltage ? 'Lockout/Tagout (LOTO) executed on string inverter & isolator' : 'Inspect physical panel glass for dust, bird soiling, or crack damage'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-amber-600 focus:ring-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  {isHighVoltage ? 'Measure string open-circuit voltage (Voc) with multimeter' : 'Clean module surface with de-ionized water & soft microfiber brush'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-amber-600 focus:ring-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  Check junction box bypass diodes and MC4 connectors for loose crimping
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-amber-600 focus:ring-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  Verify post-service telemetry returns to expected generation curve
                </span>
              </label>
            </div>
          </div>

          {/* Sign-off Blocks */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Assigned Technician:</span>
              <div className="h-8 border-b border-dashed border-gray-300 dark:border-gray-700 flex items-end pb-1 font-mono text-[11px] text-gray-500">
                ___________________________
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Technician Signature & Date:</span>
              <div className="h-8 border-b border-dashed border-gray-300 dark:border-gray-700 flex items-end pb-1 font-mono text-[11px] text-gray-500">
                ___________________________
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 print:hidden">
          <button
            onClick={handleQuickResolve}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark Work Complete & Restore</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Order</span>
            </button>
            <button
              onClick={() => setIsWorkOrderModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
