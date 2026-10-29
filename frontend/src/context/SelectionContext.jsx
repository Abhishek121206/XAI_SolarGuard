import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// Fallback import of backend artifacts in case backend server is unreachable
import summaryFallback from '../../../backend/artifacts/panels_summary.json';
import diagnosticsFallback from '../../../backend/artifacts/panel_diagnostics.json';
import metricsFallback from '../../../backend/artifacts/model_metrics.json';

const SelectionContext = createContext();

export const SelectionProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState('overview'); // 'overview' | 'diagnose' | 'patterns'
  const [selectedPanelId, setSelectedPanelId] = useState('PANEL-601');
  const [darkMode, setDarkMode] = useState(false);

  const [summaryData, setSummaryData] = useState(summaryFallback || null);
  const [diagnosticsData, setDiagnosticsData] = useState(diagnosticsFallback || []);
  const [modelMetricsData, setModelMetricsData] = useState(metricsFallback || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Financial Tariff Configuration ($ USD / ₹ INR)
  const [tariffCurrency, setTariffCurrency] = useState('USD'); // 'USD' | 'INR'
  const tariffRates = {
    USD: { symbol: '$', rate: 0.12, name: 'Commercial Solar Feed-in Tariff ($0.12/kWh)' },
    INR: { symbol: '₹', rate: 7.50, name: 'State DISCOM Feed-in Tariff (₹7.50/kWh)' },
  };

  // Maintenance & Shift Activity Logs
  const [maintenanceLogs, setMaintenanceLogs] = useState([
    {
      id: 'LOG-101',
      panelId: 'PANEL-204',
      timestamp: 'Today, 09:15 AM',
      action: 'Surface Dust Cleaned',
      operator: 'Station In-Charge (Arun)',
      previousStatus: 'shading/soiling',
      energyRecovered: '48.2 W'
    },
    {
      id: 'LOG-102',
      panelId: 'PANEL-311',
      timestamp: 'Today, 08:30 AM',
      action: 'Bypass Diode Inspected',
      operator: 'Duty Electrician (David)',
      previousStatus: 'open-circuit',
      energyRecovered: '220.5 W'
    }
  ]);

  // Modals visibility state
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [workOrderPanelId, setWorkOrderPanelId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, diagRes, metRes] = await Promise.all([
          fetch('/api/summary'),
          fetch('/api/diagnostics'),
          fetch('/api/model-metrics')
        ]);

        if (sumRes.ok && diagRes.ok && metRes.ok) {
          const sumJson = await sumRes.json();
          const diagJson = await diagRes.json();
          const metJson = await metRes.json();
          setSummaryData(sumJson);
          setDiagnosticsData(diagJson);
          setModelMetricsData(metJson);

          const firstUrgent = diagJson.find(p => p.status_color === 'red' || p.status_color === 'amber');
          if (firstUrgent) {
            setSelectedPanelId(firstUrgent.panel_id);
          }
        }
      } catch (err) {
        console.warn('API fetch failed, utilizing pre-generated static artifacts fallback.', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sync dark mode class on body element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const selectPanelAndDiagnose = useCallback((panelId) => {
    setSelectedPanelId(panelId);
    setCurrentView('diagnose');
  }, []);

  // Action: Mark a panel as resolved/serviced with live station metric recalculation
  const markPanelResolved = useCallback((panelId, actionType = 'Field Inspection & Cleaning Completed', notes = '') => {
    setDiagnosticsData(prevDiagnostics => {
      const target = prevDiagnostics.find(p => p.panel_id === panelId);
      if (!target || target.isResolved) return prevDiagnostics;

      const previousStatus = target.status;
      const energyLostWatts = target.energy_lost_w;

      // Update Summary metrics dynamically
      setSummaryData(prevSummary => {
        if (!prevSummary) return prevSummary;
        const newHealthy = prevSummary.panels_healthy + 1;
        const newAttention = Math.max(0, prevSummary.panels_needing_attention - 1);
        const isUrgent = target.status_color === 'red';
        const newUrgentCount = isUrgent ? Math.max(0, prevSummary.urgent_panels_count - 1) : prevSummary.urgent_panels_count;
        const newUrgentList = prevSummary.urgent_panels_list.filter(item => item.panel_id !== panelId);

        // Approximate energy lost savings today (assuming 5 sun peak hours for spot wattage)
        const energySavedKwh = +(energyLostWatts * 5 / 1000).toFixed(2);
        const newEnergyLostKwh = Math.max(0, +(prevSummary.estimated_energy_lost_kwh - energySavedKwh).toFixed(1));

        return {
          ...prevSummary,
          panels_healthy: newHealthy,
          panels_needing_attention: newAttention,
          urgent_panels_count: newUrgentCount,
          urgent_panels_list: newUrgentList,
          estimated_energy_lost_kwh: newEnergyLostKwh
        };
      });

      // Add to maintenance log
      const newLog = {
        id: `LOG-${Date.now().toString().slice(-4)}`,
        panelId,
        timestamp: 'Just now',
        action: actionType,
        operator: 'Current Shift Operator',
        previousStatus,
        energyRecovered: `${energyLostWatts} W`,
        notes
      };
      setMaintenanceLogs(prev => [newLog, ...prev]);

      // Return updated diagnostics
      return prevDiagnostics.map(p => {
        if (p.panel_id === panelId) {
          return {
            ...p,
            status: 'healthy',
            status_color: 'green',
            severity: 'Low',
            actual_power_w: p.expected_power_w,
            energy_loss_pct: 0.0,
            energy_lost_w: 0.0,
            is_unrecognized: false,
            isResolved: true,
            resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            resolutionAction: actionType,
            previousStatus,
            recommended_actions: [
              {
                text: `Maintenance completed (${actionType}). Module operating at standard power baseline.`,
                type: 'self_service'
              }
            ]
          };
        }
        return p;
      });
    });
  }, []);

  // Action: Undo resolution of a panel
  const undoPanelResolution = useCallback((panelId) => {
    const originalRecord = diagnosticsFallback.find(p => p.panel_id === panelId);
    if (!originalRecord) return;

    setDiagnosticsData(prevDiagnostics => {
      const target = prevDiagnostics.find(p => p.panel_id === panelId);
      if (!target || !target.isResolved) return prevDiagnostics;

      // Restore summary metrics
      setSummaryData(prevSummary => {
        if (!prevSummary) return prevSummary;
        const newHealthy = Math.max(0, prevSummary.panels_healthy - 1);
        const newAttention = prevSummary.panels_needing_attention + 1;
        const isUrgent = originalRecord.status_color === 'red';
        const newUrgentCount = isUrgent ? prevSummary.urgent_panels_count + 1 : prevSummary.urgent_panels_count;
        const alreadyInUrgent = prevSummary.urgent_panels_list.some(item => item.panel_id === panelId);
        const newUrgentList = isUrgent && !alreadyInUrgent
          ? [...prevSummary.urgent_panels_list, { panel_id: panelId, status: originalRecord.status, severity: originalRecord.severity }]
          : prevSummary.urgent_panels_list;

        const energySavedKwh = +(originalRecord.energy_lost_w * 5 / 1000).toFixed(2);
        const newEnergyLostKwh = +(prevSummary.estimated_energy_lost_kwh + energySavedKwh).toFixed(1);

        return {
          ...prevSummary,
          panels_healthy: newHealthy,
          panels_needing_attention: newAttention,
          urgent_panels_count: newUrgentCount,
          urgent_panels_list: newUrgentList,
          estimated_energy_lost_kwh: newEnergyLostKwh
        };
      });

      // Remove from maintenance logs
      setMaintenanceLogs(prev => prev.filter(log => log.panelId !== panelId));

      return prevDiagnostics.map(p => (p.panel_id === panelId ? { ...originalRecord } : p));
    });
  }, []);

  // Open work order modal for a given panel
  const openWorkOrder = useCallback((panelId) => {
    setWorkOrderPanelId(panelId || selectedPanelId);
    setIsWorkOrderModalOpen(true);
  }, [selectedPanelId]);

  // Financial loss calculations
  const financialMetrics = useMemo(() => {
    const currentRate = tariffRates[tariffCurrency] || tariffRates.USD;
    const dailyKwh = summaryData?.estimated_energy_lost_kwh || 0;
    const dailyCost = dailyKwh * currentRate.rate;
    const monthlyCost = dailyCost * 30;

    return {
      currencySymbol: currentRate.symbol,
      tariffRate: currentRate.rate,
      tariffName: currentRate.name,
      currencyCode: tariffCurrency,
      dailyLossFormatted: `${currentRate.symbol}${dailyCost.toFixed(2)}`,
      monthlyLossFormatted: `${currentRate.symbol}${monthlyCost.toFixed(2)}`,
    };
  }, [summaryData, tariffCurrency]);

  const selectedPanelData = diagnosticsData.find(p => p.panel_id === selectedPanelId) || diagnosticsData[0] || null;

  return (
    <SelectionContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedPanelId,
        setSelectedPanelId,
        selectedPanelData,
        selectPanelAndDiagnose,
        darkMode,
        setDarkMode,
        summaryData,
        diagnosticsData,
        modelMetricsData,
        isLoading,
        error,
        // Operations & Workflow
        markPanelResolved,
        undoPanelResolution,
        maintenanceLogs,
        openWorkOrder,
        isWorkOrderModalOpen,
        setIsWorkOrderModalOpen,
        workOrderPanelId,
        isHandoverModalOpen,
        setIsHandoverModalOpen,
        // Financial & Tariff
        tariffCurrency,
        setTariffCurrency,
        financialMetrics
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);

