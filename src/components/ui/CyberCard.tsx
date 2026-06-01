import React from 'react';
import { cn } from '../../lib/utils';

interface CyberCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  action?: React.ReactNode;
}

export const CyberCard: React.FC<CyberCardProps> = ({ children, className, title, icon, onClick, action }) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass-card p-6 relative overflow-hidden group transition-all duration-300 hover:border-cyber-green/40", 
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
    >
      {(title || icon || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {icon && <div className="text-cyber-green cyber-text-glow">{icon}</div>}
            {title && <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{title}</h3>}
          </div>
          {action && <div className="relative z-20 shrink-0">{action}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-cyber-green/5 blur-3xl rounded-full group-hover:bg-cyber-green/10 transition-colors" />
    </div>
  );
};
