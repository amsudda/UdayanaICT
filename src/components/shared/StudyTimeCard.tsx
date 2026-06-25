import { useEffect, useState, useCallback } from 'react';
import { ClockIcon, TrendingUpIcon, CalendarDaysIcon, PlusIcon, XIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';

/* eslint-disable @typescript-eslint/no-explicit-any */

const pad = (x: number) => String(x).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function weekDays() {
  const d = new Date();
  const off = (d.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - off);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

const MAX_H = 12; // chart y-axis cap

export function StudyTimeCard() {
  const { user } = useAuth();
  const [byDate, setByDate] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [hours, setHours] = useState(4);
  const [saving, setSaving] = useState(false);

  const todayKey = ymd(new Date());
  const days = weekDays();

  const load = useCallback(async () => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 35);
    const { data } = await supabase
      .from('study_logs')
      .select('log_date, hours')
      .eq('student_id', user.id)
      .gte('log_date', ymd(since));
    const map: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { map[r.log_date] = Number(r.hours); });
    setByDate(map);
    setLoading(false);

    // open the daily prompt once per day if today isn't logged yet
    const dismissed = localStorage.getItem('studylog-dismissed') === todayKey;
    if (!(todayKey in map) && !dismissed) {
      setHours(4);
      setModalOpen(true);
    }
  }, [user, todayKey]);

  useEffect(() => { load(); }, [load]);

  const weekHours = days.map((d) => byDate[ymd(d)] ?? 0);
  const weeklyTotal = weekHours.reduce((s, h) => s + h, 0);
  const avg = Math.round((weeklyTotal / 7) * 10) / 10;
  const thisMonth = new Date().getMonth();
  const monthlyTotal = Object.entries(byDate).reduce((s, [k, v]) => (new Date(k).getMonth() === thisMonth ? s + v : s), 0);

  const openLog = () => {
    setHours(byDate[todayKey] ?? 4);
    setModalOpen(true);
  };
  const dismiss = () => {
    localStorage.setItem('studylog-dismissed', todayKey);
    setModalOpen(false);
  };
  const submit = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('study_logs').upsert(
      { student_id: user.id, log_date: todayKey, hours },
      { onConflict: 'student_id,log_date' }
    );
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const todayLogged = todayKey in byDate;

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-[#c20f24]" />
          <h2 className="text-base sm:text-xl font-bold text-apple-text dark:text-apple-light">Study Time</h2>
        </div>
        <button onClick={openLog} className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#c20f24] text-white text-sm font-semibold hover:bg-[#9c0c1d] transition-colors">
          <PlusIcon className="w-4 h-4" /> {todayLogged ? 'Update today' : 'Log today'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 items-center">
        {/* weekly bar chart */}
        <div>
          <div className="flex items-end justify-between gap-2 h-40">
            {weekHours.map((h, i) => {
              const pct = Math.min(h, MAX_H) / MAX_H * 100;
              const isToday = ymd(days[i]) === todayKey;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                  <div className="relative w-full max-w-[34px] flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${isToday ? 'bg-[#c20f24]' : 'bg-red-100 dark:bg-slate-700'}`}
                      style={{ height: `${Math.max(pct, h > 0 ? 6 : 2)}%` }}
                      title={`${h} h`}
                    />
                  </div>
                  <span className={`text-[11px] font-medium ${isToday ? 'text-[#c20f24]' : 'text-apple-subtext dark:text-slate-400'}`}>{DAY_LABELS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* stats */}
        <div className="space-y-2.5">
          {[
            { label: 'Daily average', value: avg, icon: TrendingUpIcon, tone: 'bg-red-50 dark:bg-red-500/10 text-[#c20f24]' },
            { label: 'This week', value: Math.round(weeklyTotal * 10) / 10, icon: ClockIcon, tone: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300' },
            { label: 'This month', value: Math.round(monthlyTotal * 10) / 10, icon: CalendarDaysIcon, tone: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' }
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 px-4 py-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.tone}`}><s.icon className="w-4 h-4" /></div>
              <div>
                <p className="text-[11px] text-apple-subtext dark:text-slate-400">{s.label}</p>
                <p className="text-lg font-black text-apple-text dark:text-apple-light leading-none">{loading ? '—' : `${s.value} h`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* daily log modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={dismiss} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6">
            <button onClick={dismiss} className="absolute top-4 right-4 text-apple-subtext hover:text-apple-text" aria-label="Close"><XIcon className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-[#c20f24]" />
              <h3 className="text-lg font-bold text-apple-text dark:text-apple-light">අද දවසේ වැඩ කොහොමද?</h3>
            </div>
            <p className="text-sm text-apple-subtext dark:text-slate-400 mb-5">
              අද ඔබ අධ්‍යයනය කළ පැය ගණන සටහන් කරන්න. මෙය ඔබේ ප්‍රගතිය නිරීක්ෂණය කිරීමට උපකාරී වේ. 🚀
            </p>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-apple-text dark:text-apple-light">Hours</span>
              <span className="text-2xl font-black text-[#c20f24] tabular-nums">{hours}</span>
            </div>
            <input
              type="range" min={0} max={12} step={0.5} value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-[#c20f24]"
            />
            <div className="flex justify-between text-[10px] text-apple-subtext dark:text-slate-500 mt-1"><span>0</span><span>6</span><span>12</span></div>

            <div className="mt-6 flex gap-3">
              <button onClick={dismiss} className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-slate-700 font-semibold text-apple-subtext hover:bg-gray-50 dark:hover:bg-slate-800">Close</button>
              <button onClick={submit} disabled={saving} className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
