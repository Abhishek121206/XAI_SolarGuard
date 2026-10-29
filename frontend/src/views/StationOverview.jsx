import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useSelection } from '../context/SelectionContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Search, 
  LayoutGrid, 
  AlertOctagon, 
  HelpCircle, 
  X, 
  ArrowUpRight, 
  Gauge, 
  SunMedium, 
  SlidersHorizontal,
  ClipboardCheck,
  FileText,
  Layers
} from 'lucide-react';

const getPanelColorClass = (statusColor, isUnrecognized) => {
  if (isUnrecognized) {
    return 'bg-gray-400 dark:bg-gray-600 hover:bg-gray-500';
  }
  switch (statusColor) {
    case 'green':
      return 'bg-emerald-500 hover:bg-emerald-400';
    case 'amber':
      return 'bg-amber-500 hover:bg-amber-400';
    case 'red':
      return 'bg-rose-500 hover:bg-rose-400';
    case 'gray':
    default:
      return 'bg-gray-400 dark:bg-gray-600 hover:bg-gray-500';
  }
};

// Memoized individual panel cell to prevent 700 re-renders per frame on hover/scroll
const PanelCell = React.memo(({ panel, isSelected, onSelect, onHover }) => {
  const isUrgent = panel.status_color === 'red';

  return (
    <button
      onClick={() => onSelect(panel.panel_id)}
      onMouseEnter={() => onHover(panel)}
      className={`h-6 w-full rounded-xs transition-colors duration-75 relative outline-none cursor-pointer ${getPanelColorClass(
        panel.status_color,
        panel.is_unrecognized
      )} ${
        isSelected
          ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 z-10 shadow-sm'
          : 'hover:brightness-125 hover:ring-1 hover:ring-white/80'
      }`}
    >
      {isUrgent && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-xs" />
        </span>
      )}
      <span className="sr-only">{panel.panel_id}</span>
    </button>
  );
});

