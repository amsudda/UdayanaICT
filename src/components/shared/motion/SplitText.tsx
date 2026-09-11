import { Fragment, type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { DURATION, EASE, STAGGER_CHILDREN, TIER_Y, VIEWPORT, type RevealTier } from './tokens';

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';

const TAGS = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
  div: motion.div
};

interface SplitTextProps {
  /** Plain text only — it gets split on whitespace, so it cannot contain JSX. */
  children: string;
  className?: string;
  /** Seconds before the first word moves. */
  delay?: number;
  stagger?: number;
  tier?: RevealTier;
  as?: Tag;
  /** 'mount' for above-the-fold copy, 'view' for anything you scroll to. */
  trigger?: 'mount' | 'view';
  /** Decorative nodes that ride the same cascade (e.g. quotation marks). */
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/**
 * Reveals a line of text one word at a time.
 *
 * Two deliberate choices:
 *
 * 1. Words are separated by a real whitespace text node rather than the usual
 *    `margin-right: 0.45em`. `inline-block` kills normal word spacing, and the
 *    em-margin trick then re-invents it at a slightly different width — which
 *    would visibly change the typography. A plain space between the spans
 *    renders identically to the unsplit text, and lets lines wrap exactly as
 *    they did before.
 * 2. The words are `aria-hidden` and the container carries the full string as
 *    an `aria-label`, so assistive tech reads one sentence instead of a list
 *    of fragments.
 */
export function SplitText({
  children,
  className = '',
  delay = 0,
  stagger = STAGGER_CHILDREN,
  tier = 'heading',
  as = 'div',
  trigger = 'view',
  prefix,
  suffix
}: SplitTextProps) {
  const words = children.split(/\s+/).filter(Boolean);
  const MotionTag = TAGS[as] as typeof motion.div;

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } }
  };

  const word: Variants = {
    hidden: { opacity: 0, y: TIER_Y[tier] },
    show: { opacity: 1, y: 0, transition: { duration: DURATION, ease: EASE } }
  };

  const triggerProps =
    trigger === 'mount'
      ? { animate: 'show' }
      : { whileInView: 'show', viewport: VIEWPORT };

  return (
    <MotionTag
      className={className}
      variants={container}
      initial="hidden"
      {...triggerProps}
      aria-label={children}
    >
      {prefix ? (
        <motion.span variants={word} className="inline-block" aria-hidden="true">
          {prefix}
        </motion.span>
      ) : null}

      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          <motion.span variants={word} className="inline-block" aria-hidden="true">
            {w}
          </motion.span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}

      {suffix ? (
        <motion.span variants={word} className="inline-block" aria-hidden="true">
          {suffix}
        </motion.span>
      ) : null}
    </MotionTag>
  );
}
