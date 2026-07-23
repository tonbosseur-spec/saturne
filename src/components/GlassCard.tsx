import React from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  key?: React.Key;
}

export default function GlassCard({ children, className = '', delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 24, 
        delay: delay 
      }}
      className={`bg-white/60 backdrop-blur-lg support-[not-(backdrop-filter)]:bg-white/95 border border-white/30 shadow-xl rounded-3xl p-6 sm:p-8 transform-gpu will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}
