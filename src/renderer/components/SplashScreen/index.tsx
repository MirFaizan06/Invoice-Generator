import React, { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import './SplashScreen.css';

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('out'), 1600);
    const t3 = setTimeout(() => onDone(), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className={`splash-screen splash-${phase}`}>
      <div className="splash-content">
        <div className="splash-icon">
          <LayoutGrid size={40} color="#fff" />
        </div>
        <div className="splash-name">BizDesk</div>
        <div className="splash-tagline">Complete Business Suite</div>
        <div className="splash-bar">
          <div className="splash-bar-fill" />
        </div>
      </div>
      <div className="splash-footer">Tech Bytes Design</div>
    </div>
  );
};
