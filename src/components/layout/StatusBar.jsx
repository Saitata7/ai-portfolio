export default function StatusBar({ state, navLabel, bugFight }) {
  let text = 'AGENTS WORKING — click to interrupt';
  let barClass = '';

  if (bugFight) {
    text = '🛡️ SECURITY BREACH — agents responding...';
    barClass = 'border-orange/30 text-orange';
  } else if (state === 'watching') {
    text = '👀 AGENTS PAUSED — choose a section';
    barClass = 'border-pink/30 text-pink';
  } else if (state === 'navigating') {
    text = `🤖 Navigating to ${navLabel || ''}...`;
    barClass = 'border-green/30 text-green';
  } else if (state === 'nav_waiting_click') {
    text = `Click the ${navLabel || ''} box to go there`;
    barClass = 'border-cyan/30 text-cyan';
  }

  const dotClass = bugFight
    ? 'bg-orange shadow-[0_0_10px_#ff8a00] animate-pulse-dot'
    : state === 'watching'
      ? 'bg-pink shadow-[0_0_10px_#ff00aa]'
      : 'bg-green shadow-[0_0_10px_#00ff88] animate-pulse-dot';

  return (
    <div
      className={`fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 sm:gap-3 py-2 px-4 sm:py-3 sm:px-7 bg-dark/85 backdrop-blur-[20px] border border-cyan/15 rounded-full font-mono text-[10px] sm:text-[13px] text-text-dim tracking-[0.5px] sm:tracking-[1px] transition-all duration-400 select-none max-w-[calc(100vw-2rem)] ${barClass}`}
    >
      <div className={`w-2 h-2 rounded-full ${dotClass}`} />
      <span>{text}</span>
    </div>
  );
}
