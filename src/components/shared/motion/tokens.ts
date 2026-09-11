/**
 * Shared motion tokens. Every reveal primitive reads from here so the whole
 * page animates as one system instead of five slightly different ones.
 */

/** One easing everywhere. Matches the Lenis scroll easing in SmoothScroll. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Short enough to land while you are looking at it, long enough to feel deliberate. */
export const DURATION = 0.6;

/**
 * Travel distance is tiered by type size — the bigger the element, the further
 * it moves. A flat value makes a headline and a caption feel identical, which
 * is the main thing that reads as "template".
 */
export const TIER_Y = {
  heading: 32,
  card: 20,
  text: 16
} as const;

export type RevealTier = keyof typeof TIER_Y;

/**
 * Reveal only once, and only once the element is genuinely on screen.
 *
 * The delay comes mostly from the negative bottom margin rather than a high
 * `amount`, because margin is height-independent: an element taller than the
 * viewport can never reach a high `amount` threshold, which would leave it
 * stuck invisible forever.
 */
export const VIEWPORT = {
  once: true,
  amount: 0.25,
  margin: '0px 0px -12% 0px'
};

/**
 * Containers (card grids) collapse to one very tall column on mobile, so they
 * trigger on a much smaller visible fraction — see the note above.
 */
export const CONTAINER_VIEWPORT = {
  once: true,
  amount: 0.1,
  margin: '0px 0px -12% 0px'
};

/** Grid choreography: a tight ripple, with a beat before the first item. */
export const STAGGER_CHILDREN = 0.075;
export const DELAY_CHILDREN = 0.15;
