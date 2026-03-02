import { useState, useCallback, useEffect } from 'react';
import CustomCursor from './components/layout/CustomCursor';
import CanvasPage from './components/pages/CanvasPage';
import ContentPage from './components/pages/ContentPage';

export default function App() {
  const [activePage, setActivePage] = useState('canvas');
  const [targetSection, setTargetSection] = useState(null);

  const [agentState, setAgentState] = useState('working');
  const [navLabel, setNavLabel] = useState('');
  const [bugFight, setBugFight] = useState(false);

  // Lock body scroll on canvas page
  useEffect(() => {
    document.body.style.overflow = activePage === 'canvas' ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [activePage]);

  const handleStatusChange = useCallback((state, label, isBugFight) => {
    setAgentState(state);
    if (label) setNavLabel(label);
    if (isBugFight !== undefined) setBugFight(isBugFight);
  }, []);

  const handleNavigate = useCallback((sectionId) => {
    setTargetSection(sectionId);
    setActivePage('content');
    window.scrollTo(0, 0);
  }, []);

  const handleBackToCanvas = useCallback(() => {
    setActivePage('canvas');
    setTargetSection(null);
    window.scrollTo(0, 0);
  }, []);

  const handleClearTarget = useCallback(() => {
    setTargetSection(null);
  }, []);

  return (
    <>
      <CustomCursor watching={activePage === 'canvas' && agentState === 'watching'} />
      <div key={activePage} className="animate-[fadeUp_0.4s_ease]">
        {activePage === 'canvas' ? (
          <CanvasPage
            onStatusChange={handleStatusChange}
            onNavigate={handleNavigate}
            agentState={agentState}
            navLabel={navLabel}
            bugFight={bugFight}
          />
        ) : (
          <ContentPage
            targetSection={targetSection}
            onClearTarget={handleClearTarget}
            onBackToCanvas={handleBackToCanvas}
          />
        )}
      </div>
    </>
  );
}
