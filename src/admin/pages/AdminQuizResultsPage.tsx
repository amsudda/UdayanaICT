import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeftIcon, SearchIcon, UsersIcon, CheckCircleIcon, TrophyIcon, TargetIcon } from 'lucide-react';

interface Attempt {
  id: string;
  quiz_id: string;
  student_id: string;
  status: string;
  score: number;
  percentage: number;
  started_at: string;
  submitted_at: string;
  student: {
    full_name: string;
    student_code: string;
  };
}

export function AdminQuizResultsPage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (id) fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data: q, error: qErr } = await supabase.from('quizzes').select('*').eq('id', id).single();
      if (qErr) throw qErr;
      setQuiz(q);

      const { data: a, error: aErr } = await supabase
        .from('quiz_attempts')
        .select('*, student:profiles(full_name, student_code)')
        .eq('quiz_id', id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (aErr) throw aErr;
      setAttempts(a || []);
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttempts = attempts.filter(a => 
    a.student?.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.student?.student_code.toLowerCase().includes(search.toLowerCase())
  );

  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0 ? attempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / totalAttempts : 0;
  const highScore = totalAttempts > 0 ? Math.max(...attempts.map(a => a.percentage || 0)) : 0;
  const passed = attempts.filter(a => (a.percentage || 0) >= (quiz?.pass_mark_percentage || 0)).length;
  const passRate = totalAttempts > 0 ? (passed / totalAttempts) * 100 : 0;

  const formatDuration = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diffSeconds = Math.floor((e - s) / 1000);
    const m = Math.floor(diffSeconds / 60);
    const sec = diffSeconds % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading results...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link to="/admin/quizzes" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-medium transition-colors">
        <ArrowLeftIcon className="w-4 h-4" /> Back to Quizzes
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{quiz?.title}</h1>
        <p className="text-slate-500">Results and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><UsersIcon className="w-6 h-6" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Total Attempts</p><p className="text-2xl font-bold text-slate-900">{totalAttempts}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-purple-50 p-3 rounded-xl text-purple-600"><TargetIcon className="w-6 h-6" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Average Score</p><p className="text-2xl font-bold text-slate-900">{avgScore.toFixed(1)}%</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-yellow-50 p-3 rounded-xl text-yellow-600"><TrophyIcon className="w-6 h-6" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Highest Score</p><p className="text-2xl font-bold text-slate-900">{highScore.toFixed(1)}%</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-xl text-green-600"><CheckCircleIcon className="w-6 h-6" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Pass Rate</p><p className="text-2xl font-bold text-slate-900">{passRate.toFixed(1)}%</p></div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Student Submissions</h2>
          <div className="relative">
            <SearchIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search student..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>

        {filteredAttempts.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No attempts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-slate-500 text-sm font-medium border-b border-gray-100">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Time Taken</th>
                  <th className="px-6 py-4">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAttempts.map(a => {
                  const isPassed = (a.percentage || 0) >= (quiz?.pass_mark_percentage || 0);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/30 transition-colors text-slate-700">
                      <td className="px-6 py-4 font-medium text-slate-900">{a.student?.full_name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-slate-500">{a.student?.student_code || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-slate-900">{a.percentage?.toFixed(1)}%</span>
                          <span className="text-xs text-slate-400">({a.score} pts)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {isPassed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDuration(a.started_at, a.submitted_at)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(a.submitted_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
