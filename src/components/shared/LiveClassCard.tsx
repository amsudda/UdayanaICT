import { CalendarIcon, ClockIcon, UserIcon, VideoIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
interface LiveClassCardProps {
  liveClass: {
    id: string;
    title: string;
    date: string;
    time: string;
    zoomLink: string;
    instructor: string;
    courseTitle: string;
    isLiveNow: boolean;
  };
}
export function LiveClassCard({ liveClass }: LiveClassCardProps) {
  return (
    <Card className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
      <div className="flex-1 space-y-3 w-full">
        <div className="flex items-center gap-3 flex-wrap">
          {liveClass.isLiveNow ?
          <Badge
            variant="warning"
            className="animate-pulse flex items-center gap-1.5">

              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Live Now
            </Badge> :

          <Badge variant="info">Upcoming</Badge>
          }
          <span className="text-xs font-medium text-apple-subtext dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md transition-colors">
            {liveClass.courseTitle}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-apple-text dark:text-apple-light transition-colors">
          {liveClass.title}
        </h3>

        <div className="flex flex-wrap gap-4 text-sm text-apple-subtext dark:text-slate-400 transition-colors">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4" />
            {liveClass.date}
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4" />
            {liveClass.time}
          </div>
          <div className="flex items-center gap-1.5">
            <UserIcon className="w-4 h-4" />
            {liveClass.instructor}
          </div>
        </div>
      </div>

      <div className="w-full sm:w-auto mt-2 sm:mt-0">
        <Button
          variant={liveClass.isLiveNow ? 'primary' : 'secondary'}
          className="w-full sm:w-auto flex items-center gap-2"
          onClick={() => window.open(liveClass.zoomLink, '_blank')}>

          <VideoIcon className="w-4 h-4" />
          {liveClass.isLiveNow ? 'Join Now' : 'View Details'}
        </Button>
      </div>
    </Card>);

}
