import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  glow?: boolean;
}

export const CyberButton: React.FC<CyberButtonProps> = ({ 
  children, 
  className, 
  variant = 'primary', 
  glow = true,
  ...props 
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative px-6 py-3 rounded-xl font-bold uppercase tracking-widest transition-all duration-200 overflow-hidden",
        variant === 'primary' ? "bg-cyber-green text-black" : "border-2 border-cyber-green text-cyber-green bg-transparent",
        glow && variant === 'primary' && !props.disabled && "cyber-glow",
        props.disabled && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {variant === 'primary' && (
        <motion.div
          className="absolute inset-0 bg-white/20"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.button>
  );
};
