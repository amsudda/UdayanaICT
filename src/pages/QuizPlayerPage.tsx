import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon, CheckCircleIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

// Simple seeded random function for shuffling
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentSeed = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(currentSeed++) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function QuizPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    async function loadPlayData() {
      if (!user || !id) return;
      
      try {
        // Fetch Quiz
        const { data: qData, error: qError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', id)
          .single();
        if (qError) throw qError;
        setQuiz(qData);

        // Fetch or Create Attempt
        let { data: attemptData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', id)
          .eq('student_id', user.id)
          .eq('status', 'in_progress')
          .maybeSingle();

        if (!attemptData) {
          const { data: newAttempt, error: attemptErr } = await supabase
            .from('quiz_attempts')
            .insert({
              quiz_id: id,
              student_id: user.id,
              status: 'in_progress',
              started_at: new Date().toISOString()
            })
            .select()
            .single();
          if (attemptErr) throw attemptErr;
          attemptData = newAttempt;
        }
        setAttempt(attemptData);

        // Calculate time left
        const startedAt = new Date(attemptData.started_at).getTime();
        const now = new Date().getTime();
        const elapsed = (now - startedAt) / 1000;
        const totalDuration = qData.duration_minutes * 60;
        const remaining = Math.max(0, Math.floor(totalDuration - elapsed));
        setTimeLeft(remaining);

        // Fetch questions from safe view
        const { data: qstData, error: qstError } = await supabase
          .from('quiz_questions_safe')
          .select('*')
          .eq('quiz_id', id);
        if (qstError) throw qstError;

        // Shuffle logic
        const seedString = attemptData.id;
        let seed = 0;
        for (let i = 0; i < seedString.length; i++) {
          seed += seedString.charCodeAt(i);
        }

        let processedQuestions = [...(qstData || [])];
        if (qData.randomize_questions) {
          processedQuestions = shuffleArray(processedQuestions, seed);
        }

        if (qData.randomize_options) {
          processedQuestions = processedQuestions.map((q, idx) => ({
            ...q,
            options: shuffleArray(q.options || [], seed + idx)
          }));
        }
        setQuestions(processedQuestions);

        // Fetch existing answers
        const { data: ansData, error: ansError } = await supabase
          .from('quiz_answers')
          .select('question_id, selected_option_id')
          .eq('attempt_id', attemptData.id);
        
        if (!ansError && ansData) {
          const ansMap: Record<string, string> = {};
          ansData.forEach(a => {
            ansMap[a.question_id] = a.selected_option_id;
          });
          setAnswers(ansMap);
        }

      } catch (err) {
        console.error('Error loading quiz player:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlayData();
  }, [id, user]);

  // Timer logic
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft, submitting]);

  const handleAutoSubmit = async () => {
    if (submitting) return;
    await submitQuiz();
  };

  const handleOptionSelect = async (optionId: string) => {
    if (!attempt || !questions[currentIdx]) return;
    const questionId = questions[currentIdx].id;
    
    // Optimistic update
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    setSaving(true);
    
    try {
      await supabase
        .from('quiz_answers')
        .upsert({
          attempt_id: attempt.id,
          question_id: questionId,
          selected_option_id: optionId
        }, { onConflict: 'attempt_id,question_id' });
    } catch (err) {
      console.error('Error saving answer:', err);
    } finally {
      setSaving(false);
    }
  };

  const submitQuiz = async () => {
    if (!attempt) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_quiz', { p_attempt_id: attempt.id });
      if (error) {
        // Fallback
        await supabase
          .from('quiz_attempts')
          .update({ status: 'submitted', submitted_at: new Date().toISOString() })
          .eq('id', attempt.id);
      }
      navigate(`/dashboard/quizzes/${quiz.id}/result`);
    } catch (err) {
      console.error('Submission failed:', err);
      // Fallback
      await supabase
        .from('quiz_attempts')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', attempt.id);
      navigate(`/dashboard/quizzes/${quiz.id}/result`);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft === null || !quiz) return 'text-slate-600 dark:text-slate-300';
    const total = quiz.duration_minutes * 60;
    const ratio = timeLeft / total;
    if (ratio < 0.1) return 'text-red-500 font-bold';
    if (ratio < 0.2) return 'text-amber-500 font-semibold';
    return 'text-slate-600 dark:text-slate-300';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
  }

  if (!questions.length) return <div className="p-8 text-center text-white">No questions found.</div>;

  const currentQ = questions[currentIdx];
  const selectedOption = answers[currentQ.id];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between shadow-sm shrink-0 z-10">
        <div className="flex-1 truncate">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate pr-4">{quiz?.title}</h1>
        </div>
        <div className="font-semibold text-slate-900 dark:text-white px-4">
          Q{currentIdx + 1} <span className="text-slate-500 text-sm font-normal">of {questions.length}</span>
        </div>
        <div className={`flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg ${getTimerColor()}`}>
          <ClockIcon className="h-5 w-5" />
          <span className="font-mono text-lg">{timeLeft !== null ? formatTime(timeLeft) : '--:--'}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-10 mb-8 relative"
            >
              {saving && (
                <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  <CheckCircleIcon className="h-4 w-4" /> Saved
                </div>
              )}
              
              <h2 className="text-xl md:text-2xl font-medium text-slate-900 dark:text-white mb-8 leading-relaxed">
                {currentQ.question_text}
              </h2>

              <div className="space-y-4">
                {currentQ.options?.map((opt: any) => {
                  const isSelected = selectedOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleOptionSelect(opt.id)}
                      className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${
                        isSelected 
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <div className="h-3 w-3 bg-red-500 rounded-full" />}
                      </div>
                      <span className={`text-base md:text-lg ${isSelected ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                        {opt.option_text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
              disabled={currentIdx === 0}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 px-4 max-w-[50%] overflow-x-auto">
            {questions.map((q, idx) => {
              const isAns = !!answers[q.id];
              const isCurr = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-8 w-8 md:h-10 md:w-10 rounded-full text-xs md:text-sm font-medium flex items-center justify-center transition-colors ${
                    isCurr 
                      ? 'border-2 border-red-500 text-slate-900 dark:text-white bg-white dark:bg-slate-900' 
                      : isAns 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div>
            {currentIdx === questions.length - 1 ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="px-8 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
              >
                Finish Quiz
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
                className="px-8 py-2.5 rounded-xl font-medium text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Submit Quiz?</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                You have answered {answeredCount} of {questions.length} questions.
                {questions.length - answeredCount > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold block mt-2">
                    {questions.length - answeredCount} unanswered questions remain.
                  </span>
                )}
                <br /><br />
                Once submitted, your answers cannot be changed.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitQuiz}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
