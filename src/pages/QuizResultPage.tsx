import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ClockIcon, FileMinusIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export function QuizResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [attempt, setAttempt] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function fetchResult() {
      if (!user || !id) return;

      try {
        const { data: qData } = await supabase.from('quizzes').select('*').eq('id', id).single();
        if (qData) setQuiz(qData);

        const { data: attData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', id)
          .eq('student_id', user.id)
          .eq('status', 'submitted')
          .maybeSingle();

        if (!attData) {
          navigate(`/dashboard/quizzes/${id}`);
          return;
        }

        setAttempt(attData);

        if (attData.score !== null) {
          // Calculate stats from answers
          const { data: ansData } = await supabase
            .from('quiz_answers')
            .select('is_correct, selected_option_id')
            .eq('attempt_id', attData.id);

          const { count: totalQuestions } = await supabase
            .from('quiz_questions')
            .select('id', { count: 'exact', head: true })
            .eq('quiz_id', id);

          const correct = ansData?.filter(a => a.is_correct).length || 0;
          const answered = ansData?.filter(a => a.selected_option_id).length || 0;
          const incorrect = answered - correct;
          const total = totalQuestions || 0;
          const unanswered = total - answered;

          let timeTaken = 0;
          if (attData.started_at && attData.submitted_at) {
            timeTaken = Math.floor((new Date(attData.submitted_at).getTime() - new Date(attData.started_at).getTime()) / 1000 / 60);
          }

          setStats({ correct, incorrect, unanswered, timeTaken });
          setLoading(false);
        } else {
          // Keep polling
          setLoading(false);
          interval = setTimeout(fetchResult, 3000);
        }
      } catch (err) {
        console.error('Error fetching result:', err);
        setLoading(false);
      }
    }

    fetchResult();

    return () => {
      if (interval) clearTimeout(interval);
    };
  }, [id, user, navigate]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
  }

  if (attempt && attempt.score === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mb-6"></div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Calculating your result...</h2>
        <p className="text-slate-500">Please wait while your answers are being evaluated.</p>
      </div>
    );
  }

  if (!attempt || !quiz || !stats) return null;

  const passed = attempt.percentage >= (quiz.passing_marks || 0);
  const circleCircumference = 2 * Math.PI * 60;
  const strokeDashoffset = circleCircumference - (attempt.percentage / 100) * circleCircumference;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto p-6 my-8"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        <div className={`p-8 text-center border-b ${passed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
          <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-6 bg-white dark:bg-slate-800 shadow-sm">
            {passed ? <span className="text-emerald-600 dark:text-emerald-400">Quiz Passed! 🎉</span> : <span className="text-red-600 dark:text-red-400">Quiz Failed</span>}
          </div>

          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96" cy="96" r="60"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-200 dark:text-slate-800"
              />
              <circle
                cx="96" cy="96" r="60"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circleCircumference}
                strokeDashoffset={strokeDashoffset}
                className={passed ? 'text-emerald-500' : 'text-red-500'}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-slate-900 dark:text-white">{Math.round(attempt.percentage)}%</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{quiz.title}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Score: <span className="font-bold text-slate-900 dark:text-white">{attempt.score}</span> / {quiz.total_marks} marks
          </p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center">
              <CheckCircleIcon className="h-8 w-8 text-emerald-500 mb-2" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.correct}</span>
              <span className="text-sm text-slate-500">Correct</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center">
              <XCircleIcon className="h-8 w-8 text-red-500 mb-2" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.incorrect}</span>
              <span className="text-sm text-slate-500">Incorrect</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center">
              <FileMinusIcon className="h-8 w-8 text-slate-400 mb-2" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.unanswered}</span>
              <span className="text-sm text-slate-500">Unanswered</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center">
              <ClockIcon className="h-8 w-8 text-blue-500 mb-2" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.timeTaken}</span>
              <span className="text-sm text-slate-500">Mins Taken</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(`/dashboard/quizzes`)}
              className="px-8 py-4 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Back to Quizzes
            </button>
            <button
              onClick={() => navigate(`/dashboard/quizzes/${id}/review`)}
              className="px-8 py-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
            >
              Review Answers
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
