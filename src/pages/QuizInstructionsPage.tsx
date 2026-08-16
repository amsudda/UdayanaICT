import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClockIcon, FileTextIcon, BarChart3Icon, ShieldCheckIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export function QuizInstructionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      if (!user || !id) return;
      
      try {
        // Check for existing attempt
        const { data: attempt } = await supabase
          .from('quiz_attempts')
          .select('status')
          .eq('quiz_id', id)
          .eq('student_id', user.id)
          .single();

        if (attempt?.status === 'submitted') {
          navigate(`/dashboard/quizzes/${id}/result`);
          return;
        } else if (attempt?.status === 'in_progress') {
          navigate(`/dashboard/quizzes/${id}/play`);
          return;
        }

        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', id)
          .single();
          
        if (quizError) throw quizError;
        setQuiz(quizData);

        // Fetch question count
        const { count } = await supabase
          .from('quiz_questions')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', id);
          
        setQuestionCount(count || 0);
      } catch (err) {
        console.error('Error loading quiz instructions:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadQuiz();
  }, [id, user, navigate]);

  const handleStart = async () => {
    if (!user || !quiz) return;
    setStarting(true);
    
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          student_id: user.id,
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (error) throw error;
      navigate(`/dashboard/quizzes/${quiz.id}/play`);
    } catch (err) {
      console.error('Error starting quiz:', err);
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quiz not found</h2>
        <button onClick={() => navigate('/dashboard/quizzes')} className="mt-4 text-red-600 hover:underline">
          Back to quizzes
        </button>
      </div>
    );
  }

  const marksPerQuestion = quiz.total_marks && questionCount > 0 
    ? (quiz.total_marks / questionCount).toFixed(1) 
    : 1;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6 my-8"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 md:p-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">{quiz.title}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">{quiz.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <ClockIcon className="h-8 w-8 text-red-500 mb-2" />
            <div className="text-sm text-slate-500 dark:text-slate-400">Duration</div>
            <div className="font-semibold text-slate-900 dark:text-white text-lg">{quiz.duration_minutes} mins</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <DocumentTextIcon className="h-8 w-8 text-red-500 mb-2" />
            <div className="text-sm text-slate-500 dark:text-slate-400">Questions</div>
            <div className="font-semibold text-slate-900 dark:text-white text-lg">{questionCount}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <ChartBarIcon className="h-8 w-8 text-red-500 mb-2" />
            <div className="text-sm text-slate-500 dark:text-slate-400">Marks per Q</div>
            <div className="font-semibold text-slate-900 dark:text-white text-lg">{marksPerQuestion}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <ShieldCheckIcon className="h-8 w-8 text-red-500 mb-2" />
            <div className="text-sm text-slate-500 dark:text-slate-400">Pass Mark</div>
            <div className="font-semibold text-slate-900 dark:text-white text-lg">{quiz.passing_marks || 0}</div>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Instructions & Rules:</h3>
          <ul className="space-y-3">
            <li className="flex gap-3 text-slate-600 dark:text-slate-400">
              <span className="text-red-500">•</span>
              You have one attempt only to complete this quiz.
            </li>
            <li className="flex gap-3 text-slate-600 dark:text-slate-400">
              <span className="text-red-500">•</span>
              The timer starts automatically when you click the Start button.
            </li>
            <li className="flex gap-3 text-slate-600 dark:text-slate-400">
              <span className="text-red-500">•</span>
              Your answers are auto-saved as you progress.
            </li>
            <li className="flex gap-3 text-slate-600 dark:text-slate-400">
              <span className="text-red-500">•</span>
              Do not close your browser during the quiz.
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/dashboard/quizzes')}
            className="flex-1 py-4 px-6 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={starting}
            className="flex-1 py-4 px-6 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {starting ? 'Starting...' : 'Start Quiz'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
