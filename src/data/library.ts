import { supabase } from '../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type LibMonth = {
  id: string;
  month: string;
  year: number;
  thumbnailUrl?: string;
  topics: string[];
  sessionCount: number;
  unlocked: boolean;
};

export type LibPack = {
  id: string;
  title: string;
  type: string;
  thumbnailUrl?: string;
  duration?: string;
  videoCount: number;
};

/** Watched video ids for a pack/month (mock progress, kept in localStorage). */
export function watchedCount(id: string) {
  try {
    return (JSON.parse(localStorage.getItem(`ict-watched-${id}`) ?? '[]') as string[]).length;
  } catch {
    return 0;
  }
}

/** Load everything the student is entitled to: owned packs + visible months. */
export async function loadLibrary(userId: string): Promise<{ packs: LibPack[]; recordings: LibMonth[] }> {
  // approved monthly fees → which months are unlocked
  const { data: pays } = await supabase
    .from('payments')
    .select('period_month, period_year')
    .eq('student_id', userId)
    .eq('kind', 'monthly_fee')
    .eq('status', 'approved');
  const paid = new Set((pays ?? []).map((p: any) => `${p.period_month}-${p.period_year}`));

  // months visible to this student (RLS already filters by batch + published)
  const { data: months } = await supabase
    .from('theory_months')
    .select('*')
    .eq('is_published', true)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  const recordings: LibMonth[] = (months ?? []).map((m: any) => ({
    id: m.id,
    month: m.month,
    year: m.year,
    thumbnailUrl: m.thumbnail_url ?? undefined,
    topics: m.topics ?? [],
    sessionCount: m.session_count ?? 0,
    unlocked: paid.has(`${m.month}-${m.year}`)
  }));

  // packs the student owns (via approved-payment enrollments)
  const { data: enr } = await supabase
    .from('enrollments')
    .select('pack:packs(*)')
    .not('pack_id', 'is', null);

  const ownedPacks = (enr ?? []).map((e: any) => e.pack).filter(Boolean);
  let videoCounts: Record<string, number> = {};
  if (ownedPacks.length) {
    const { data: pv } = await supabase
      .from('pack_videos')
      .select('pack_id')
      .in('pack_id', ownedPacks.map((p: any) => p.id));
    videoCounts = (pv ?? []).reduce<Record<string, number>>((a, r: any) => {
      a[r.pack_id] = (a[r.pack_id] ?? 0) + 1;
      return a;
    }, {});
  }

  const packs: LibPack[] = ownedPacks.map((p: any) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    thumbnailUrl: p.thumbnail_url ?? undefined,
    duration: p.duration_label ?? undefined,
    videoCount: videoCounts[p.id] ?? 0
  }));

  return { packs, recordings };
}
