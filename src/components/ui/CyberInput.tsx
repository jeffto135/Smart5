import React from 'react';
import { cn } from '../../lib/utils';

interface CyberInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  prefix?: string;
  as?: 'input' | 'textarea';
}

export const CyberInput: React.FC<CyberInputProps> = ({ label, prefix, className, as = 'input', ...props }) => {
  const Component = as;
  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-mono uppercase text-cyber-green/70 ml-1">{label}</label>}
      <div className="relative">
        <Component
          className={cn(
            "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/20 transition-all font-mono",
            prefix && "pl-12",
            className
          )}
          {...props}
        />
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-mono text-sm uppercase">
            {prefix}
          </span>
        )}
      </div>
    </div>
  );
};
