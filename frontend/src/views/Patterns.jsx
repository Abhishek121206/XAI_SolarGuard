import React, { useState } from 'react';
import { useSelection } from '../context/SelectionContext';
import { motion } from 'framer-motion';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Layers, Grid, CheckCircle, Info, Sparkles, Cpu, Award } from 'lucide-react';

export const Patterns = () => {
  const { diagnosticsData, modelMetricsData, selectPanelAndDiagnose } = useSelection();
  const [activeTab, setActiveTab] = useState('scatter'); // 'scatter' | 'matrix'

  if (!diagnosticsData.length) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading cluster patterns data...
        </p>
      </div>
    );
  }

  // Color map per fault type
  const getPointColor = (status, isUnrecognized) => {
    if (isUnrecognized) return '#9ca3af'; // Gray hollow
    switch (status) {
      case 'healthy':
        return '#10b981'; // Green
      case 'shading/soiling':
        return '#f59e0b'; // Amber
      case 'aging':
        return '#8b5cf6'; // Purple
      case 'open-circuit':
        return '#ef4444'; // Red
      case 'short-circuit':
        return '#dc2626'; // Dark red
      case 'overheating':
        return '#f97316'; // Orange
      default:
        return '#6b7280';
    }
  };

  const scatterData = diagnosticsData.map(p => ({
    x: p.pca_x,
    y: p.pca_y,
    panel_id: p.panel_id,
    status: p.status,
    confidence: p.confidence,
    is_unrecognized: p.is_unrecognized,
    actual_power: p.actual_power_w,
    color: getPointColor(p.status, p.is_unrecognized)
  }));

  const matrixLabels = modelMetricsData?.confusion_matrix_labels || [];
  const matrixData = modelMetricsData?.confusion_matrix || [];
  const dist = modelMetricsData?.dataset_info?.fault_class_distribution || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 md:p-8 max-w-6xl mx-auto space-y-6"
    >
      {/* Header & Toggle Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 dark:border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Fault Pattern Analysis & AI Space
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              PCA 2D + Stratified K-Fold
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            2D spatial clustering of all 700 panel electrical telemetry samples and cross-validation heat matrix.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold shadow-inner">
          <button
            onClick={() => setActiveTab('scatter')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'scatter'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D Cluster Map</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'matrix'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Confusion Matrix ({modelMetricsData?.cv_mean_accuracy_pct}%)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: 2D SCATTER MAP */}
      {activeTab === 'scatter' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Principal Feature Space Projection (PCA 2D)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Panels with similar electrical states naturally cluster together in 2D space. Click any point to open diagnosis.
              </p>
            </div>
            <div className="text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-800/80 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700">
              Total Points: <strong>700 Modules</strong>
            </div>
          </div>

          {/* Legend with Counts */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Healthy ({dist.healthy || 350})</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Dust/Shade ({dist['shading/soiling'] || 100})</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Aging ({dist.aging || 80})</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Open Circuit ({dist['open-circuit'] || 60})</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span>Short Circuit ({dist['short-circuit'] || 50})</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>Overheating ({dist.overheating || 45})</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 bg-transparent" />
              <span>Unrecognized ({dist.unknown || 15})</span>
            </div>
          </div>

          {/* Scatter Chart */}
          <div className="h-96 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis type="number" dataKey="x" name="PCA Component 1" hide />
                <YAxis type="number" dataKey="y" name="PCA Component 2" hide />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900 text-white text-xs p-3 rounded-xl shadow-xl border border-gray-700 space-y-1">
                          <p className="font-mono font-bold text-sm text-amber-400">{data.panel_id}</p>
                          <p className="capitalize font-semibold">{data.status}</p>
                          <p className="text-gray-300 text-[11px]">Power Output: {data.actual_power}W</p>
                          <p className="text-gray-400 text-[10px]">Confidence: {data.confidence}%</p>
                          <div className="pt-1 border-t border-gray-800 text-emerald-400 text-[10px] font-bold">
                            Click to Inspect Diagnostic &rarr;
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  data={scatterData}
                  onClick={(e) => {
                    if (e && e.panel_id) {
                      selectPanelAndDiagnose(e.panel_id);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {scatterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.is_unrecognized ? '#ffffff' : entry.color}
                      stroke={entry.color}
                      strokeWidth={entry.is_unrecognized ? 2 : 1}
                      r={entry.is_unrecognized ? 6 : 5}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* VIEW 2: CONFUSION MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                5-Fold Stratified Cross-Validation Matrix
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Evaluated across 700 spot readings with stratified class balancing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle className="w-4 h-4" />
                <span>Accuracy: {modelMetricsData?.cv_mean_accuracy_pct}%</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left font-bold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800">
                    Actual \ Predicted
                  </th>
                  {matrixLabels.map((lbl, idx) => (
                    <th
                      key={idx}
                      className="p-3 font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/80 border-b border-l border-gray-200 dark:border-gray-800"
                    >
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td className="p-3 font-bold text-left text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-800">
                      {matrixLabels[rIdx]}
                    </td>
                    {row.map((val, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      return (
                        <td
                          key={cIdx}
                          className={`p-3 border-t border-l border-gray-200 dark:border-gray-800 font-mono font-bold ${
                            isDiagonal
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200'
                              : val > 0
                              ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};
