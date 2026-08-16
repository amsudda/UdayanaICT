import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, ArrowLeftIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export function QuizReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReview() {
      if (!user || !id) return;
      try {
        // Get attempt
        const { data: attempt } = await supabase
          .from('quiz_attempts')
          .select('id')
          .eq('quiz_id', id)
          .eq('student_id', user.id)
          .eq('status', 'submitted')
          .maybeSingle();

        if (!attempt) {
          navigate(`/dashboard/quizzes`);
          return;
        }

        // Get questions
        const { data: qData } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', id);

        // Get answers
        const { data: aData } = await supabase
          .from('quiz_answers')
          .select('*')
          .eq('attempt_id', attempt.id);

        const answersMap = new Map(aData?.map(a => [a.question_id, a]) || []);
        
        const reviewData = qData?.map(q => ({
          ...q,
          student_answer: answersMap.get(q.id)
        })) || [];

        setQuestions(reviewData);

      } catch (err) {
        console.error('Error loading review:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReview();
  }, [id, user, navigate]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(`/dashboard/quizzes/${id}/result`)}
          className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
        >
          <ArrowLeftIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Review Answers</h1>
      </div>

      <div className="space-y-8">
        {questions.map((q, index) => {
          const ans = q.student_answer;
          const isCorrect = ans?.is_correct;
          const marks = ans?.marks_awarded || 0;

          return (
            <div key={q.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
              <div className="flex justify-between items-start gap-4 mb-6">
                <h3 className="text-lg md:text-xl font-medium text-slate-900 dark:text-white leading-relaxed">
                  <span className="text-slate-400 font-bold mr-2">{index + 1}.</span>
                  {q.question_text}
                </h3>
                <div className={`shrink-0 px-3 py-1 rounded-lg text-sm font-bold ${isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {marks} / {q.marks} marks
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {q.options?.map((opt: any) => {
                  const isStudentChoice = ans?.selected_option_id === opt.id;
                  const isActualCorrect = q.correct_option_id === opt.id;

                  let style = "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300";
                  let Icon = null;

                  if (isStudentChoice && isActualCorrect) {
                    style = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-900 dark:text-emerald-100";
                    Icon = <CheckCircleIcon className="h-6 w-6 text-emerald-500 shrink-0" />;
                  } else if (isStudentChoice && !isActualCorrect) {
                    style = "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-900 dark:text-red-100";
                    Icon = <XCircleIcon className="h-6 w-6 text-red-500 shrink-0" />;
                  } else if (!isStudentChoice && isActualCorrect) {
                    style = "bg-white dark:bg-slate-900 border-emerald-500 border-dashed text-slate-900 dark:text-white";
                    Icon = <CheckCircleIcon className="h-6 w-6 text-emerald-500 shrink-0 opacity-50" />;
                  }

                  return (
                    <div key={opt.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 ${style}`}>
                      <span className="text-base">{opt.text}</span>
                      {Icon}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1 uppercase tracking-wider">Explanation</h4>
                  <p className="text-blue-800 dark:text-blue-200 text-sm">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
