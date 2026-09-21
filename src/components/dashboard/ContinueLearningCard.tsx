import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircleIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { loadLibrary, watchedCount } from '../../data/library';

type Item = {
  id: string;
  title: string;
  kind: string;
  thumbnailUrl?: string;
  watched: number;
  total: number;
  pct: number;
};

/**
 * "Continue Learning": the classes a student has access to, most relevant
 * first. In-progress items lead (furthest along first), then ones not yet
 * started. Finished classes are left out — there's nothing to continue.
 *
 * Progress comes from the same watched-lesson record the watch page keeps,
 * so the percentage here always matches what the student sees there.
 */
export function ContinueLearningCard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { packs, recordings } = await loadLibrary(user.id, isAdmin);
      const all: Item[] = [
        ...recordings.filter((m) => m.unlocked).map((m) => ({
          id: m.id,
          title: m.topics.length ? m.topics.join(' · ') : `${m.month} ${m.year} Recordings`,
          kind: 'Monthly Recordings',
          thumbnailUrl: m.thumbnailUrl,
          total: m.sessionCount,
          watched: watchedCount(m.id)
        })),
        ...packs.map((p) => ({
          id: p.id,
          title: p.title,
          kind: p.type || 'Video Pack',
          thumbnailUrl: p.thumbnailUrl,
          total: p.videoCount,
          watched: watchedCount(p.id)
        }))
      ].map((it) => ({
        ...it,
        watched: it.total > 0 ? Math.min(it.watched, it.total) : it.watched,
        pct: it.total > 0 ? Math.round((Math.min(it.watched, it.total) / it.total) * 100) : 0
      }));

      const inProgress = all.filter((i) => i.pct > 0 && i.pct < 100).sort((a, b) => b.pct - a.pct);
      const notStarted = all.filter((i) => i.pct === 0);
      if (!active) return;
      setItems([...inProgress, ...notStarted].slice(0, 3));
      setIndex(0);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user, isAdmin]);

  const current = items[index];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-red-600">
          <PlayCircleIcon className="w-4 h-4" />
          <h2 className="font-bold text-[13px]">Continue Learning</h2>
        </div>
        <button
          onClick={() => navigate('/dashboard/courses')}
          className="text-[10px] font-bold text-red-500 border border-red-100 dark:border-red-900/40 px-3 py-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
      ) : !current ? (
        <div className="py-4 text-center">
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Nothing to continue yet</p>
          <p className="text-[11px] text-zinc-500 mt-1">Classes you have access to will show up here.</p>
        </div>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/dashboard/watch/${current.id}`)}
            aria-label={`Play ${current.title}`}
            className="w-28 h-20 rounded-xl bg-zinc-900 overflow-hidden relative shrink-0 group"
          >
            {current.thumbnailUrl && (
              <img src={current.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <PlayCircleIcon className="w-8 h-8 text-white/80 drop-shadow group-hover:scale-110 transition-transform" />
            </span>
          </button>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded uppercase w-max mb-1">
              {current.pct > 0 ? 'In Progress' : 'Not Started'}
            </span>
            <h3 className="font-bold text-sm mb-1 leading-tight truncate" title={current.title}>{current.title}</h3>
            <p className="text-[10px] text-zinc-500 mb-2 truncate">
              {current.kind}
              {current.total > 0 && ` • ${current.pct}% complete • ${current.watched} of ${current.total} lessons`}
            </p>
            <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-red-600 rounded-full transition-[width] duration-500" style={{ width: `${current.pct}%` }} />
            </div>
            {items.length > 1 && (
              <div className="flex gap-1 justify-end mt-auto">
                {items.map((it, i) => (
                  <button
                    key={it.id}
                    onClick={() => setIndex(i)}
                    aria-label={`Show ${it.title}`}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-red-600' : 'bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate(current ? `/dashboard/watch/${current.id}` : '/dashboard/courses')}
        className="w-full mt-4 bg-red-600 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-red-700 transition-colors"
      >
        {current ? (current.pct > 0 ? 'Continue →' : 'Start →') : 'Browse Classes →'}
      </button>
    </>
  );
}
