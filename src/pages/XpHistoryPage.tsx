import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Trophy, Calendar, Star, BookOpen, Target } from 'lucide-react';
import { loadXpFeed, loadMyXp, loadWeeklyXp } from '../data/xp';
import { rankForXp } from '../data/ranks';

export function XpHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [totalXp, setTotalXp] = useState(0);
  const [weeklyXp, setWeeklyXp] = useState(0);
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'quiz' | 'paper' | 'achievement'>('all');

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const fetchData = async () => {
      try {
        const [xpData, weekData, feedData] = await Promise.all([
          loadMyXp(),
          loadWeeklyXp(user.id),
          loadXpFeed(user.id)
        ]);
        if (mounted) {
          setTotalXp(xpData || 0);
          setWeeklyXp(weekData || 0);
          setFeed(feedData || []);
        }
      } catch (e) {
        console.error('Failed to load XP history', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [user]);

  const currentRank = rankForXp(totalXp);
  
  const filteredFeed = feed.filter(item => filter === 'all' || item.sourceType === filter);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="h-12 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-zinc-900 dark:text-white" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">XP History</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Your complete XP earning history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6 flex flex-col items-center justify-center space-y-2">
          <Zap className="w-8 h-8 text-[#dc2626]" />
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">{totalXp}</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Total XP</div>
        </div>
        <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6 flex flex-col items-center justify-center space-y-2">
          <Trophy className="w-8 h-8 text-[#dc2626]" />
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">{currentRank.current.name}</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Current Rank</div>
        </div>
        <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6 flex flex-col items-center justify-center space-y-2">
          <Calendar className="w-8 h-8 text-[#dc2626]" />
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">{weeklyXp}</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">This Week XP</div>
        </div>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'quiz', 'paper', 'achievement'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              filter === f 
                ? 'bg-[#dc2626] text-white' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {f === 'all' ? 'All' : f === 'quiz' ? 'AQuiz' : f === 'paper' ? 'Papers' : 'Achievements'}
          </button>
        ))}
      </div>

      {filteredFeed.length === 0 ? (
        <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-12 text-center">
          <Zap className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">Your XP journey starts here. Complete a class, quiz or paper to earn your first XP.</p>
        </div>
      ) : (
        <motion.div 
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredFeed.map(item => (
            <motion.div 
              key={item.id || Math.random().toString(36).substr(2, 9)} 
              variants={itemVariants}
              className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                  {item.sourceType === 'achievement' ? (
                    <Star className="w-5 h-5 text-yellow-500" />
                  ) : item.sourceType === 'paper' ? (
                    <BookOpen className="w-5 h-5 text-blue-500" />
                  ) : item.sourceType === 'quiz' ? (
                    <Target className="w-5 h-5 text-purple-500" />
                  ) : (
                    <Zap className="w-5 h-5 text-[#dc2626]" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">{item.reason || item.description}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    }) : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-500 font-bold">
                <span>+</span>
                <span>{item.amount || item.xp}</span>
                <Zap className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
