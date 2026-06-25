import { CalendarIcon, ClockIcon, HistoryIcon, VideoIcon } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

const classHistory = [
  {
    id: 'hist_001',
    title: 'Networking Basics - Live Q&A',
    date: 'March 9, 2026',
    duration: '1 hr 10 mins',
    status: 'Attended'
  },
  {
    id: 'hist_002',
    title: 'Python Practical Session 03',
    date: 'March 6, 2026',
    duration: '1 hr 30 mins',
    status: 'Attended'
  },
  {
    id: 'hist_003',
    title: 'Paper Class - MCQ Review',
    date: 'March 2, 2026',
    duration: '55 mins',
    status: 'Missed'
  }
];

export function ClassHistoryPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c20f24]">
          Class History
        </p>
        <h1 className="mt-2 text-3xl font-bold text-apple-text">Past classes and attendance</h1>
        <p className="mt-2 text-apple-subtext">
          Track the classes you attended and review your recent online session history.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-red-50 p-3 text-[#c20f24]">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-apple-text">Recent attendance</h2>
        </div>

        <div className="space-y-4">
          {classHistory.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-[#c20f24]" />
                  <p className="font-semibold text-apple-text">{item.title}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-apple-subtext">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4" />
                    {item.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4" />
                    {item.duration}
                  </span>
                </div>
              </div>
              <Badge variant={item.status === 'Attended' ? 'success' : 'warning'}>
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
