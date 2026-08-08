import { useEffect, useState, useCallback } from 'react';
import { FileTextIcon, Loader2Icon, DownloadIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function PapersPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-apple-light transition-colors mb-2">Papers</h1>
        <p className="text-slate-500 dark:text-slate-400">View and download your exam papers, model papers, and tutes.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2Icon className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : papers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-apple transition-colors">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
            <FileTextIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-apple-light mb-1">No Papers Available</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">There are no papers available for your batch at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((p) => (
            <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-apple-hover transition-all flex flex-col group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileTextIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-apple-light line-clamp-2">{p.title}</h3>
                  {p.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 text-right">
                <button
                  onClick={() => handleDownload(p.pdf_url, p.title)}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
