import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Sun, 
  Thermometer, 
  Zap, 
  Gauge, 
  Cpu, 
  Activity, 
  LineChart as LineChartIcon, 
  Sliders,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceDot,
  CartesianGrid
} from 'recharts';

export const DetailsDrawer = ({ rawMetrics, panel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' | 'curves'
  const [curveMode, setCurveMode] = useState('iv'); // 'iv' | 'pv' | 'dual'

  if (!rawMetrics) return null;

  // Electrical parameter extraction
  const voc = Number(rawMetrics.v_oc_v) || 45.0;
  const isc = Number(rawMetrics.i_sc_a) || 9.5;
  const vmp = Number(rawMetrics.v_mp_v) || 36.5;
  const imp = Number(rawMetrics.i_mp_a) || 8.2;
  const pmp = Number(rawMetrics.p_mp_w) || +(vmp * imp).toFixed(1);

  // Fill factor: FF = (Vmp * Imp) / (Voc * Isc)
  const theoreticalMax = voc * isc;
  const fillFactor = theoreticalMax > 0 ? +((pmp / theoreticalMax) * 100).toFixed(1) : 75.0;

  // STC Nominal Baseline Reference
  const vocNom = 45.6;
  const iscNom = 9.8;
  const vmpNom = 37.8;
  const impNom = 8.73;
  const pmpNom = 330.0;

  // Determine line color based on panel status
  const actualColor = panel?.status_color === 'red' 
    ? '#f43f5e' 
    : panel?.status_color === 'amber' 
    ? '#f59e0b' 
    : '#10b981';

  // Generate synthetic high-fidelity I-V and P-V curve data points
  const curveData = useMemo(() => {
    const points = [];
    const maxV = Math.ceil(Math.max(voc, vocNom) + 1);
    const steps = 30;
    const vStep = maxV / steps;

    for (let i = 0; i <= steps; i++) {
      const v = +(i * vStep).toFixed(1);

      // 1. Actual Module Curve Calculation
      let iActual = 0;
      if (v <= vmp) {
        // High impedance plateau from 0 to Vmp
        const ratio = vmp > 0 ? Math.pow(v / vmp, 4) : 0;
        iActual = Math.max(0, isc - (isc - imp) * ratio);
      } else if (v <= voc) {
        // Diode breakdown cliff from Vmp to Voc
        const ratio = (voc - vmp) > 0 ? Math.pow((v - vmp) / (voc - vmp), 2) : 1;
        iActual = Math.max(0, imp * (1 - ratio));
      } else {
        iActual = 0;
      }
      iActual = +iActual.toFixed(2);
      const pActual = +(v * iActual).toFixed(1);

      // 2. Nominal Baseline STC Curve Calculation
      let iNominal = 0;
      if (v <= vmpNom) {
        const ratioNom = Math.pow(v / vmpNom, 4);
        iNominal = Math.max(0, iscNom - (iscNom - impNom) * ratioNom);
      } else if (v <= vocNom) {
        const ratioNom = Math.pow((v - vmpNom) / (vocNom - vmpNom), 2);
        iNominal = Math.max(0, impNom * (1 - ratioNom));
      } else {
        iNominal = 0;
      }
      iNominal = +iNominal.toFixed(2);
      const pNominal = +(v * iNominal).toFixed(1);

      points.push({
        voltage: v,
        iActual,
        pActual,
        iNominal,
        pNominal
      });
    }

    return points;
  }, [voc, isc, vmp, imp, pmp]);

  const telemetryItems = [
    {
      title: 'Irradiance (Sunlight)',
      value: `${rawMetrics.irradiance_w_m2} W/m²`,
      subtitle: 'Solar radiation incident on panel surface',
      icon: Sun,
      color: 'text-amber-500'
    },
    {
      title: 'Cell Temperature',
      value: `${rawMetrics.temperature_c} °C`,
      subtitle: 'Physical photovoltaic cell temperature',
      icon: Thermometer,
      color: 'text-rose-500'
    },
    {
      title: 'Operating Voltage (Vmp)',
      value: `${rawMetrics.v_mp_v} V`,
      subtitle: 'Voltage at maximum power point',
      icon: Zap,
      color: 'text-blue-500'
    },
    {
      title: 'Operating Current (Imp)',
      value: `${rawMetrics.i_mp_a} A`,
      subtitle: 'Current at maximum power point',
      icon: Activity,
      color: 'text-emerald-500'
    },
    {
      title: 'Actual Power Output (Pmp)',
      value: `${rawMetrics.p_mp_w} W`,
      subtitle: 'Direct measured electrical power',
      icon: Zap,
      color: 'text-amber-500'
    },
    {
      title: 'Open Circuit Voltage (Voc)',
      value: `${rawMetrics.v_oc_v} V`,
      subtitle: 'Terminal voltage with no current load',
      icon: Gauge,
      color: 'text-indigo-500'
    },
    {
      title: 'Short Circuit Current (Isc)',
      value: `${rawMetrics.i_sc_a} A`,
      subtitle: 'Maximum current at zero load voltage',
      icon: Cpu,
      color: 'text-purple-500'
    },
    {
      title: 'Module Fill Factor (FF)',
      value: `${fillFactor}%`,
      subtitle: 'Squareness ratio of I-V characteristic',
      icon: Sliders,
      color: 'text-cyan-500'
    }
  ];

  return (
    <div className="border border-gray-200/90 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
          <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Info className="w-3.5 h-3.5" />
          </div>
          <span>Engineering Deep-Dive: Electrical Specs & I-V / P-V Curves</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="hidden sm:inline text-gray-400">
            {isOpen ? 'Collapse drawer' : '8 Sensor Specs • Characteristic Curves'}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-950/40 space-y-5">
          {/* Top Segmented Navigation Tab */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200/60 dark:border-gray-800">
            <div className="inline-flex p-1 rounded-lg bg-gray-200/70 dark:bg-gray-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('specs')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'specs'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Telemetry Specs (8 Sensors)
              </button>
              <button
                onClick={() => setActiveTab('curves')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'curves'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5 text-blue-500" />
                I-V & P-V Characteristic Curves
              </button>
            </div>

            {activeTab === 'curves' && (
              <div className="inline-flex p-1 rounded-lg bg-gray-200/50 dark:bg-gray-800 text-[11px] font-medium">
                <button
                  onClick={() => setCurveMode('iv')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    curveMode === 'iv'
                      ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  I-V Curve
                </button>
                <button
                  onClick={() => setCurveMode('pv')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    curveMode === 'pv'
                      ? 'bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  P-V Curve
                </button>
                <button
                  onClick={() => setCurveMode('dual')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    curveMode === 'dual'
                      ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 font-bold shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Dual Overlay
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: SENSOR TELEMETRY */}
          {activeTab === 'specs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {telemetryItems.map((item, idx) => {
                const Icon = item.icon || Zap;
                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        {item.title}
                      </span>
                      <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                    </div>
                    <p className="text-base font-extrabold text-gray-900 dark:text-white">
                      {item.value}
                    </p>
                    <p className="text-[10px] text-gray-400 line-clamp-1">
                      {item.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: I-V & P-V CHARACTERISTIC CURVES */}
          {activeTab === 'curves' && (
            <div className="space-y-4">
              {/* Curve Header & Explanation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    Photovoltaic Characteristic Curves vs Nominal Baseline (STC)
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                    Solid line = {panel?.panel_id || 'Measured Module'} ({pmp} W) | Dashed line = Healthy Baseline Reference (330 W)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    MPP: {vmp}V @ {imp}A ({pmp}W)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    FF: {fillFactor}%
                  </span>
                </div>
              </div>

              {/* Recharts Curve Visualization */}
              <div className="h-64 sm:h-72 w-full bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200/90 dark:border-gray-800">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={curveData}
                    margin={{ top: 15, right: 30, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis
                      dataKey="voltage"
                      unit="V"
                      label={{ value: 'Terminal Voltage (V)', position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 11 }}
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                    />

                    {/* Left Y Axis for Current / Power */}
                    {curveMode === 'iv' && (
                      <YAxis
                        unit="A"
                        domain={[0, Math.ceil(iscNom + 1)]}
                        label={{ value: 'Current (A)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                      />
                    )}

                    {curveMode === 'pv' && (
                      <YAxis
                        unit="W"
                        domain={[0, Math.ceil(pmpNom + 30)]}
                        label={{ value: 'Power Output (W)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                      />
                    )}

                    {curveMode === 'dual' && (
                      <>
                        <YAxis
                          yAxisId="left"
                          unit="A"
                          domain={[0, Math.ceil(iscNom + 1)]}
                          label={{ value: 'Current (A)', angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 11 }}
                          tick={{ fill: '#9ca3af', fontSize: 11 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          unit="W"
                          domain={[0, Math.ceil(pmpNom + 30)]}
                          label={{ value: 'Power (W)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 11 }}
                          tick={{ fill: '#9ca3af', fontSize: 11 }}
                        />
                      </>
                    )}

                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-gray-950 border border-gray-700 text-white text-xs p-3 rounded-xl shadow-2xl space-y-1.5">
                              <p className="font-bold text-gray-400">Voltage: {label} V</p>
                              {payload.map((entry, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-4">
                                  <span style={{ color: entry.color }} className="font-medium">
                                    {entry.name}:
                                  </span>
                                  <span className="font-extrabold text-white">
                                    {entry.value} {entry.dataKey.startsWith('i') ? 'A' : 'W'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="plainline"
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                    />

                    {/* I-V Curve Mode */}
                    {curveMode === 'iv' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="iNominal"
                          name="Nominal STC Current"
                          stroke="#9ca3af"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="iActual"
                          name="Measured Current"
                          stroke={actualColor}
                          strokeWidth={2.5}
                          dot={false}
                        />
                        <ReferenceDot
                          x={vmp}
                          y={imp}
                          r={5}
                          fill={actualColor}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      </>
                    )}

                    {/* P-V Curve Mode */}
                    {curveMode === 'pv' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="pNominal"
                          name="Nominal STC Power"
                          stroke="#9ca3af"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="pActual"
                          name="Measured Power"
                          stroke={actualColor}
                          strokeWidth={2.5}
                          dot={false}
                        />
                        <ReferenceDot
                          x={vmp}
                          y={pmp}
                          r={5}
                          fill={actualColor}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      </>
                    )}

                    {/* Dual Curve Overlay Mode */}
                    {curveMode === 'dual' && (
                      <>
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="iActual"
                          name="Current (A)"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={false}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="pActual"
                          name="Power (W)"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={false}
                        />
                        <ReferenceDot
                          yAxisId="left"
                          x={vmp}
                          y={imp}
                          r={4}
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                        <ReferenceDot
                          yAxisId="right"
                          x={vmp}
                          y={pmp}
                          r={4}
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Electrical Engineering Insights & Field Guidance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-800">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Fill Factor Evaluation
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-black text-gray-900 dark:text-white">
                      {fillFactor}%
                    </span>
                    <span className={`text-[11px] font-semibold ${fillFactor >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {fillFactor >= 75 ? 'Normal Rectangular' : 'Resistive Loss / Shunt'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Theoretical ratio of peak electrical power to Voc × Isc.
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-800">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Maximum Power Point (MPP)
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                      {pmp} W
                    </span>
                    <span className="text-[11px] text-gray-500">
                      @ {vmp}V, {imp}A
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Inflection knee point where inverter MPPT operates.
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-800">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Curve Deviation Analysis
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                    {panel?.energy_loss_pct > 0 ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-rose-600 dark:text-rose-400">-{panel.energy_loss_pct}% Below STC</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400">Matches STC Curve</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {panel?.energy_loss_pct > 0 
                      ? 'Knee suppression indicates localized shading or cell degradation.'
                      : 'Module conforms to standard photovoltaic operating envelope.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
