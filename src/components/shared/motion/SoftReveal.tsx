import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { EASE, VIEWPORT } from './tokens';

interface SoftRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number | 'some' | 'all';
}

/** Opacity only — for things that shouldn't move, just arrive. Slightly longer
 *  than a FadeUp because there is no travel to carry the eye. */
export function SoftReveal({
  children,
  delay = 0,
  className = '',
  amount = VIEWPORT.amount
}: SoftRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ ...VIEWPORT, amount }}
      transition={{ duration: 0.75, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
