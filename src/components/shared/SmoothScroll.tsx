import { ReactNode, useEffect, useState } from 'react';
import { ReactLenis } from 'lenis/react';

interface SmoothScrollProps {
  children: ReactNode;
}

/**
 * Lenis tuning notes:
 *
 * - `lerp` and `duration` are mutually exclusive. Lenis' animate loop checks
 *   `if (this.duration && this.easing) … else if (this.lerp)`, and `easing`
 *   always has a default — so passing both silently discards `lerp`. We pick
 *   the duration/easing path and leave `lerp` out entirely.
 * - `easeOutCubic` matches the reveal easing used by the motion primitives, so
 *   scrolling and section reveals read as the same physical system.
 * - The multipliers are deliberately BELOW 1: one wheel notch travels a little
 *   less than native, which is what reads as weight. Raising them feels cheap.
 */
const lenisOptions = {
  duration: 1.2,
  easing: (t: number) => 1 - Math.pow(1 - t, 3),
  smoothWheel: true,
  wheelMultiplier: 0.85,
  touchMultiplier: 0.85
};

export function SmoothScroll({ children }: SmoothScrollProps) {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (isReducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={lenisOptions}>
      {children}
    </ReactLenis>
  );
}
