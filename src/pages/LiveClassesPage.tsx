import { useEffect, useState } from 'react';
import {
  CalendarRangeIcon,
  CalendarIcon,
  VideoIcon,
  KeyIcon,
  HashIcon,
  RadioIcon
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

function isLiveNow(iso: string) {
  const start = new Date(iso).getTime();
  const now = Date.now();
  return now >= start - 10 * 60000 && now <= start + 3 * 3600000;
}

export function LiveClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('live_classes')
      .select('*')
      .order('scheduled_at', { ascending: true })
      .then(({ data }) => {
        setClasses(data ?? []);
        setLoading(false);
      });
  }, []);

  const now = Date.now();
  const upcoming = classes.filter((c) => new Date(c.scheduled_at).getTime() > now - 3 * 3600000);
  const past = classes.filter((c) => new Date(c.scheduled_at).getTime() <= now - 3 * 3600000).reverse();

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-LK', { weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const ClassCard = ({ c }: { c: any }) => {
    const live = isLiveNow(c.scheduled_at);
    return (
      <Card className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:items-center">
        <div className="flex-1 space-y-3 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            {live ? (
              <Badge variant="danger" className="animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Live Now
              </Badge>
            ) : (
              <Badge variant="info">Upcoming</Badge>
            )}
            <span className="text-xs font-medium text-apple-subtext dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md capitalize">
              {c.kind === 'monthly' ? `Monthly${c.period_month ? ` · ${c.period_month}` : ''}` : 'Special class'}
            </span>
            <span className="text-xs font-medium text-apple-subtext dark:text-slate-400 capitalize">{c.platform}</span>
          </div>

          <h3 className="text-lg font-semibold text-apple-text dark:text-apple-light">{c.title}</h3>

          <div className="flex flex-wrap gap-4 text-sm text-apple-subtext dark:text-slate-400">
            <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {fmt(c.scheduled_at)}</span>
            {c.instructor && <span className="flex items-center gap-1.5"><VideoIcon className="w-4 h-4" /> {c.instructor}</span>}
          </div>

          {(c.meeting_id || c.passcode) && (
            <div className="flex flex-wrap gap-3 text-xs text-apple-subtext dark:text-slate-400">
              {c.meeting_id && <span className="flex items-center gap-1.5"><HashIcon className="w-3.5 h-3.5" /> ID: <span className="font-mono font-semibold">{c.meeting_id}</span></span>}
              {c.passcode && <span className="flex items-center gap-1.5"><KeyIcon className="w-3.5 h-3.5" /> Passcode: <span className="font-mono font-semibold">{c.passcode}</span></span>}
            </div>
          )}
        </div>

        <div className="w-full sm:w-auto flex flex-col gap-2">
          <a href={c.zoom_link} target="_blank" rel="noopener noreferrer" className="w-full">
            <Button variant={live ? 'primary' : 'secondary'} className="w-full flex items-center gap-2">
              <VideoIcon className="w-4 h-4" /> {live ? 'Join Now' : 'Open Link'}
            </Button>
          </a>
          {c.backup_url && (
            <a href={c.backup_url} target="_blank" rel="noopener noreferrer" className="text-xs text-center text-apple-blue hover:underline">
              Backup link
            </a>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-apple-blue">Live Classes</p>
        <h1 className="mt-2 text-3xl font-bold text-apple-text dark:text-apple-light">Your online sessions</h1>
        <p className="mt-2 text-apple-subtext dark:text-slate-400">
          Join your scheduled classes here. Monthly classes appear once your fee for that month is verified.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-apple-subtext dark:text-slate-400">Loading…</p>
      ) : classes.length === 0 ? (
        <Card className="p-10 text-center">
          <RadioIcon className="w-8 h-8 text-apple-subtext/40 mx-auto mb-3" />
          <h2 className="font-bold text-apple-text dark:text-apple-light">No live classes yet</h2>
          <p className="text-sm text-apple-subtext dark:text-slate-400 mt-1">
            When a class is scheduled for your batch (and your fee is verified), it'll show up here.
          </p>
        </Card>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 p-3 text-apple-blue"><CalendarRangeIcon className="w-5 h-5" /></div>
              <h2 className="text-xl font-bold text-apple-text dark:text-apple-light">Upcoming</h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-apple-subtext dark:text-slate-400">No upcoming classes scheduled.</p>
            ) : (
              <div className="space-y-4">{upcoming.map((c) => <ClassCard key={c.id} c={c} />)}</div>
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-apple-text dark:text-apple-light">Past sessions</h2>
              <div className="space-y-4 opacity-70">{past.map((c) => <ClassCard key={c.id} c={c} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
