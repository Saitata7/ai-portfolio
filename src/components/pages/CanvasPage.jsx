import HeroCanvas from '../sections/HeroCanvas';
import StatusBar from '../layout/StatusBar';

export default function CanvasPage({ onStatusChange, onNavigate, agentState, navLabel, bugFight }) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <HeroCanvas onStatusChange={onStatusChange} onNavigate={onNavigate} />
      <StatusBar state={agentState} navLabel={navLabel} bugFight={bugFight} />
    </div>
  );
}
