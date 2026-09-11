import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { EASE, TIER_Y, VIEWPORT } from './tokens';

interface ImageRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number | 'some' | 'all';
}

/** Media settles from slightly small and slightly low. The scale is subtle on
 *  purpose — anything past 0.98 starts to read as a zoom effect. */
export function ImageReveal({
  children,
  delay = 0,
  className = '',
  amount = VIEWPORT.amount
}: ImageRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: TIER_Y.card, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ ...VIEWPORT, amount }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
