import { StarIcon } from 'lucide-react';

export interface Review {
  id?: string;
  name: string;
  school?: string | null;
  grade?: string | null;
  stars: number;
  quote: string;
  year?: string | null;
  avatar?: string | null;
}

/** Badge tone from the grade's first letter (A→green, B→blue, C→amber, else slate). */
function gradeTone(grade: string) {
  const first = grade.trim().charAt(0).toUpperCase();
  if (first === 'A' || /^\d+A/i.test(grade.trim())) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
  if (first === 'B') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
  if (first === 'C') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

/**
 * A single student testimonial card. Used on the landing page AND inside the
 * admin preview, so what the admin sees is exactly what visitors get.
 */
export function ReviewCard({ review }: { review: Review }) {
  const initials = review.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-slate-700 flex flex-col gap-4 hover:shadow-[0_8px_32px_rgba(194,15,36,0.12)] dark:hover:shadow-[0_8px_32px_rgba(194,15,36,0.15)] transition-all duration-300 hover:-translate-y-1 h-full">
      {/* Stars */}
      <div className="flex gap-1">
        {Array.from({ length: Math.max(1, Math.min(5, review.stars)) }).map((_, i) => (
          <StarIcon key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-apple-text dark:text-slate-200 text-sm leading-relaxed flex-1 transition-colors">
        <span className="text-[#c20f24] text-xl font-serif leading-none mr-1">"</span>
        {review.quote}
        <span className="text-[#c20f24] text-xl font-serif leading-none ml-1">"</span>
      </p>

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-slate-700 pt-4 flex items-center gap-3">
        {review.avatar ? (
          <img
            src={review.avatar}
            alt={review.name}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-red-100 dark:ring-red-900"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 ring-2 ring-red-100 dark:ring-red-900 flex items-center justify-center text-[#c20f24] font-bold text-sm shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-apple-text dark:text-apple-light text-sm truncate transition-colors">
            {review.name}
          </p>
          {review.school && (
            <p className="text-xs text-apple-subtext dark:text-slate-400 truncate transition-colors">
              {review.school}
            </p>
          )}
        </div>
        {review.grade && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${gradeTone(review.grade)}`}>
            {review.grade}
          </span>
        )}
      </div>

      {/* Year badge */}
      {review.year && (
        <div className="flex justify-end -mt-2">
          <span className="text-xs text-apple-subtext dark:text-slate-500 font-medium">{review.year}</span>
        </div>
      )}
    </div>
  );
}
