import { Wrench } from 'lucide-react';

export function AdminPlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{title}</h1>
      <p className="text-sm text-slate-500 mb-8">{note ?? 'This section is coming next.'}</p>

      <div className="flex flex-col items-center justify-center text-center py-20 rounded-2xl border border-dashed border-slate-300 bg-white">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Wrench className="w-6 h-6 text-slate-400" />
        </div>
        <p className="font-semibold text-slate-700">We'll build this screen next</p>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">
          The navigation and structure are ready — this section gets wired up in the next step.
        </p>
      </div>
    </div>
  );
}
