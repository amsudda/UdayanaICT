import { useId } from 'react';

/**
 * Branded loading indicator: the PD logo with a red arc spinning around it.
 *
 * - `fullscreen` covers the viewport. Used while the session is checked,
 *   and matches the boot splash in index.html pixel-for-pixel so the hand-off
 *   from the HTML splash to React is invisible.
 * - `inline` sits inside a page while that page loads its own data.
 *
 * Styles live in index.css (`.pd-loader*`), including a still, pulsing
 * version for users who have reduced motion turned on.
 */
type Props = {
  variant?: 'fullscreen' | 'inline';
  label?: string;
  className?: string;
};

const SIZES = {
  fullscreen: { ring: 120, logo: 56 },
  inline: { ring: 64, logo: 28 }
} as const;

export function LogoLoader({ variant = 'fullscreen', label = 'Loading...', className = '' }: Props) {
  const gradientId = useId();
  const { ring, logo } = SIZES[variant];

  const content = (
    <div className="pd-loader" role="status" aria-live="polite">
      <div className="pd-loader-ring" style={{ width: ring, height: ring }}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c20f24" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#c20f24" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(194,15,36,0.08)" strokeWidth="4" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round"
            strokeDasharray="130 400"
          />
        </svg>
        <img src="/images/pd-logo-256.webp" alt="" style={{ width: logo, height: logo }} />
      </div>
      {label && (
        <p className={`pd-loader-label ${variant === 'inline' ? 'pd-loader-label--sm' : ''}`}>{label}</p>
      )}
    </div>
  );

  if (variant === 'inline') {
    return <div className={`flex items-center justify-center py-16 ${className}`}>{content}</div>;
  }

  return <div className={`pd-loader-screen ${className}`}>{content}</div>;
}
