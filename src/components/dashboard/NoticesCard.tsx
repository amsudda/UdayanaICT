import { useState, useEffect } from 'react';
import { BellIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardContent } from './DashboardCard';

interface Notice {
  id: string;
  title: string;
  message: string;
  created_at: string;
  type: string;
  is_read: boolean;
}

export function NoticesCard() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchNotices = async () => {
      setLoading(true);
      // No student_id filter: RLS already limits this to the student's own
      // rows, their batch's, and the ones posted to everyone. Filtering here
      // threw away every announcement that was not addressed individually.
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // The teacher's announcements come first: XP messages are frequent
      // enough to bury a real notice otherwise, and they have the bell.
      const rows = (data ?? []) as Notice[];
      const announcements = rows.filter((n) => n.type === 'announcement');
      const rest = rows.filter((n) => n.type !== 'announcement');
      setNotices([...announcements, ...rest].slice(0, 3));
      setLoading(false);
    };
    
    fetchNotices();
  }, [user]);

  return (
    <DashboardCard delay={0.4} className="flex flex-col h-full">
      <DashboardCardHeader>
        <DashboardCardTitle icon={BellIcon}>Important Notices</DashboardCardTitle>
      </DashboardCardHeader>
      
      <DashboardCardContent className="flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notices.length > 0 ? (
          <div className="space-y-5 flex-1">
            {notices.map((notice) => (
              <div key={notice.id} className="group relative flex gap-3">
                <div className="shrink-0 mt-1">
                  <span className={`w-2 h-2 rounded-full block ${!notice.is_read ? 'bg-[#c20f24]' : 'bg-gray-300 dark:bg-slate-600'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#172033] dark:text-apple-light mb-0.5 truncate group-hover:text-[#c20f24] transition-colors">
                    {notice.title}
                  </p>
                  <p className="text-[12px] text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {notice.message}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[#64748B]/70 mt-1.5">
                    {new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <BellIcon className="w-10 h-10 text-gray-200 dark:text-slate-700 mb-3" />
            <h4 className="text-sm font-semibold text-[#172033] dark:text-white mb-1">No notices available</h4>
            <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-[200px]">Important announcements from your teacher will show up here.</p>
          </div>
        )}
        
      </DashboardCardContent>
    </DashboardCard>
  );
}