export const StationOverview = () => {
  const { 
    summaryData, 
    diagnosticsData, 
    selectPanelAndDiagnose, 
    selectedPanelId,
    financialMetrics,
    tariffCurrency,
    setTariffCurrency,
    openWorkOrder,
    setIsHandoverModalOpen
  } = useSelection();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredPanel, setHoveredPanel] = useState(null);
  const [viewTopology, setViewTopology] = useState('grid'); // 'grid' | 'strings'
  const hoverRafRef = useRef(null);

  // Throttled hover callback using requestAnimationFrame to ensure smooth 60fps scrolling
  const handleCellHover = useCallback((panel) => {
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
    }
    hoverRafRef.current = requestAnimationFrame(() => {
      setHoveredPanel(prev => prev?.panel_id === panel.panel_id ? prev : panel);
    });
  }, []);

  const handleSelectPanel = useCallback((panelId) => {
    selectPanelAndDiagnose(panelId);
  }, [selectPanelAndDiagnose]);

  // Compute status counts for filters
  const counts = useMemo(() => {
    if (!diagnosticsData.length) {
      return { total: 0, healthy: 0, attention: 0, urgent: 0, unrecognized: 0 };
    }
    const total = diagnosticsData.length;
    const healthy = diagnosticsData.filter(p => p.status === 'healthy' && !p.is_unrecognized).length;
    const attention = diagnosticsData.filter(p => (p.status_color === 'amber' || p.status_color === 'red') && !p.is_unrecognized).length;
    const urgent = diagnosticsData.filter(p => p.status_color === 'red').length;
    const unrecognized = diagnosticsData.filter(p => p.is_unrecognized).length;
    return { total, healthy, attention, urgent, unrecognized };
  }, [diagnosticsData]);

  // Compute physical string topology (14 strings of 50 panels)
  const stringGroups = useMemo(() => {
    const strings = [];
    const totalStrings = 14;
    const perString = 50;
    for (let i = 0; i < totalStrings; i++) {
      const stringId = `STR-${String(i + 1).padStart(2, '0')}`;
      const panels = diagnosticsData.slice(i * perString, (i + 1) * perString);
      const healthyCount = panels.filter(p => p.status === 'healthy' && !p.is_unrecognized).length;
      const urgentCount = panels.filter(p => p.status_color === 'red').length;
      const attentionCount = panels.filter(p => (p.status_color === 'amber' || p.status_color === 'red')).length;
      strings.push({
        id: stringId,
        index: i + 1,
        panels,
        healthyCount,
        urgentCount,
        attentionCount,
        total: panels.length,
        healthPct: Math.round((healthyCount / panels.length) * 100)
      });
    }
    return strings;
  }, [diagnosticsData]);

  if (!summaryData || !diagnosticsData.length) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading solar station telemetry and matrix...
        </p>
      </div>
    );
  }

  // Filter panels
  const filteredPanels = diagnosticsData.filter(p => {
    const matchesSearch = p.panel_id.toLowerCase().includes(searchQuery.trim().toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    if (filterStatus === 'healthy') return p.status === 'healthy' && !p.is_unrecognized;
    if (filterStatus === 'attention') return (p.status_color === 'amber' || p.status_color === 'red');
    if (filterStatus === 'urgent') return p.status_color === 'red';
    if (filterStatus === 'unrecognized') return p.is_unrecognized;
    return true;
  });

  const healthyPct = Math.round((summaryData.panels_healthy / summaryData.total_panels) * 100);
  const attentionPct = Math.round((summaryData.panels_needing_attention / summaryData.total_panels) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 md:p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Station Title & Live Stats Bar with Shift Handover Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200/80 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Station Overview & Health Matrix
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Array 1 Active
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time multi-string telemetry, fault classification, and Explainable AI (TreeSHAP) diagnostics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Shift Handover Briefing Action */}
          <button
            onClick={() => setIsHandoverModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold shadow-xs transition-colors"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Shift Handover Report</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm font-medium text-gray-600 dark:text-gray-400">
            <SunMedium className="w-3.5 h-3.5 text-amber-500" />
            Spot Readings: 700 Modules
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm font-medium text-gray-600 dark:text-gray-400">
            <Gauge className="w-3.5 h-3.5 text-emerald-500" />
            98.4% Diagnostic Acc.
          </span>
        </div>
      </div>

      {/* FOUR Top Key Numbers (Including Live Financial Revenue Impact) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Card 1: Total Number of Panels */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Solar Panels
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <LayoutGrid className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {summaryData.total_panels}
              </span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md">
                100% Tracked
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium flex items-center gap-1">
              <span>Full array capacity online (14 Strings)</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        </div>

        {/* Card 2: Healthy Panels */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Panels Healthy
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {summaryData.panels_healthy}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                {healthyPct}% Nominal
              </span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium flex items-center gap-1">
              <span>Operating within optimal power curve</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Card 3: Panels Needing Attention */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Panels Needing Attention
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {summaryData.panels_needing_attention}
              </span>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-md">
                {summaryData.urgent_panels_count} Urgent
              </span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
              Requires field inspection or maintenance
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* Card 4: Estimated Energy Lost Today & Financial Revenue Impact */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Est. Energy & Revenue Loss
            </span>
            <div className="flex items-center gap-1.5">
              {/* Currency toggle ($ USD / ₹ INR) */}
              <button
                onClick={() => setTariffCurrency(tariffCurrency === 'USD' ? 'INR' : 'USD')}
                className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                title={`Toggle Tariff Currency (Active: ${financialMetrics.tariffName})`}
              >
                {tariffCurrency}
              </button>
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between gap-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {summaryData.estimated_energy_lost_kwh}
                </span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  kWh
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                  {financialMetrics.dailyLossFormatted}
                </span>
                <span className="text-[10px] text-gray-400 block font-medium">
                  {financialMetrics.monthlyLossFormatted}/mo est.
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium flex items-center justify-between">
              <span>Tariff: {financialMetrics.currencySymbol}{financialMetrics.tariffRate}/kWh</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
        </div>
      </div>

      {/* Station Health Distribution Ribbon */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Station Fleet Health Breakdown ({summaryData.total_panels} Modules)
          </span>
          <span className="text-gray-500 text-[11px]">
            {healthyPct}% Healthy • {attentionPct}% Anomalous
          </span>
        </div>

        {/* Multi-segment distribution progress bar */}
        <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${(counts.healthy / summaryData.total_panels) * 100}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Healthy: ${counts.healthy} panels`}
          />
          <div
            style={{ width: `${((counts.attention - counts.urgent) / summaryData.total_panels) * 100}%` }}
            className="bg-amber-500 transition-all duration-500"
            title={`Attention (Non-urgent): ${counts.attention - counts.urgent} panels`}
          />
          <div
            style={{ width: `${(counts.urgent / summaryData.total_panels) * 100}%` }}
            className="bg-rose-500 transition-all duration-500"
            title={`Urgent: ${counts.urgent} panels`}
          />
          {counts.unrecognized > 0 && (
            <div
              style={{ width: `${(counts.unrecognized / summaryData.total_panels) * 100}%` }}
              className="bg-gray-400 transition-all duration-500"
              title={`Unrecognized: ${counts.unrecognized} panels`}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Optimal: <strong className="text-gray-700 dark:text-gray-300">{counts.healthy}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Attention: <strong className="text-gray-700 dark:text-gray-300">{counts.attention - counts.urgent}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Urgent Action: <strong className="text-gray-700 dark:text-gray-300">{counts.urgent}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Total Units: <strong className="text-gray-700 dark:text-gray-300">{summaryData.total_panels}</strong></span>
          </div>
        </div>
      </div>

      {/* Station Panel Grid Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-5 md:p-6 space-y-5 shadow-sm">
        {/* Array Header: Title, Description, and Topology View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                Solar Panel Array Matrix
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                {filteredPanels.length} of {summaryData.total_panels} Panels
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Multi-string array topology. Switch views or click any module to inspect plain-language XAI diagnosis.
            </p>
          </div>

          {/* View Topology Switcher (Grid vs 14 Strings) */}
          <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800/90 p-1 rounded-xl text-xs font-semibold shrink-0 self-start sm:self-auto border border-gray-200/60 dark:border-gray-700/60">
            <button
              onClick={() => setViewTopology('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewTopology === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid Array</span>
            </button>
            <button
              onClick={() => setViewTopology('strings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewTopology === 'strings'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>14 Series Strings</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Search input & Status Filter buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          {/* Search input with Clear button */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search panel (e.g. 601)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-gray-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter buttons with Counts */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl text-xs border border-gray-200/60 dark:border-gray-700/60">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold">
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => setFilterStatus('healthy')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === 'healthy'
                  ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-emerald-700 dark:text-emerald-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Healthy</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                {counts.healthy}
              </span>
            </button>

            <button
              onClick={() => setFilterStatus('attention')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === 'attention'
                  ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-amber-700 dark:text-amber-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Attention</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                {counts.attention}
              </span>
            </button>

            <button
              onClick={() => setFilterStatus('urgent')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === 'urgent'
                  ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-rose-700 dark:text-rose-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Urgent</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold">
                {counts.urgent}
              </span>
            </button>
          </div>
        </div>

        {/* Legend Bar & Quick Interactive Hover Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800/80">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 shadow-sm inline-block" />
              <span>Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 shadow-sm inline-block" />
              <span>Attention Needed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500 shadow-sm inline-block" />
              <span>Urgent Priority</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-600 shadow-sm inline-block" />
              <span>Unrecognized Pattern</span>
            </div>
          </div>

          {/* Interactive Panel Hover / Selection Callout with Work Order Action */}
          <div className="text-xs min-h-[24px] flex items-center">
            {hoveredPanel ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                <span className="font-mono font-bold">{hoveredPanel.panel_id}</span>
                <span className="text-gray-400">•</span>
                <span className="capitalize font-semibold text-amber-600 dark:text-amber-400">
                  {hoveredPanel.status}
                </span>
                <span className="text-gray-400">•</span>
                <span>Power: <strong>{hoveredPanel.actual_power_w}W</strong> / {hoveredPanel.expected_power_w}W</span>
                <span className="text-gray-400">•</span>
                <button
                  onClick={() => selectPanelAndDiagnose(hoveredPanel.panel_id)}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Diagnose &rarr;
                </button>
                <span className="text-gray-400">•</span>
                <button
                  onClick={() => openWorkOrder(hoveredPanel.panel_id)}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>Work Order</span>
                </button>
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-[11px] italic">
                Hover over any module to preview telemetry • Click to inspect diagnosis
              </span>
            )}
          </div>
        </div>

        {/* Matrix Container: Grid Array OR 14 Series Strings */}
        <div className="rounded-xl border border-gray-200/90 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40 p-2 sm:p-3">
          {viewTopology === 'strings' ? (
            /* 14 Series Strings Layout */
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto p-1 custom-scrollbar">
              {stringGroups.map((str) => (
                <div 
                  key={str.id}
                  className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 space-y-1.5 shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">
                        {str.id}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 text-[11px]">
                        50 Modules (String Index #{str.index})
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px]">
                      <span className={`font-bold px-2 py-0.5 rounded-full ${
                        str.urgentCount > 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : str.attentionCount > 0
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {str.healthyCount}/{str.total} Healthy ({str.healthPct}%)
                      </span>
                      {str.urgentCount > 0 && (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {str.urgentCount} Urgent Hazards
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 50 Series modules horizontal strip */}
                  <div className="flex items-center gap-1 overflow-x-auto py-1">
                    {str.panels.map((p) => {
                      const isSelected = p.panel_id === selectedPanelId;
                      return (
                        <button
                          key={p.panel_id}
                          onClick={() => handleSelectPanel(p.panel_id)}
                          onMouseEnter={() => handleCellHover(p)}
                          className={`h-5 w-4 rounded-xs shrink-0 cursor-pointer transition-colors ${getPanelColorClass(
                            p.status_color,
                            p.is_unrecognized
                          )} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : 'hover:brightness-125'}`}
                          title={`${p.panel_id}: ${p.status.toUpperCase()} (${p.actual_power_w}W)`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Compact 700-Panel Matrix Grid */
            <div 
              onMouseLeave={() => setHoveredPanel(null)}
              className="grid grid-cols-10 sm:grid-cols-14 md:grid-cols-20 lg:grid-cols-25 gap-1.5 max-h-[500px] overflow-y-auto p-1.5 custom-scrollbar overscroll-contain select-none"
            >
              {filteredPanels.map((panel) => (
                <PanelCell
                  key={panel.panel_id}
                  panel={panel}
                  isSelected={panel.panel_id === selectedPanelId}
                  onSelect={handleSelectPanel}
                  onHover={handleCellHover}
                />
              ))}
            </div>
          )}

          {filteredPanels.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
              No panels matched your search "{searchQuery}" under filter "{filterStatus}".
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
