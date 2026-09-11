import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { DURATION, EASE, TIER_Y, VIEWPORT, type RevealTier } from './tokens';

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number | 'some' | 'all';
  /** How far the block travels before settling. Defaults to the heading tier. */
  tier?: RevealTier;
}

export function FadeUp({
  children,
  delay = 0,
  className = '',
  amount = VIEWPORT.amount,
  tier = 'heading'
}: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: TIER_Y[tier] }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ ...VIEWPORT, amount }}
      transition={{ duration: DURATION, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
