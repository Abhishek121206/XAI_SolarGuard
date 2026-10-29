import React from 'react';
import { useSelection } from '../context/SelectionContext';
import { StatusBadge } from '../components/StatusBadge';
import { DetailsDrawer } from '../components/DetailsDrawer';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import { 
  AlertTriangle, 
  Wrench, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Thermometer, 
  Sun, 
  Activity, 
  AlertOctagon,
  CheckCircle2,
  FileText,
  RotateCcw
} from 'lucide-react';

export const Diagnose = () => {
  const { 
    selectedPanelData, 
    diagnosticsData, 
    setSelectedPanelId, 
    setCurrentView,
    markPanelResolved,
    undoPanelResolution,
    openWorkOrder,
    financialMetrics
  } = useSelection();

  if (!selectedPanelData) {
    return (
      <div className="p-16 text-center text-gray-500">
        Please select a solar panel from Station Overview or Patterns view.
      </div>
    );
  }

  const p = selectedPanelData;
  const isHighVoltageFault = p.status === 'open-circuit' || p.status === 'short-circuit';

  // Navigation: find previous and next panel
  const currentIndex = diagnosticsData.findIndex(item => item.panel_id === p.panel_id);
  const prevPanel = currentIndex > 0 ? diagnosticsData[currentIndex - 1] : null;
  const nextPanel = currentIndex < diagnosticsData.length - 1 ? diagnosticsData[currentIndex + 1] : null;

  // Financial metrics for this module (5 peak sun hours baseline)
  const rate = financialMetrics?.tariffRate || 0.12;
  const symbol = financialMetrics?.currencySymbol || '$';
  const dailyLossKwh = ((p.energy_lost_w || 0) * 5) / 1000;
  const dailyLossCost = +(dailyLossKwh * rate).toFixed(2);
  const monthlyLossCost = +(dailyLossCost * 30).toFixed(2);

  // Chart data comparing expected vs actual power
  const chartData = [
    {
      name: 'Expected Power',
      value: p.expected_power_w,
      fill: '#10b981' // Green
    },
    {
      name: 'Actual Output',
      value: p.actual_power_w,
      fill: p.status_color === 'red' ? '#f43f5e' : p.status_color === 'amber' ? '#f59e0b' : '#10b981'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 md:p-8 max-w-5xl mx-auto space-y-6"
    >
      {/* Top Bar: Back & Panel Selector with Prev/Next Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80 dark:border-gray-800">
        <button
          onClick={() => setCurrentView('overview')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Station Overview</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Prev button */}
          <button
            onClick={() => prevPanel && setSelectedPanelId(prevPanel.panel_id)}
            disabled={!prevPanel}
            title={prevPanel ? `Previous: ${prevPanel.panel_id}` : 'No previous panel'}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dropdown selector */}
          <select
            value={p.panel_id}
            onChange={(e) => setSelectedPanelId(e.target.value)}
            className="text-xs font-mono font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            {diagnosticsData.map((panel) => (
              <option key={panel.panel_id} value={panel.panel_id}>
                {panel.panel_id} - {panel.status.toUpperCase()} ({panel.actual_power_w}W)
              </option>
            ))}
          </select>

          {/* Next button */}
          <button
            onClick={() => nextPanel && setSelectedPanelId(nextPanel.panel_id)}
            disabled={!nextPanel}
            title={nextPanel ? `Next: ${nextPanel.panel_id}` : 'No next panel'}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STRICT ELECTRICAL SAFETY RULE BANNER (For High Voltage / Wiring Faults) */}
      {isHighVoltageFault && (
        <div className="bg-rose-50 border-2 border-rose-500/80 dark:bg-rose-950/70 dark:border-rose-600 rounded-xl p-4 shadow-sm flex items-start gap-3.5 animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-rose-900 dark:text-rose-100 uppercase tracking-wide">
              ⚡ Strict Electrical Safety Warning (High-Voltage Danger)
            </h4>
            <p className="text-xs text-rose-800 dark:text-rose-200 mt-1 font-semibold leading-relaxed">
              Switch off string isolator and call a qualified electrician immediately.
              Do NOT touch live wiring, connectors, or attempt DIY repair on this high-voltage circuit.
            </p>
          </div>
        </div>
      )}

      {/* 1. TOP STATUS CARD */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {p.panel_id}
              </span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Module Diagnostic Profile
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1.5 capitalize tracking-tight">
              {p.is_unrecognized ? "Unrecognized Electrical Pattern" : p.status}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <StatusBadge
              status={p.status}
              statusColor={p.status_color}
              isUnrecognized={p.is_unrecognized}
              severity={p.severity}
              size="large"
            />
            <div className="text-right pl-4 border-l border-gray-200 dark:border-gray-800">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Confidence</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{p.confidence}%</p>
            </div>
          </div>
        </div>

        {/* Quick Physical Telemetry Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
            <span className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1 font-bold">
              <Zap className="w-3 h-3 text-amber-500" /> Measured Power
            </span>
            <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {p.actual_power_w} <span className="text-xs font-semibold text-amber-700/80 dark:text-amber-300/80">W</span>
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1 font-bold">
              <Activity className="w-3 h-3 text-emerald-500" /> Expected Output
            </span>
            <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {p.expected_power_w} <span className="text-xs font-semibold text-emerald-700/80 dark:text-emerald-300/80">W</span>
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
              <Sun className="w-3 h-3 text-amber-500" /> Irradiance
            </span>
            <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
              {p.raw_metrics?.irradiance_w_m2 || 'N/A'} <span className="text-xs font-normal text-gray-500">W/m²</span>
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
              <Thermometer className="w-3 h-3 text-rose-500" /> Cell Temp
            </span>
            <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
              {p.raw_metrics?.temperature_c || 'N/A'} <span className="text-xs font-normal text-gray-500">°C</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE: ONE CHART - Expected vs Actual Power */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {p.energy_loss_pct > 0
                ? `${p.panel_id} is producing ${p.energy_loss_pct}% less power than expected`
                : `${p.panel_id} is operating at nominal rated capacity`}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Comparison: Target baseline ({p.expected_power_w} W) vs Measured output ({p.actual_power_w} W)
            </p>
          </div>

          {p.energy_loss_pct > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-300 shrink-0">
              <span>Under-performance:</span>
              <span className="text-rose-700 dark:text-rose-300">-{p.energy_lost_w} W ({p.energy_loss_pct}% loss)</span>
            </div>
          )}
        </div>

        {/* High-Visibility Stat Cards: Expected Power & Actual Output */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Expected Power Card */}
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Expected Power
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {p.expected_power_w}
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Watts</span>
            </div>
            <p className="text-[11px] font-medium text-emerald-800/80 dark:text-emerald-400/80 mt-1">
              Standard target for current sunlight & temp
            </p>
          </div>

          {/* Actual Output Card */}
          <div className={`p-4 rounded-xl border shadow-xs ${
            p.status_color === 'red'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80'
              : p.status_color === 'amber'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80'
              : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold uppercase tracking-wider ${
                p.status_color === 'red'
                  ? 'text-rose-800 dark:text-rose-300'
                  : p.status_color === 'amber'
                  ? 'text-amber-800 dark:text-amber-300'
                  : 'text-emerald-800 dark:text-emerald-300'
              }`}>
                Actual Output
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${
                p.status_color === 'red' ? 'bg-rose-500' : p.status_color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black ${
                p.status_color === 'red'
                  ? 'text-rose-600 dark:text-rose-400'
                  : p.status_color === 'amber'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {p.actual_power_w}
              </span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Watts</span>
            </div>
            <p className={`text-[11px] font-medium mt-1 ${
              p.status_color === 'red'
                ? 'text-rose-800/80 dark:text-rose-400/80'
                : p.status_color === 'amber'
                ? 'text-amber-800/80 dark:text-amber-400/80'
                : 'text-emerald-800/80 dark:text-emerald-400/80'
            }`}>
              Real-time measured power reading
            </p>
          </div>

          {/* Energy Gap / Deficit Card */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Power Gap (Loss)
              </span>
              <Zap className={`w-4 h-4 ${p.energy_loss_pct > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black ${
                p.energy_loss_pct > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {p.energy_loss_pct > 0 ? `-${p.energy_lost_w}` : '0.0'}
              </span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Watts</span>
              {p.energy_loss_pct > 0 && (
                <span className="ml-1 text-xs font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  -{p.energy_loss_pct}%
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1">
              {p.energy_loss_pct > 0 ? 'Immediate generation deficit' : 'Generating at nominal 100% capacity'}
            </p>
          </div>
        </div>

        {/* Chart comparing Expected vs Actual */}
        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 25, right: 30, left: 0, bottom: 20 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 13, fontWeight: 700, fill: '#9ca3af' }} 
              />
              <YAxis 
                unit=" W" 
                tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }} 
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    return (
                      <div className="bg-gray-950 border border-gray-700 text-white text-xs p-3 rounded-xl shadow-2xl space-y-1">
                        <p className="font-bold text-gray-300">{data.payload.name}</p>
                        <p className="text-lg font-black text-white">
                          {data.value} <span className="text-xs font-normal text-gray-400">Watts</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={56}>
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  formatter={(val) => `${val} W`} 
                  fill="#9ca3af" 
                  fontSize={12} 
                  fontWeight={700} 
                  offset={8} 
                />
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. BELOW: "WHY WE THINK THIS" (SHAP Plain Language Reasons) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Why we think this (AI Feature Explanation)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Key physical indicators identified by TreeSHAP feature attributions
          </p>
        </div>

        <div className="space-y-3">
          {p.top_reasons.map((reason, idx) => {
            const maxScore = p.top_reasons[0].importance_score || 1.0;
            const pct = Math.min(100, Math.max(15, (reason.importance_score / maxScore) * 100));

            return (
              <div key={idx} className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[11px] font-bold">
                      #{idx + 1}
                    </span>
                    <span className="font-bold">{reason.feature}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Impact: {reason.importance_score}
                  </span>
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed pl-7">
                  {reason.explanation}
                </p>

                {/* Contribution progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mt-1.5 ml-7 max-w-[calc(100%-1.75rem)]">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM: "WHAT TO DO" (Numbered actionable steps with Safety Rules) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Recommended Action Steps
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Safety-first protocol tailored for on-site personnel and station operators
          </p>
        </div>

        <div className="space-y-3">
          {p.recommended_actions.map((action, idx) => {
            const isSelfService = action.type === 'self_service';
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition-colors ${
                  isSelfService
                    ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
                    : 'bg-rose-50/60 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isSelfService
                    ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                }`}>
                  {isSelfService ? <ShieldCheck className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                      {action.text}
                    </p>

                    <span className={`self-start sm:self-auto shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isSelfService
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                    }`}>
                      {isSelfService ? 'Operator Safe' : 'Qualified Electrician Required'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ESTIMATED COST OF WAITING NOTE WITH REVENUE METRICS */}
        <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-900 dark:text-white">Estimated cost of waiting: </span>
              <span className="text-gray-600 dark:text-gray-300">
                Prompt maintenance prevents secondary cell degradation. If unresolved, ongoing loss is{' '}
                <strong className="text-gray-900 dark:text-white">{p.energy_lost_w} Watts</strong>.
              </span>
            </div>
          </div>
          {p.energy_lost_w > 0 && (
            <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold">
              <span>Loss: ~{symbol}{dailyLossCost}/day</span>
              <span className="text-[10px] opacity-75 font-normal">({symbol}{monthlyLossCost}/mo)</span>
            </div>
          )}
        </div>

        {/* FIELD OPERATIONS WORKFLOW & RESOLUTION BAR */}
        {p.isResolved ? (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Service Logged & Resolved
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                    Restored to Fleet
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {p.resolutionAction || 'Field Maintenance Completed'} at {p.resolvedAt || 'Today'} • Operating at {p.actual_power_w} W
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => undoPanelResolution(p.panel_id)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center gap-1.5 transition-colors"
                title="Undo resolution and restore original fault status"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo
              </button>
              <button
                onClick={() => openWorkOrder(p.panel_id)}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Work Order Ticket
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Field Remediation & Operations Action
                </h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Generate an official printable work order or record field servicing completion.
              </p>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
              <button
                onClick={() => openWorkOrder(p.panel_id)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 transition-all shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Field Work Order</span>
              </button>
              <button
                onClick={() => markPanelResolved(p.panel_id, 'Field Maintenance & Remediation Completed')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Resolved</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. DETAILS DRAWER (With 8 Sensor Telemetry & I-V / P-V Characteristic Curves) */}
      <DetailsDrawer rawMetrics={p.rawMetrics || p.raw_metrics} panel={p} />
    </motion.div>
  );
};
