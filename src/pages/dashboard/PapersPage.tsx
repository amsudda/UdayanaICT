import { useEffect, useState, useCallback } from 'react';
import { FileTextIcon, Loader2Icon, DownloadIcon, ArrowLeftIcon, MapPinIcon, CalendarIcon, LayoutIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export function PapersPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'main' | 'past' | 'provincial' | 'model'>('main');
  const [selectedGroup, setSelectedGroup] = useState<string | number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // RLS ensures the student only sees published papers targeted to their batch, program, or public.
    const { data } = await supabase.from('papers').select('*').order('created_at', { ascending: false });
    setPapers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const pastPapers = papers.filter(p => p.paper_type === 'past_paper');
  const provincialPapers = papers.filter(p => p.paper_type === 'provincial_paper');
  const modelPapers = papers.filter(p => p.paper_type === 'model_paper');

  // Groups
  const pastYears = Array.from(new Set(pastPapers.map(p => p.year).filter(Boolean))).sort((a, b) => b - a);
  const provinces = Array.from(new Set(provincialPapers.map(p => p.province).filter(Boolean))).sort();
  const modelYears = Array.from(new Set(modelPapers.map(p => p.year).filter(Boolean))).sort((a, b) => b - a);

  const renderPaperCard = (p: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      key={p.id} 
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-apple-hover transition-all flex flex-col group"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <FileTextIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-apple-light line-clamp-2">{p.title}</h3>
          {p.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
        </div>
      </div>
      
      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-end gap-2 flex-wrap">
        {p.marking_scheme_url && (
          <button
            onClick={() => handleDownload(p.marking_scheme_url, `${p.title} - Marking Scheme`)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 text-sm font-medium transition-colors"
          >
            <DownloadIcon className="w-4 h-4" /> Marking Scheme
          </button>
        )}
        <button
          onClick={() => handleDownload(p.pdf_url, p.title)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <DownloadIcon className="w-4 h-4" /> Paper PDF
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center gap-4">
        {activeTab !== 'main' && (
          <button onClick={() => { if (selectedGroup) setSelectedGroup(null); else setActiveTab('main'); }} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        )}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-apple-light transition-colors mb-2">
            {activeTab === 'main' ? 'Papers Collection' : 
             activeTab === 'past' ? 'Past Papers' : 
             activeTab === 'provincial' ? 'Provincial Papers' : 'Model Papers'}
            {selectedGroup && ` - ${selectedGroup}`}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">View and download question papers and marking schemes.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2Icon className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div key="main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <button onClick={() => setActiveTab('past')} className="text-left group relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-indigo-500 to-blue-600 hover:shadow-xl hover:shadow-blue-500/20 transition-all border border-blue-400/20">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-6">
                    <CalendarIcon className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Past Papers</h2>
                  <p className="text-blue-100 text-sm font-medium">Browse G.C.E. papers from previous years with official marking schemes.</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-white text-sm font-semibold group-hover:gap-3 transition-all">
                    View Collection <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              </button>

              <button onClick={() => setActiveTab('provincial')} className="text-left group relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-xl hover:shadow-teal-500/20 transition-all border border-teal-400/20">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-6">
                    <MapPinIcon className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Provincial</h2>
                  <p className="text-teal-100 text-sm font-medium">Access term test papers from various provinces across Sri Lanka.</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-white text-sm font-semibold group-hover:gap-3 transition-all">
                    View Collection <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              </button>

              <button onClick={() => setActiveTab('model')} className="text-left group relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-violet-500 to-purple-600 hover:shadow-xl hover:shadow-purple-500/20 transition-all border border-purple-400/20">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-6">
                    <LayoutIcon className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Model Papers</h2>
                  <p className="text-purple-100 text-sm font-medium">Practice with specially designed model papers to prepare for exams.</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-white text-sm font-semibold group-hover:gap-3 transition-all">
                    View Collection <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              </button>

            </motion.div>
          )}

          {activeTab === 'past' && !selectedGroup && (
            <motion.div key="past_groups" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pastYears.length === 0 ? <p className="col-span-full text-slate-500">No past papers available yet.</p> : pastYears.map(year => (
                <button key={year} onClick={() => setSelectedGroup(year)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:shadow-apple-hover hover:border-blue-300 dark:hover:border-blue-900 transition-all group">
                  <div className="text-3xl font-black text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{year}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">G.C.E. A/L</div>
                </button>
              ))}
            </motion.div>
          )}

          {activeTab === 'provincial' && !selectedGroup && (
            <motion.div key="prov_groups" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {provinces.length === 0 ? <p className="col-span-full text-slate-500">No provincial papers available yet.</p> : provinces.map(prov => (
                <button key={prov} onClick={() => setSelectedGroup(prov)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:shadow-apple-hover hover:border-teal-300 dark:hover:border-teal-900 transition-all group">
                  <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/20 text-teal-600 mx-auto rounded-full flex items-center justify-center mb-3">
                    <MapPinIcon className="w-5 h-5" />
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{prov}</div>
                </button>
              ))}
            </motion.div>
          )}

          {activeTab === 'model' && !selectedGroup && (
            <motion.div key="model_groups" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {modelYears.length === 0 ? <p className="col-span-full text-slate-500">No model papers available yet.</p> : modelYears.map(year => (
                <button key={year} onClick={() => setSelectedGroup(year)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:shadow-apple-hover hover:border-purple-300 dark:hover:border-purple-900 transition-all group">
                  <div className="text-3xl font-black text-slate-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{year}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Model Papers</div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Papers Grid when a group is selected */}
          {selectedGroup && (
            <motion.div key="papers_list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTab === 'past' && pastPapers.filter(p => p.year === selectedGroup).map(renderPaperCard)}
              {activeTab === 'provincial' && provincialPapers.filter(p => p.province === selectedGroup).map(renderPaperCard)}
              {activeTab === 'model' && modelPapers.filter(p => p.year === selectedGroup).map(renderPaperCard)}
            </motion.div>
          )}

        </AnimatePresence>
      )}
    </div>
  );
}
