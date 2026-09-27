import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeftIcon, GripVertical, PlusIcon,
  Trash2Icon, ArrowUpIcon, ArrowDownIcon,
  ImageIcon, Loader2Icon, XIcon, HeadingIcon
} from 'lucide-react';
import { uploadQuizImage } from '../../lib/quizImages';
import { passMarkOf } from '../../data/quizzes';

type Step = 1 | 2 | 3 | 4 | 5;

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  /** 'section' is a heading block, not a question: no options, no marks. */
  kind: 'question' | 'section';
  type: 'single_choice' | 'true_false';
  questionText: string;
  /** A photo of the printed question — the usual way a paper is entered. */
  imageUrl: string;
  sectionTitle: string;
  sectionNote: string;
  options: Option[];
  correctOptionId: string;
  marks: number;
  explanation: string;
}

export function AdminQuizBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [quizId, setQuizId] = useState<string>(id || crypto.randomUUID());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [passMark, setPassMark] = useState(50);
  const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('draft');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);

  const [previewIndex, setPreviewIndex] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const [headerImage, setHeaderImage] = useState('');
  /** id of whatever image is uploading, so only that slot shows a spinner */
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      fetchQuiz();
    }
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const { data: q, error } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
      if (error) throw error;
      if (q) {
        setTitle(q.title || '');
        setDescription(q.description || '');
        setDuration(q.duration_minutes || 30);
        // the column has been spelled three ways over time; read them all
        setPassMark(passMarkOf(q) || 50);
        setStatus(q.status);
        setRandomizeQuestions(q.randomize_questions !== false);
        setRandomizeOptions(q.randomize_options !== false);
        setHeaderImage(q.header_image_url || '');
      }

      const { data: qq, error: qqError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (qqError) throw qqError;
      if (qq) {
        setQuestions(qq.map(q => ({
          id: q.id,
          kind: q.kind === 'section' ? 'section' : 'question',
          type: q.type,
          questionText: q.question_text,
          imageUrl: q.image_url || '',
          sectionTitle: q.section_title || '',
          sectionNote: q.section_note || '',
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          correctOptionId: q.correct_option_id,
          marks: q.marks,
          explanation: q.explanation || ''
        })));
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveQuiz = async (newStatus?: 'published' | 'draft') => {
    try {
      setSaving(true);
      const quizData: any = {
        id: quizId,
        title: title || 'Untitled Quiz',
        description,
        duration_minutes: duration,
        pass_mark_percent: passMark,
        status: newStatus || status,
        randomize_questions: randomizeQuestions,
        randomize_options: randomizeOptions,
        header_image_url: headerImage || null,
      };
      if (newStatus === 'published' && status !== 'published') {
        quizData.published_at = new Date().toISOString();
      }

      const { error: quizError } = await supabase.from('quizzes').upsert(quizData);
      if (quizError) throw quizError;

      if (newStatus) setStatus(newStatus);

      // Save questions
      await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);

      if (questions.length > 0) {
        const questionsData = questions.map((q, idx) => ({
          id: q.id,
          quiz_id: quizId,
          kind: q.kind,
          type: q.type,
          question_text: q.kind === 'section' ? '' : q.questionText,
          image_url: q.imageUrl || null,
          section_title: q.kind === 'section' ? q.sectionTitle : null,
          section_note: q.kind === 'section' ? q.sectionNote : null,
          options: q.kind === 'section' ? [] : q.options,
          correct_option_id: q.kind === 'section' ? null : q.correctOptionId,
          // A section is scenery: it must never move the total a quiz is
          // marked out of.
          marks: q.kind === 'section' ? 0 : q.marks,
          explanation: q.explanation,
          order_index: idx
        }));
        const { error: qError } = await supabase.from('quiz_questions').insert(questionsData);
        if (qError) throw qError;
      }
    } catch (err) {
      console.error('Error saving quiz:', err);
      alert('Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Jumps straight to a step. Saves on the way, exactly as the Next and
   * Previous buttons do, so a half-written question survives the jump.
   */
  const goToStep = async (target: Step) => {
    if (target === step || saving) return;
    await saveQuiz();
    setStep(target);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNextStep = () => goToStep(Math.min(5, step + 1) as Step);
  const handlePrevStep = () => goToStep(Math.max(1, step - 1) as Step);

  const blank = {
    imageUrl: '', sectionTitle: '', sectionNote: '', explanation: ''
  };

  const addQuestion = (type: 'single_choice' | 'true_false', optionCount = 4) => {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const newQ: Question = {
      id: crypto.randomUUID(),
      kind: 'question',
      type,
      questionText: '',
      ...blank,
      options: type === 'single_choice'
        ? letters.slice(0, optionCount).map((id, i) => ({ id, text: String(i + 1) }))
        : [{id: 'true', text: 'True'}, {id: 'false', text: 'False'}],
      correctOptionId: '',
      marks: 1
    };
    setQuestions([...questions, newQ]);
  };

  const addSection = () => {
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      kind: 'section',
      type: 'single_choice',
      questionText: '',
      ...blank,
      options: [],
      correctOptionId: '',
      marks: 0
    }]);
  };

  /** Uploads straight into the row it belongs to, so nothing is lost on save. */
  const pickImage = async (slot: string, file: File | undefined, apply: (url: string) => void) => {
    if (!file) return;
    setUploading(slot);
    const res = await uploadQuizImage(file, quizId);
    setUploading(null);
    if ('error' in res) { alert(res.error); return; }
    apply(res.url);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const moveQuestion = (index: number, dir: 1 | -1) => {
    if (index + dir < 0 || index + dir >= questions.length) return;
    const newQ = [...questions];
    const temp = newQ[index];
    newQ[index] = newQ[index + dir];
    newQ[index + dir] = temp;
    setQuestions(newQ);
  };

  const deleteQuestion = (id: string) => {
    if (window.confirm('Delete this question?')) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  // Validation
  const answerable = questions.filter(q => q.kind === 'question');
  const hasTitle = title.trim().length > 0;
  const hasQuestions = answerable.length > 0;
  const allCorrectSet = answerable.every(q => q.correctOptionId);
  const allMarksValid = answerable.every(q => q.marks > 0);
  const canPublish = hasTitle && hasQuestions && allCorrectSet && allMarksValid;

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <button
        onClick={() => navigate('/admin/quizzes')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-medium"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Back to Quizzes
      </button>

      {/* Step Indicator — every step is a button, and the bar sticks to
          the top so a long question list never has to be scrolled to
          reach the next step. */}
      {/* top-14 on mobile: the admin shell already has a sticky 56px header there */}
      <div ref={topRef} className="sticky top-14 lg:top-4 z-20 flex items-center justify-between mb-8 bg-white/95 backdrop-blur p-4 rounded-2xl border border-gray-100 shadow-sm px-8">
        {(['Details', 'Questions', 'Settings', 'Preview', 'Publish'] as const).map((label, idx) => {
          const s = (idx + 1) as Step;
          const active = step === s;
          const past = step > s;
          return (
            <React.Fragment key={s}>
              <button
                type="button"
                onClick={() => goToStep(s)}
                disabled={saving}
                aria-current={active ? 'step' : undefined}
                title={`Go to ${label}`}
                className="flex flex-col items-center group disabled:cursor-wait focus:outline-none"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-all ${
                  active ? 'bg-red-600 text-white shadow-md shadow-red-200' :
                  past ? 'bg-red-100 text-red-600 group-hover:bg-red-200' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
                } group-focus-visible:ring-2 group-focus-visible:ring-red-500 group-focus-visible:ring-offset-2`}>
                  {s}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                  active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                }`}>
                  {label}
                </span>
              </button>
              {s < 5 && <div className={`flex-1 h-1 mx-4 rounded-full ${past ? 'bg-red-100' : 'bg-gray-100'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Quiz Details</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quiz Title *</label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-red-600 outline-none"
                placeholder="e.g. Midterm Examination"
              />
            </div>
            {/* Banner across the top of the quiz, like a Google Form header */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Header image</label>
              {headerImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                  <img src={headerImage} alt="" className="w-full max-h-56 object-cover" />
                  <button
                    onClick={() => setHeaderImage('')}
                    title="Remove header image"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-red-300 hover:bg-red-50/40 transition-colors">
                  {uploading === 'header' ? (
                    <Loader2Icon className="w-5 h-5 text-red-500 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                      <span className="text-sm text-slate-500">Upload a header image</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => pickImage('header', e.target.files?.[0], setHeaderImage)} />
                </label>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-red-600 outline-none"
                placeholder="Brief description of the quiz..."
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                <input
                  type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={1}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pass Mark (%)</label>
                <input
                  type="number" value={passMark} onChange={e => setPassMark(Number(e.target.value))} min={0} max={100}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Questions</h2>
              <div className="flex gap-2">
                <button onClick={() => addQuestion('single_choice')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  + Add MCQ
                </button>
                <button onClick={() => addQuestion('single_choice', 5)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  + Add MCQ (5)
                </button>
                <button onClick={() => addQuestion('true_false')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  + Add True/False
                </button>
                <button onClick={addSection} className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-1.5">
                  <HeadingIcon className="w-4 h-4" /> Add Section
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="border border-gray-200 rounded-2xl p-5 flex gap-4 bg-gray-50/50">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} className="hover:text-slate-700 disabled:opacity-30"><ArrowUpIcon className="w-5 h-5"/></button>
                    <GripVertical className="w-5 h-5" />
                    <button onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1} className="hover:text-slate-700 disabled:opacity-30"><ArrowDownIcon className="w-5 h-5"/></button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${q.kind === 'section' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
                        {q.kind === 'section' ? 'SECTION' : `Q${questions.slice(0, idx + 1).filter(x => x.kind === 'question').length}`}
                      </span>
                      <button onClick={() => deleteQuestion(q.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2Icon className="w-4 h-4" /></button>
                    </div>

                    {q.kind === 'section' ? (
                      <>
                        <input
                          type="text"
                          value={q.sectionTitle}
                          onChange={e => updateQuestion(q.id, { sectionTitle: e.target.value })}
                          placeholder="Section heading, e.g. TIMING PAPER - PAPER NO 04"
                          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-lg font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                        />
                        <textarea
                          value={q.sectionNote}
                          onChange={e => updateQuestion(q.id, { sectionNote: e.target.value })}
                          placeholder="A note under the heading (optional)"
                          rows={2}
                          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                        />
                      </>
                    ) : (
                      <textarea
                        value={q.questionText}
                        onChange={e => updateQuestion(q.id, { questionText: e.target.value })}
                        placeholder="Question text (optional if you upload an image)"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                        rows={2}
                      />
                    )}

                    {/* A photo of the printed question — how most papers go in */}
                    {q.imageUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white">
                        <img src={q.imageUrl} alt="" className="w-full object-contain max-h-80" />
                        <button
                          onClick={() => updateQuestion(q.id, { imageUrl: '' })}
                          title="Remove image"
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-2 text-sm text-slate-500 border border-dashed border-gray-300 rounded-xl px-4 py-2 cursor-pointer hover:border-red-300 hover:text-red-600 transition-colors">
                        {uploading === q.id
                          ? <Loader2Icon className="w-4 h-4 animate-spin" />
                          : <ImageIcon className="w-4 h-4" />}
                        Add image
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => pickImage(q.id, e.target.files?.[0], (url) => updateQuestion(q.id, { imageUrl: url }))} />
                      </label>
                    )}

                    {q.kind === 'question' && (
                    <div className="space-y-3 pl-2 border-l-2 border-gray-200 ml-1">
                      {q.options.map(opt => (
                        <div key={opt.id} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctOptionId === opt.id}
                            onChange={() => updateQuestion(q.id, { correctOptionId: opt.id })}
                            className="w-4 h-4 text-red-600 focus:ring-red-600 cursor-pointer"
                          />
                          {q.type === 'single_choice' ? (
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => {
                                const newOpts = q.options.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o);
                                updateQuestion(q.id, { options: newOpts });
                              }}
                              placeholder={`Option ${opt.id}`}
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-600 outline-none"
                            />
                          ) : (
                            <span className="text-sm font-medium text-slate-700">{opt.text}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    )}

                    {q.kind === 'question' && (
                    <div className="flex gap-4 pt-2">
                      <div className="w-32">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Marks</label>
                        <input type="number" min={1} value={q.marks} onChange={e => updateQuestion(q.id, { marks: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Explanation (optional)</label>
                        <input type="text" value={q.explanation} onChange={e => updateQuestion(q.id, { explanation: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" placeholder="Why is this correct?" />
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                  <p className="text-slate-500 mb-4">No questions added yet.</p>
                  <button onClick={() => addQuestion('single_choice')} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    Add First Question
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <div>
                  <div className="font-semibold text-slate-900">Randomize Questions</div>
                  <div className="text-sm text-slate-500">Show questions in random order for each student</div>
                </div>
                <input type="checkbox" checked={randomizeQuestions} onChange={e => setRandomizeQuestions(e.target.checked)} className="w-5 h-5 text-red-600 rounded" />
              </label>
              <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <div>
                  <div className="font-semibold text-slate-900">Randomize Options</div>
                  <div className="text-sm text-slate-500">Shuffle multiple choice options</div>
                </div>
                <input type="checkbox" checked={randomizeOptions} onChange={e => setRandomizeOptions(e.target.checked)} className="w-5 h-5 text-red-600 rounded" />
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="bg-blue-50 text-blue-800 p-3 rounded-xl mb-6 text-sm font-medium border border-blue-100 flex justify-between items-center">
              <span>Student Preview Mode</span>
              <span>{questions.length} Questions</span>
            </div>
            {questions.length > 0 ? (
              <div className="border border-gray-200 rounded-2xl p-6 md:p-10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">Question {previewIndex + 1} of {questions.length}</span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">{questions[previewIndex].marks} Marks</span>
                </div>
                {questions[previewIndex].kind === 'section' ? (
                  <div className="mb-8">
                    <div className="rounded-xl bg-[#c20f24] text-white font-bold px-5 py-4 text-lg">
                      {questions[previewIndex].sectionTitle || 'Section'}
                    </div>
                    {questions[previewIndex].sectionNote && (
                      <p className="mt-3 text-slate-700 whitespace-pre-wrap">{questions[previewIndex].sectionNote}</p>
                    )}
                  </div>
                ) : (
                  <>
                    {questions[previewIndex].imageUrl && (
                      <img src={questions[previewIndex].imageUrl} alt="" className="w-full object-contain rounded-xl border border-gray-100 mb-6" />
                    )}
                    <h3 className="text-xl font-medium text-slate-900 mb-8 leading-relaxed whitespace-pre-wrap">{questions[previewIndex].questionText}</h3>
                  </>
                )}
                <div className="space-y-3">
                  {questions[previewIndex].options.map(opt => (
                    <div key={opt.id} className="border-2 border-gray-100 hover:border-blue-200 p-4 rounded-xl cursor-pointer transition-colors flex items-center gap-4">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      <span className="text-slate-700">{opt.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
                  <button onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))} disabled={previewIndex === 0} className="px-5 py-2 rounded-xl font-medium text-slate-500 hover:bg-gray-100 disabled:opacity-30">Previous</button>
                  <button onClick={() => setPreviewIndex(Math.min(questions.length - 1, previewIndex + 1))} disabled={previewIndex === questions.length - 1} className="px-5 py-2 rounded-xl font-medium text-slate-500 hover:bg-gray-100 disabled:opacity-30">Next</button>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Add some questions to preview.</p>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="max-w-xl mx-auto text-center space-y-8 py-8">
            <h2 className="text-2xl font-bold text-slate-900">Ready to Publish?</h2>

            <div className="bg-gray-50 p-6 rounded-2xl text-left space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Quiz Title Set</span>
                {hasTitle ? <span className="text-green-500 font-bold">✓ Passed</span> : <span className="text-red-500 font-bold">✗ Failed</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">At least 1 question</span>
                {hasQuestions ? <span className="text-green-500 font-bold">✓ Passed</span> : <span className="text-red-500 font-bold">✗ Failed</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Correct answers selected</span>
                {allCorrectSet ? <span className="text-green-500 font-bold">✓ Passed</span> : <span className="text-red-500 font-bold">✗ Failed</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Valid marks assigned</span>
                {allMarksValid ? <span className="text-green-500 font-bold">✓ Passed</span> : <span className="text-red-500 font-bold">✗ Failed</span>}
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              {status === 'published' ? (
                <button onClick={() => saveQuiz('draft')} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-6 py-3 rounded-xl font-bold transition-colors">
                  Unpublish to Draft
                </button>
              ) : (
                <>
                  <button onClick={() => saveQuiz('draft')} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3 rounded-xl font-bold transition-colors">
                    Save Draft
                  </button>
                  <button onClick={() => saveQuiz('published')} disabled={!canPublish} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50">
                    Publish Quiz
                  </button>
                </>
              )}
            </div>
            {saving && <p className="text-sm text-slate-400">Saving...</p>}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={handlePrevStep}
          disabled={step === 1}
          className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Previous
        </button>
        {step < 5 && (
          <button
            onClick={handleNextStep}
            className="px-8 py-2.5 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            Next Step
          </button>
        )}
      </div>
    </div>
  );
}
