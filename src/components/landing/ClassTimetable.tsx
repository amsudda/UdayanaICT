import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  Clock3Icon,
  MonitorPlayIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TimetableEntry = {
  id: string;
  exam_year: number;
  venue_name: string;
  location: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  note: string | null;
  registration_url: string | null;
  sort_order: number;
};

const DAYS = [
  { short: 'SUN', si: 'ඉරිදා' },
  { short: 'MON', si: 'සඳුදා' },
  { short: 'TUE', si: 'අඟහරුවාදා' },
  { short: 'WED', si: 'බදාදා' },
  { short: 'THU', si: 'බ්‍රහස්පතින්දා' },
  { short: 'FRI', si: 'සිකුරාදා' },
  { short: 'SAT', si: 'සෙනසුරාදා' },
] as const;

function displayTime(value: string) {
  const [hourValue = '0', minute = '00'] = value.split(':');
  const hour = Number(hourValue);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function ScheduleSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading class timetable">
      {[0, 1, 2].map((item) => (
        <div key={item} className="min-h-[330px] rounded-[24px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div className="h-14 w-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="mt-8 h-5 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-8 h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="mt-6 h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export function ClassTimetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from('class_timetable')
      .select('id, exam_year, venue_name, location, day_of_week, start_time, end_time, note, registration_url, sort_order')
      .eq('is_active', true)
      .eq('class_mode', 'online')
      .order('exam_year', { ascending: false })
      .order('day_of_week')
      .order('sort_order')
      .then(({ data }) => {
        if (!active) return;
        const nextEntries = (data ?? []) as TimetableEntry[];
        setEntries(nextEntries);
        setSelectedYear((current) => current ?? nextEntries[0]?.exam_year ?? null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const years = useMemo(
    () => [...new Set(entries.map((entry) => entry.exam_year))].sort((a, b) => b - a),
    [entries]
  );

  const visibleEntries = useMemo(
    () => entries.filter((entry) => entry.exam_year === selectedYear),
    [entries, selectedYear]
  );

  const today = new Date().getDay();

  return (
    <section id="timetable" className="relative scroll-mt-20 overflow-hidden bg-transparent pb-20 pt-12 sm:pb-24 sm:pt-16">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-9 flex flex-col gap-7 lg:mb-11 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#c20f24]">
              <span className="h-px w-8 bg-[#c20f24]" />
              Class schedule
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 dark:text-white sm:text-4xl lg:text-[44px]">
              පන්ති කාලසටහන
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
              ඔබගේ A/L කණ්ඩායමට අදාළ Online පන්තිය තෝරාගෙන ICT ගමන අදම ආරම්භ කරන්න.
            </p>
          </div>

          {years.length > 0 && (
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900" aria-label="Select exam year">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  aria-pressed={selectedYear === year}
                  className={`h-10 shrink-0 rounded-xl px-5 text-sm font-bold transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/40 active:scale-[0.97] ${
                    selectedYear === year
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {year} A/L
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-red-100 bg-red-50 text-[#c20f24] dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
              <CalendarDaysIcon className="h-[19px] w-[19px]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Weekly classes</p>
              <p className="text-xs text-slate-400" aria-live="polite">
                {loading ? 'Loading schedule…' : `${visibleEntries.length} class${visibleEntries.length === 1 ? '' : 'es'} available`}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400 sm:self-auto">
            <MonitorPlayIcon className="h-3.5 w-3.5" aria-hidden="true" />
            100% Online
          </div>
        </div>

        {loading ? (
          <ScheduleSkeleton />
        ) : visibleEntries.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900 sm:py-20">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">කාලසටහන ඉක්මනින්</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              මෙම කණ්ඩායම සඳහා නව පන්ති වේලාවන් මෙහි පළ කෙරේ.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleEntries.map((entry) => {
              const day = DAYS[entry.day_of_week] ?? DAYS[0];
              const isToday = entry.day_of_week === today;

              return (
                <article
                  key={entry.id}
                  className={`group relative flex min-h-[338px] flex-col overflow-hidden rounded-[24px] border bg-white p-6 shadow-[0_12px_35px_rgba(30,41,59,0.055)] transition-[border-color,box-shadow] duration-200 dark:bg-slate-900 ${
                    isToday
                      ? 'border-red-200 shadow-[0_16px_42px_rgba(194,15,36,0.10)] dark:border-red-900/70'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_18px_46px_rgba(30,41,59,0.09)] dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${isToday ? 'bg-[#c20f24]' : 'bg-slate-900 dark:bg-slate-700'}`} aria-hidden="true" />

                  <div className="flex items-start justify-between gap-4">
                    <div className={`min-w-[68px] rounded-2xl border px-3 py-2.5 ${
                      isToday
                        ? 'border-red-100 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                    }`}>
                      <p className={`text-[10px] font-extrabold tracking-[0.18em] ${isToday ? 'text-[#c20f24] dark:text-red-400' : 'text-slate-400'}`}>{day.short}</p>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{day.si}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400">
                        <MonitorPlayIcon className="h-3 w-3" aria-hidden="true" />
                        Live online
                      </span>
                      {isToday && <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#c20f24] dark:text-red-400">Today</span>}
                    </div>
                  </div>

                  <div className="mt-7 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{entry.exam_year} A/L ICT</p>
                    <h3 className="mt-2 text-xl font-bold leading-snug tracking-[-0.025em] text-slate-950 dark:text-white">{entry.venue_name}</h3>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <MonitorPlayIcon className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden="true" />
                      {entry.location || 'Online live class'}
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      <Clock3Icon className="h-3.5 w-3.5 text-[#c20f24]" aria-hidden="true" />
                      Class time
                    </div>
                    <div className="mt-2 flex items-baseline gap-2 font-bold tabular-nums text-slate-950 dark:text-white">
                      <span className="text-lg">{displayTime(entry.start_time)}</span>
                      <span className="text-xs font-medium text-slate-300 dark:text-slate-600">to</span>
                      <span className="text-lg">{displayTime(entry.end_time)}</span>
                    </div>
                  </div>

                  {entry.note && <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{entry.note}</p>}

                  <div className="mt-auto pt-5">
                    {entry.registration_url ? (
                      <a
                        href={entry.registration_url}
                        target={entry.registration_url.startsWith('http') ? '_blank' : undefined}
                        rel={entry.registration_url.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="inline-flex h-11 w-full items-center justify-between rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-[#c20f24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/40 focus-visible:ring-offset-2 active:scale-[0.97] dark:bg-white dark:text-slate-950 dark:hover:bg-red-500 dark:hover:text-white dark:focus-visible:ring-offset-slate-900"
                      >
                        Join this class
                        <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <div className="flex h-11 items-center justify-between border-t border-slate-100 text-xs font-semibold text-slate-400 dark:border-slate-800">
                        <span>Weekly online class</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Active" />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
