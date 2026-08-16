import { motion } from 'framer-motion';

/** A single shimmer block — use to represent any loading card/row */
function ShimmerBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-gray-200/80 dark:bg-slate-800 overflow-hidden relative ${className}`}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
      />
    </div>
  );
}

/** Full-page skeleton — drop this at the top of any page while data loads */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="space-y-2">
        <ShimmerBlock className="h-3 w-24" />
        <ShimmerBlock className="h-8 w-56" />
        <ShimmerBlock className="h-3 w-80" />
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[...Array(3)].map((_, i) => (
          <ShimmerBlock key={i} className="h-24 rounded-3xl" />
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <ShimmerBlock key={i} className="h-52 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

/** Compact skeleton for smaller sections */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(count)].map((_, i) => (
        <ShimmerBlock key={i} className="h-44 rounded-3xl" />
      ))}
    </div>
  );
}
