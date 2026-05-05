import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import './Tooltip.css';

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <HelpCircle size={14} className="tooltip-icon" />
      {visible && <span className="tooltip-box">{text}</span>}
    </span>
  );
}
