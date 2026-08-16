import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, ClipboardListIcon, UsersIcon, ClockIcon, 
  BarChart3Icon, EditIcon, Trash2Icon, EyeIcon, 
  CheckCircleIcon, XCircleIcon 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Quiz {
  id: string;
  title: string;
  status: 'published' | 'draft' | 'archived';
  duration_minutes: number;
  created_at: string;
}

interface QuizStats {
  questionCount: number;
  attemptsCount: number;
  averagePercentage: number;
}

export function AdminQuizListPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<Record<string, QuizStats>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const { data: quizzesData, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (quizzesData && quizzesData.length > 0) {
        setQuizzes(quizzesData);
        const quizIds = quizzesData.map(q => q.id);

        // Fetch question counts
        const { data: qData } = await supabase
          .from('quiz_questions')
          .select('quiz_id')
          .in('quiz_id', quizIds);

        // Fetch attempt stats
        const { data: aData } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, percentage')
          .eq('status', 'submitted')
          .in('quiz_id', quizIds);

        const newStats: Record<string, QuizStats> = {};
        quizIds.forEach(id => {
          const qCount = qData?.filter(q => q.quiz_id === id).length || 0;
          const attempts = aData?.filter(a => a.quiz_id === id) || [];
          const aCount = attempts.length;
          const avg = aCount > 0 
            ? attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / aCount 
            : 0;
          
          newStats[id] = {
            questionCount: qCount,
            attemptsCount: aCount,
            averagePercentage: avg
          };
        });
        setStats(newStats);
      } else {
        setQuizzes([]);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      setDeletingId(id);
      const { error } = await supabase.from('quizzes').delete().eq('id', id);
      if (error) throw error;
      setQuizzes(quizzes.filter(q => q.id !== id));
    } catch (err) {
      console.error('Error deleting quiz:', err);
      alert('Failed to delete quiz');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredQuizzes = quizzes.filter(q => filter === 'all' || q.status === filter);

  const totalQuizzes = quizzes.length;
  const publishedQuizzes = quizzes.filter(q => q.status === 'published').length;
  const totalAttempts = Object.values(stats).reduce((acc, curr) => acc + curr.attemptsCount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <span className="text-red-600 font-bold text-sm tracking-wider uppercase mb-1 block">AQuiz</span>
          <h1 className="text-3xl font-bold text-slate-900">Quiz Library</h1>
          <p className="text-slate-500 mt-1">Manage and monitor all your quizzes</p>
        </div>
        <Link 
          to="/admin/quizzes/new"
          className="mt-4 md:mt-0 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Create Quiz
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl">
            <ClipboardListIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Quizzes</p>
            <p className="text-2xl font-bold text-slate-900">{totalQuizzes}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-xl">
            <CheckCircleIcon className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Published</p>
            <p className="text-2xl font-bold text-slate-900">{publishedQuizzes}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-purple-50 p-3 rounded-xl">
            <UsersIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Attempts</p>
            <p className="text-2xl font-bold text-slate-900">{totalAttempts}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 flex gap-6">
          {(['all', 'published', 'draft', 'archived'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pb-4 -mb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                filter === f 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                  <div className="flex gap-4">
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardListIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No quizzes found</h3>
              <p className="text-slate-500 mt-1">Get started by creating your first quiz.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuizzes.map(quiz => {
                const s = stats[quiz.id] || { questionCount: 0, attemptsCount: 0, averagePercentage: 0 };
                return (
                  <div key={quiz.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-gray-100 rounded-xl hover:border-red-100 transition-colors bg-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 text-lg">{quiz.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          quiz.status === 'published' ? 'bg-green-100 text-green-700' :
                          quiz.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5"><ClipboardListIcon className="w-4 h-4" /> {s.questionCount} Questions</span>
                        <span className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4" /> {quiz.duration_minutes}m</span>
                        <span className="flex items-center gap-1.5"><UsersIcon className="w-4 h-4" /> {s.attemptsCount} Attempts</span>
                        <span className="flex items-center gap-1.5"><BarChart3Icon className="w-4 h-4" /> {s.averagePercentage.toFixed(1)}% Avg</span>
                        <span>Created: {new Date(quiz.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                      <Link 
                        to={`/admin/quizzes/${quiz.id}/results`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Results"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </Link>
                      <Link 
                        to={`/admin/quizzes/${quiz.id}/edit`}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Edit Quiz"
                      >
                        <EditIcon className="w-5 h-5" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(quiz.id)}
                        disabled={deletingId === quiz.id}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Quiz"
                      >
                        <Trash2Icon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
