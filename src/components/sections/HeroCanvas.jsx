import { useEffect, useRef, useState, useCallback } from 'react';
import World, { SECTION_DEFS } from '../../canvas/World.js';

export default function HeroCanvas({ onStatusChange, onNavigate }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const worldRef = useRef(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const onNavigateRef = useRef(onNavigate);

  const [uiState, setUiState] = useState('working');
  const [bugFight, setBugFight] = useState(false);
  const [navMenuActive, setNavMenuActive] = useState(false);
  const [navBtnsVisible, setNavBtnsVisible] = useState(false);

  // Keep callback refs fresh without restarting animation
  useEffect(() => { onStatusChangeRef.current = onStatusChange; });
  useEffect(() => { onNavigateRef.current = onNavigate; });

  // Single mount — EMPTY deps, never restarts
  useEffect(() => {
    const world = new World(canvasRef.current, wrapRef.current, {
      onStateChange: (state, label, isBugFight) => {
        setUiState(state);
        if (isBugFight !== undefined) setBugFight(isBugFight);
        onStatusChangeRef.current?.(state, label, isBugFight);

        if (state === 'watching') {
          setNavMenuActive(true);
          setTimeout(() => setNavBtnsVisible(true), 100);
        } else {
          setNavBtnsVisible(false);
          setTimeout(() => setNavMenuActive(false), 300);
        }
      },
      onNavigationComplete: (sectionId) => {
        onNavigateRef.current?.(sectionId);
      },
    });

    worldRef.current = world;
    world.start();
    return () => world.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCanvasClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    worldRef.current?.handleClick(cssX, cssY);
  }, []);

  const handleNavClick = useCallback((e, idx) => {
    e.stopPropagation();
    worldRef.current?.dispatch('NAVIGATE', { nodeIndex: idx });
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-screen overflow-hidden"
      id="heroSection"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
      />

      {/* ── Hero overlay text — top-left, out of workspace ── */}
      <div
        className="absolute top-8 left-8 md:top-10 md:left-12 pointer-events-none z-10 transition-opacity duration-300"
        style={{ opacity: uiState === 'watching' ? 0.15 : 1 }}
      >
        <h1
          className="text-[clamp(24px,4vw,48px)] font-black tracking-[-1.5px] leading-[1.1] text-white opacity-0 animate-[fadeUp_0.8s_0.3s_forwards] drop-shadow-[0_0_30px_rgba(0,240,255,0.15)]"
          style={{ transform: 'translateY(20px)' }}
        >
          Sai Tata{' '}
          <span className="bg-gradient-to-br from-cyan via-pink to-cyan bg-[length:200%_200%] bg-clip-text text-transparent animate-grad-shift drop-shadow-[0_0_20px_rgba(255,0,110,0.3)]">
            /
          </span>{' '}
          AI Engineer
        </h1>
        <p
          className="text-[clamp(12px,1.3vw,15px)] text-text/70 font-light mt-3 max-w-[380px] tracking-wide opacity-0 animate-[fadeUp_0.8s_0.6s_forwards]"
          style={{ transform: 'translateY(20px)' }}
        >
          Voice AI &bull; LLM Agents &bull; Full-Stack AI Products
        </p>
      </div>

      {/* ── Click hint — bottom center, subtle ── */}
      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-opacity duration-300"
        style={{ opacity: uiState === 'working' ? 1 : 0 }}
      >
        <div
          className="font-mono text-[10px] text-text-dim/70 tracking-[2px] uppercase opacity-0 animate-[fadeUp_0.8s_1.5s_forwards]"
          style={{ transform: 'translateY(10px)' }}
        >
          <span className="inline-block py-0.5 px-2 border border-cyan/30 rounded mr-1 text-cyan/60 text-[9px]">
            CLICK
          </span>{' '}
          to interrupt
        </div>
      </div>

      {/* ── Left-side nav — compact ── */}
      <div
        className={`absolute left-4 md:left-8 bottom-24 z-20 transition-opacity duration-300 ${
          navMenuActive
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`font-mono text-[8px] text-pink/70 tracking-[1.5px] uppercase mb-2 transition-opacity duration-200 ${
            navMenuActive ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Navigate to
        </div>

        <div className="flex flex-col gap-1">
          {SECTION_DEFS.map((sd, i) => (
            <button
              key={sd.section}
              onClick={(e) => handleNavClick(e, i)}
              className={`py-1.5 px-3 bg-[rgba(8,12,20,0.8)] backdrop-blur-sm border border-white/[0.04] rounded cursor-pointer transition-all duration-200 text-left hover:border-cyan/30 hover:translate-x-0.5 ${
                navBtnsVisible
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-3'
              }`}
              style={{
                transitionDelay: navBtnsVisible ? `${i * 0.04}s` : '0s',
                borderLeftColor: sd.color,
                borderLeftWidth: '2px',
              }}
            >
              <span className="font-mono text-[9px] text-text-dim/80 tracking-[0.3px]">
                {sd.backLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
