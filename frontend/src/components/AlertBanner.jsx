import React, { useState } from 'react';
import { useSelection } from '../context/SelectionContext';
import { AlertCircle, X, ChevronRight, Search, ShieldAlert, ArrowRight } from 'lucide-react';

export const AlertBanner = () => {
  const { summaryData, selectPanelAndDiagnose } = useSelection();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  if (!summaryData || summaryData.urgent_panels_count === 0) {
    return null;
  }

  const urgentPanels = summaryData.urgent_panels_list || [];

  const filteredUrgent = urgentPanels.filter(item => {
    const matchesSearch = item.panel_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.status.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.reason.toLowerCase().includes(searchFilter.toLowerCase());
    if (!matchesSearch) return false;
    if (activeCategory === 'all') return true;
    return item.status.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <>
      {/* Top Alert Banner */}
      <div className="bg-rose-50/90 dark:bg-rose-950/70 border-b border-rose-200/80 dark:border-rose-900/60 px-6 py-2.5 flex items-center justify-between transition-colors shadow-sm">
        <div className="flex items-center gap-2.5 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
          </span>
          <span>
            {summaryData.urgent_panels_count} {summaryData.urgent_panels_count === 1 ? 'solar panel requires' : 'solar panels require'} immediate intervention
          </span>
        </div>

        <button
          onClick={() => {
            setSearchFilter('');
            setActiveCategory('all');
            setIsModalOpen(true);
          }}
          className="text-xs font-bold text-rose-700 dark:text-rose-200 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 bg-rose-100/90 dark:bg-rose-900/60 border border-rose-200 dark:border-rose-800 px-3.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
        >
          <span>View Urgent List</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Summary Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Urgent Panels Requiring Attention
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Showing {filteredUrgent.length} of {urgentPanels.length} priority panels
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by panel ID, fault type, or reason..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-gray-900 dark:text-white"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {['all', 'open-circuit', 'short-circuit', 'overheating', 'aging', 'shading/soiling'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors capitalize ${
                      activeCategory === cat
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable List */}
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {filteredUrgent.map((item) => (
                <div
                  key={item.panel_id}
                  onClick={() => {
                    setIsModalOpen(false);
                    selectPanelAndDiagnose(item.panel_id);
                  }}
                  className="p-3 border border-gray-200/90 dark:border-gray-800 rounded-lg hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 cursor-pointer flex items-center justify-between group transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                        {item.panel_id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 capitalize border border-rose-200 dark:border-rose-800">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      {item.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-3">
                    <span className="hidden sm:inline">Inspect</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}

              {filteredUrgent.length === 0 && (
                <div className="p-8 text-center text-xs text-gray-400">
                  No urgent panels match your search.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
