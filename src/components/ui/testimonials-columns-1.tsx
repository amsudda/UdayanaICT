"use client";

import { useEffect, useRef } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { QuoteIcon, StarIcon } from 'lucide-react';

export type Testimonial = {
  text: string;
  name: string;
  role: string;
  avatarIndex: number;
};

const AVATAR_COLUMNS = 6;
const AVATAR_ROWS = 3;

function getAvatarPosition(index: number) {
  const column = index % AVATAR_COLUMNS;
  const row = Math.floor(index / AVATAR_COLUMNS) % AVATAR_ROWS;

  return {
    backgroundPosition: `${(column / (AVATAR_COLUMNS - 1)) * 100}% ${(row / (AVATAR_ROWS - 1)) * 100}%`,
  };
}

type TestimonialCardProps = {
  testimonial: Testimonial;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function TestimonialCard({ testimonial, onMouseEnter, onMouseLeave, onFocus, onBlur }: TestimonialCardProps) {
  const canPauseMarquee = Boolean(onMouseEnter || onFocus);

  return (
    <figure
      tabIndex={canPauseMarquee ? 0 : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      className="mx-auto w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(30,41,59,0.07)] outline-none transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-slate-300 hover:shadow-[0_16px_46px_rgba(30,41,59,0.11)] focus-visible:border-red-300 focus-visible:ring-2 focus-visible:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:border-slate-700 dark:focus-visible:border-red-800 dark:focus-visible:ring-red-950 sm:p-7"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-0.5" aria-label="5 out of 5 stars">
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon key={index} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          ))}
        </div>
        <QuoteIcon className="h-5 w-5 text-red-200 dark:text-red-900" aria-hidden="true" />
      </div>

      <blockquote className="mt-5 text-[14px] leading-7 text-slate-700 dark:text-slate-200">
        “{testimonial.text}”
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <span
          aria-hidden="true"
          className="h-11 w-11 shrink-0 rounded-full bg-[url('/images/student-avatar-sprite.webp')] bg-[length:600%_300%] bg-no-repeat ring-2 ring-red-50 dark:ring-red-950"
          style={getAvatarPosition(testimonial.avatarIndex)}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-[-0.01em] text-slate-950 dark:text-white">{testimonial.name}</div>
          <div className="mt-0.5 truncate text-xs leading-5 text-slate-400">{testimonial.role}</div>
        </div>
      </figcaption>
    </figure>
  );
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  const shouldReduceMotion = useReducedMotion();
  const marqueeTransform = useMotionValue('translateY(0%)');
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);
  const interactionRef = useRef({ mouse: false, focus: false });
  const items = shouldReduceMotion ? props.testimonials : [...props.testimonials, ...props.testimonials];

  useEffect(() => {
    if (shouldReduceMotion) return;

    marqueeTransform.set('translateY(0%)');
    const animation = animate(marqueeTransform, 'translateY(-50%)', {
      duration: props.duration || 16,
      repeat: Infinity,
      ease: 'linear',
      repeatType: 'loop',
    });
    animationRef.current = animation;

    return () => {
      animation.stop();
      animationRef.current = null;
    };
  }, [marqueeTransform, props.duration, shouldReduceMotion]);

  const syncPlayback = () => {
    const animation = animationRef.current;
    if (!animation) return;

    if (interactionRef.current.mouse || interactionRef.current.focus) {
      animation.pause();
    } else {
      animation.play();
    }
  };

  const setInteraction = (source: 'mouse' | 'focus', active: boolean) => {
    interactionRef.current[source] = active;
    syncPlayback();
  };

  return (
    <div className={props.className}>
      <motion.div
        style={shouldReduceMotion ? undefined : { transform: marqueeTransform }}
        className="flex flex-col gap-5 pb-5"
      >
        {items.map((testimonial, index) => (
          <TestimonialCard
            key={`${testimonial.name}-${index}`}
            testimonial={testimonial}
            onMouseEnter={() => setInteraction('mouse', true)}
            onMouseLeave={() => setInteraction('mouse', false)}
            onFocus={() => setInteraction('focus', true)}
            onBlur={() => setInteraction('focus', false)}
          />
        ))}
      </motion.div>
    </div>
  );
};
