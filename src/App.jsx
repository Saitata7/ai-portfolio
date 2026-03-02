import { useState, useCallback, useEffect } from 'react';
import CustomCursor from './components/layout/CustomCursor';
import CanvasPage from './components/pages/CanvasPage';
import ContentPage from './components/pages/ContentPage';

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    // Check URL hash on initial load
    return window.location.hash === '#portfolio' ? 'content' : 'canvas';
  });
  const [targetSection, setTargetSection] = useState(null);

  const [agentState, setAgentState] = useState('working');
  const [navLabel, setNavLabel] = useState('');
  const [bugFight, setBugFight] = useState(false);
  const [selfHeal, setSelfHeal] = useState(false);
  const [canvasTheme, setCanvasTheme] = useState('night');
  const [skyBright, setSkyBright] = useState(false);

  // Lock body scroll on canvas page
  useEffect(() => {
    document.body.style.overflow = activePage === 'canvas' ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [activePage]);

  // Browser history management
  useEffect(() => {
    const handlePopState = () => {
      const page = window.location.hash === '#portfolio' ? 'content' : 'canvas';
      setActivePage(page);
      if (page === 'canvas') setTargetSection(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleStatusChange = useCallback((state, label, isBugFight, isSelfHeal) => {
    setAgentState(state);
    if (label) setNavLabel(label);
    if (isBugFight !== undefined) setBugFight(isBugFight);
    if (isSelfHeal !== undefined) setSelfHeal(isSelfHeal);
  }, []);

  const handleNavigate = useCallback((sectionId) => {
    setTargetSection(sectionId);
    setActivePage('content');
    window.history.pushState(null, '', '#portfolio');
    window.scrollTo(0, 0);
  }, []);

  const handleBackToCanvas = useCallback(() => {
    setActivePage('canvas');
    setTargetSection(null);
    window.history.pushState(null, '', '#');
    window.scrollTo(0, 0);
  }, []);

  const handleClearTarget = useCallback(() => {
    setTargetSection(null);
  }, []);

  const isCanvas = activePage === 'canvas';

  return (
    <>
      <CustomCursor watching={isCanvas && agentState === 'watching'} />

      {/* Canvas page — always mounted, hidden when not active */}
      <div
        className={isCanvas ? 'animate-[fadeUp_0.4s_ease]' : ''}
        style={{
          display: isCanvas ? 'block' : 'none',
        }}
      >
        <CanvasPage
          isActive={isCanvas}
          onStatusChange={handleStatusChange}
          onNavigate={handleNavigate}
          onThemeChange={(theme, bright) => { setCanvasTheme(theme); if (bright !== undefined) setSkyBright(bright); }}
          agentState={agentState}
          navLabel={navLabel}
          bugFight={bugFight}
          selfHeal={selfHeal}
          skyBright={skyBright}
        />
      </div>

      {/* Content page — mounts on first visit, hidden when not active */}
      {activePage === 'content' && (
        <div className="animate-[fadeUp_0.4s_ease]">
          <ContentPage
            targetSection={targetSection}
            onClearTarget={handleClearTarget}
            onBackToCanvas={handleBackToCanvas}
          />
        </div>
      )}
    </>
  );
}
