import React from 'react';
import { SelectionProvider, useSelection } from './context/SelectionContext';
import { Navbar } from './components/Navbar';
import { AlertBanner } from './components/AlertBanner';
import { StationOverview } from './views/StationOverview';
import { Diagnose } from './views/Diagnose';
import { Patterns } from './views/Patterns';

import { WorkOrderModal } from './components/WorkOrderModal';
import { ShiftHandoverModal } from './components/ShiftHandoverModal';

const MainContent = () => {
  const { currentView } = useSelection();

  return (
    <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950 transition-colors">
      <AlertBanner />
      <main className="flex-1 overflow-y-auto">
        {currentView === 'overview' && <StationOverview />}
        {currentView === 'diagnose' && <Diagnose />}
        {currentView === 'patterns' && <Patterns />}
      </main>
      <WorkOrderModal />
      <ShiftHandoverModal />
    </div>
  );
};

export default function App() {
  return (
    <SelectionProvider>
      <div className="flex min-h-screen font-sans">
        <Navbar />
        <MainContent />
      </div>
    </SelectionProvider>
  );
}
