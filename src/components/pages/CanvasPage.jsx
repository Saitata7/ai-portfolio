import HeroCanvas from '../sections/HeroCanvas';
import StatusBar from '../layout/StatusBar';

export default function CanvasPage({ isActive, onStatusChange, onNavigate, onThemeChange, agentState, navLabel, bugFight, selfHeal, skyBright }) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <HeroCanvas isActive={isActive} onStatusChange={onStatusChange} onNavigate={onNavigate} onThemeChange={onThemeChange} />
      <StatusBar state={agentState} navLabel={navLabel} bugFight={bugFight} selfHeal={selfHeal} isDay={skyBright} />
    </div>
  );
}
