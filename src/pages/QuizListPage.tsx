import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClockIcon, FileTextIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  status: string;
}

interface Attempt {
  id: string;
  quiz_id: string;
  status: string;
  score: number | null;
  percentage: number | null;
}

export function QuizListPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      try {
        // Fetch published quizzes
        const { data: quizzesData, error: quizzesError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('status', 'published');
          
        if (quizzesError) throw quizzesError;
        
        const quizzesList = quizzesData || [];
        setQuizzes(quizzesList);

        if (quizzesList.length > 0) {
          const quizIds = quizzesList.map(q => q.id);
          
          // Fetch question counts
          const { data: questionsData, error: questionsError } = await supabase
            .from('quiz_questions')
            .select('quiz_id');
            
          if (!questionsError && questionsData) {
            const counts: Record<string, number> = {};
            questionsData.forEach(q => {
              counts[q.quiz_id] = (counts[q.quiz_id] || 0) + 1;
            });
            setQuestionCounts(counts);
          }

          // Fetch student attempts
          const { data: attemptsData, error: attemptsError } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('student_id', user.id)
            .in('quiz_id', quizIds);
            
          if (!attemptsError && attemptsData) {
            const attemptsMap: Record<string, Attempt> = {};
            attemptsData.forEach(a => {
              attemptsMap[a.quiz_id] = a;
            });
            setAttempts(attemptsMap);
          }
        }
      } catch (err) {
        console.error('Error loading quizzes:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [user]);

  const getStatusChip = (quizId: string) => {
    const attempt = attempts[quizId];
    if (!attempt) {
      return <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold rounded-full">Not Started</span>;
    }
    if (attempt.status === 'in_progress') {
      return <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs font-semibold rounded-full">In Progress</span>;
    }
    return (
      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-xs font-semibold rounded-full">
        Completed {attempt.percentage !== null ? `(${attempt.percentage}%)` : ''}
      </span>
    );
  };

  const handleAction = (quizId: string) => {
    const attempt = attempts[quizId];
    if (!attempt) {
      navigate(`/dashboard/quizzes/${quizId}`);
    } else if (attempt.status === 'in_progress') {
      navigate(`/dashboard/quizzes/${quizId}/play`);
    } else {
      navigate(`/dashboard/quizzes/${quizId}/result`);
    }
  };

  const getActionText = (quizId: string) => {
    const attempt = attempts[quizId];
    if (!attempt) return 'Start Quiz';
    if (attempt.status === 'in_progress') return 'Resume';
    return 'View Result';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <div className="text-red-500 font-bold uppercase tracking-wider text-sm mb-2">AQuiz</div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">Available Quizzes</h1>
        <p className="text-slate-600 dark:text-slate-400">Test your knowledge with our curated quizzes.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6 mb-6"></div>
              <div className="flex gap-4 mb-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-full w-20"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-full w-24"></div>
              </div>
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-full"></div>
            </div>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <FileTextIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-2">No quizzes available</h3>
          <p className="text-slate-500 dark:text-slate-400">Check back later for new quizzes.</p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {quizzes.map(quiz => (
            <motion.div 
              key={quiz.id}
              variants={itemVariants}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2">{quiz.title}</h3>
                {getStatusChip(quiz.id)}
              </div>
              
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-2 flex-grow">
                {quiz.description || 'No description provided.'}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-6">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                  <ClockIcon className="h-4 w-4" />
                  <span>{quiz.duration_minutes} mins</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                  <FileTextIcon className="h-4 w-4" />
                  <span>{questionCounts[quiz.id] || 0} Qs</span>
                </div>
              </div>
              
              <button
                onClick={() => handleAction(quiz.id)}
                className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  !attempts[quiz.id] 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : attempts[quiz.id].status === 'in_progress'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'
                }`}
              >
                {getActionText(quiz.id)}
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
