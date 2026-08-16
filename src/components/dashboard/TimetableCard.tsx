import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, VideoIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, addDays, isSameDay, parseISO } from 'date-fns';

export function TimetableCard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate 15 days around the selected date for the picker
  const dates = useMemo(() => {
    const arr = [];
    for (let i = -3; i <= 11; i++) {
      arr.push(addDays(new Date(), i));
    }
    return arr;
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data } = await supabase
        .from('live_classes')
        .select('*')
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString())
        .order('scheduled_at', { ascending: true });
        
      setClasses(data || []);
      setLoading(false);
    };
    
    fetchClasses();
  }, [selectedDate]);

  // Timeline hours from 8 AM to 8 PM
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const getPositionStyle = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    // Calculate percentage based on 8AM to 8PM (12 hours)
    // 8AM = 0%, 8PM = 100%
    const totalMinutes = 12 * 60;
    const minutesFrom8AM = (hour - 8) * 60 + minute;
    const percentage = Math.max(0, Math.min(100, (minutesFrom8AM / totalMinutes) * 100));
    
    return { left: `${percentage}%` };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex flex-col h-full relative overflow-hidden">
      
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-[#172033] dark:text-white tracking-tight">Timetable of classes</h2>
      </div>

      {/* Dark Date Picker Pill */}
      <div className="bg-[#1C1C1E] dark:bg-[#121212] rounded-[1.5rem] p-2 flex items-center mb-10 shadow-lg relative z-10 w-full overflow-hidden">
        <button onClick={() => {
            if(scrollRef.current) scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
        }} className="p-2 sm:p-3 hover:bg-white/10 rounded-full transition-colors shrink-0 text-white/50 hover:text-white">
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        
        <div ref={scrollRef} className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-2">
          {dates.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center min-w-[56px] h-[72px] rounded-[1.25rem] transition-all shrink-0 relative group`}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF2E54] to-[#C20F24] rounded-[1.25rem] shadow-[0_0_20px_rgba(255,46,84,0.4)]" />
                )}
                <span className={`relative z-10 text-[18px] font-black ${isSelected ? 'text-white' : 'text-white/40 group-hover:text-white/80'} leading-none mb-1`}>
                  {format(date, 'd')}
                </span>
                <span className={`relative z-10 text-[11px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-white/30 group-hover:text-white/60'}`}>
                  {format(date, 'EEE')}
                </span>
              </button>
            );
          })}
        </div>

        <button onClick={() => {
            if(scrollRef.current) scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }} className="p-2 sm:p-3 hover:bg-white/10 rounded-full transition-colors shrink-0 text-white/50 hover:text-white">
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Horizontal Timeline */}
      <div className="relative flex-1 min-h-[260px] w-full mt-4">
        
        {/* Timeline Grid Background */}
        <div className="absolute inset-0 flex justify-between px-4">
          {hours.map((hour, idx) => (
            <div key={idx} className="h-full flex flex-col items-center border-l border-dashed border-gray-200 dark:border-slate-800 relative z-0">
              <span className="absolute -top-7 text-[11px] font-bold text-[#64748B] dark:text-slate-500 bg-white dark:bg-slate-900 px-2 -translate-x-1/2 whitespace-nowrap">
                {hour > 12 ? `${hour - 12} pm` : hour === 12 ? '12 pm' : `${hour} am`}
              </span>
            </div>
          ))}
        </div>

        {/* Floating Classes */}
        <div className="absolute inset-0 px-4 pt-6 pb-2 relative z-10">
          {loading ? (
             <div className="w-full h-full animate-pulse bg-gray-50/50 dark:bg-slate-800/20 rounded-xl" />
          ) : classes.length === 0 ? (
             <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-400">
               No classes scheduled for this date.
             </div>
          ) : (
            classes.map((cls, idx) => {
              const posStyle = getPositionStyle(cls.scheduled_at);
              // Stagger the vertical positions
              const topPositions = ['5%', '35%', '65%'];
              const topPos = topPositions[idx % topPositions.length];
              
              const isDark = !cls.event_type || ['Class', 'Practical', 'Practical group work', 'Exam'].includes(cls.event_type);
              const cardBg = isDark ? 'bg-[#1C1C1E] dark:bg-[#121212] border-white/5' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800';
              
              let dotColor = 'bg-slate-400';
              if (cls.event_type === 'Class' || !cls.event_type) dotColor = 'bg-[#FF2E54] shadow-[0_0_10px_rgba(255,46,84,0.4)]';
              else if (cls.event_type === 'Meeting') dotColor = 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]';
              else if (cls.event_type === 'Practical') dotColor = 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]';
              else if (cls.event_type === 'Exam') dotColor = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
              
              const textColor = isDark ? 'text-white' : 'text-slate-900 dark:text-white';
              const subTextColor = isDark ? 'text-white/50' : 'text-slate-500';
              
              // Handle optional bullet points
              const bulletPoints = Array.isArray(cls.description) ? cls.description : [];

              return (
                <div 
                  key={cls.id} 
                  className={`absolute p-4 sm:p-5 ${cardBg} rounded-[1.25rem] shadow-xl border w-[260px] hover:-translate-y-1 transition-transform group cursor-pointer z-10 hover:z-20`}
                  style={{ ...posStyle, top: topPos, transform: 'translateX(-50%)' }}
                >
                  <div className={`absolute -top-[1.25rem] left-[10%] w-px h-[1.25rem] ${isDark ? 'bg-white/10' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                    <div>
                       <p className={`${textColor} font-bold text-sm leading-tight`}>
                         {cls.event_type || 'Class'}{cls.title ? `: ${cls.title}` : ''}
                       </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-4">
                    {cls.instructor_avatar ? (
                      <img src={cls.instructor_avatar} alt={cls.instructor} className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                    )}
                    <span className={`${subTextColor} text-xs font-medium`}>{cls.instructor || 'Instructor'}</span>
                  </div>

                  {bulletPoints.length > 0 && (
                    <ul className={`mt-3 pl-4 space-y-1 ${subTextColor} text-[11px]`}>
                      {bulletPoints.map((point: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-current mt-1.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
