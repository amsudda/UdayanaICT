import { useEffect, useState } from 'react';
import { CalendarIcon, ClockIcon, HistoryIcon, VideoIcon } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { supabase } from '../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

export function ClassHistoryPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('live_classes')
      .select('*')
      .lt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setClasses(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c20f24]">
          Class History
        </p>
        <h1 className="mt-2 text-3xl font-bold text-apple-text dark:text-apple-light">Past classes</h1>
        <p className="mt-2 text-apple-subtext dark:text-slate-400">
          All the live classes held for your batch so far, newest first.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/30 p-3 text-[#c20f24]">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-apple-text dark:text-apple-light">Recent classes</h2>
        </div>

        {loading ? (
          <p className="text-sm text-apple-subtext dark:text-slate-400">Loading…</p>
        ) : classes.length === 0 ? (
          <div className="text-center py-12">
            <VideoIcon className="w-8 h-8 text-apple-subtext/40 mx-auto mb-3" />
            <p className="font-semibold text-apple-text dark:text-apple-light">No past classes yet</p>
            <p className="text-sm text-apple-subtext dark:text-slate-400 mt-1">
              Once your live classes take place, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {classes.map((item) => {
              const dt = new Date(item.scheduled_at);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-100 dark:border-slate-800 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <VideoIcon className="w-4 h-4 text-[#c20f24]" />
                      <p className="font-semibold text-apple-text dark:text-apple-light">{item.title}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-apple-subtext dark:text-slate-400">
                      {item.course_label && <span>{item.course_label}</span>}
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="w-4 h-4" />
                        {dateFmt.format(dt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="w-4 h-4" />
                        {timeFmt.format(dt)}
                      </span>
                    </div>
                  </div>
                  <Badge variant={item.kind === 'special' ? 'warning' : 'success'}>
                    {item.kind === 'special' ? 'Special class' : 'Monthly class'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
