import React from 'react';
import { motion } from 'framer-motion';
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}
export function Card({
  children,
  className = '',
  hoverable = false,
  onClick
}: CardProps) {
  const baseStyles =
  'bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-apple dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden transition-colors duration-300';
  if (hoverable || onClick) {
    return (
      <motion.div
        whileHover={{
          y: -4,
          boxShadow: document.documentElement.classList.contains('dark') ? '0 15px 40px rgba(0, 0, 0, 0.5)' : '0 12px 32px rgba(0, 0, 0, 0.08)'
        }}
        transition={{
          duration: 0.2,
          ease: 'easeOut'
        }}
        className={`${baseStyles} cursor-pointer ${className}`}
        onClick={onClick}>

        {children}
      </motion.div>);

  }
  return <div className={`${baseStyles} ${className}`}>{children}</div>;
}