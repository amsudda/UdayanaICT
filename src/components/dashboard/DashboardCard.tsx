import React from 'react';
import { motion } from 'framer-motion';

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function DashboardCard({ children, className = '', delay = 0 }: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`bg-white dark:bg-slate-900 rounded-[20px] border border-[#E5EAF2] dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function DashboardCardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-5 border-b border-gray-50 dark:border-slate-800/60 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export function DashboardCardTitle({ children, className = '', icon: Icon }: { children: React.ReactNode; className?: string; icon?: React.ElementType }) {
  return (
    <h3 className={`text-[15px] sm:text-[16px] font-semibold text-[#172033] dark:text-apple-light flex items-center gap-2.5 ${className}`}>
      {Icon && <Icon className="w-[18px] h-[18px] text-[#64748B] dark:text-slate-400" />}
      {children}
    </h3>
  );
}

export function DashboardCardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
