import { motion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';
import {
  CONTAINER_VIEWPORT,
  DELAY_CHILDREN,
  DURATION,
  EASE,
  STAGGER_CHILDREN,
  TIER_Y,
  type RevealTier
} from './tokens';

interface StaggerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
  amount?: number | 'some' | 'all';
}

/**
 * The container only orchestrates — it deliberately animates nothing itself.
 * Fading the container as well as its items double-fades the grid and muddies
 * the ripple. An empty `hidden` variant still propagates to the children.
 */
const staggerContainer = (staggerDelay: number): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: DELAY_CHILDREN
    }
  }
});

export function Stagger({
  children,
  staggerDelay = STAGGER_CHILDREN,
  className = '',
  amount = CONTAINER_VIEWPORT.amount
}: StaggerProps) {
  return (
    <motion.div
      variants={staggerContainer(staggerDelay)}
      initial="hidden"
      whileInView="show"
      viewport={{ ...CONTAINER_VIEWPORT, amount }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const itemVariants = (tier: RevealTier): Variants => ({
  hidden: { opacity: 0, y: TIER_Y[tier] },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION, ease: EASE }
  }
});

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  tier?: RevealTier;
  /**
   * Pixels the card lifts on hover. This has to live here rather than in CSS:
   * once the reveal has run, framer leaves an inline `transform` on the
   * element (`transform: none` when every value is back to its default), and
   * no stylesheet `:hover` rule can override an inline style. A CSS hover lift
   * on a StaggerItem silently does nothing.
   */
  hoverLift?: number;
}

export function StaggerItem({
  children,
  className = '',
  tier = 'card',
  hoverLift
}: StaggerItemProps) {
  return (
    <motion.div
      variants={itemVariants(tier)}
      whileHover={hoverLift ? { y: -hoverLift, transition: { duration: 0.3, ease: EASE } } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
}
