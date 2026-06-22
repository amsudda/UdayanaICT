import { useNavigate } from 'react-router-dom';
import { BookOpenIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    image: string;
    progress: number;
    lessonCount: number;
    category: string;
  };
  showProgress?: boolean;
}
export function CourseCard({ course, showProgress = true }: CourseCardProps) {
  const navigate = useNavigate();
  return (
    <Card
      hoverable
      onClick={() => navigate('/signup')}
      className="flex flex-col h-full">

      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />

        <div className="absolute top-4 left-4">
          <Badge
            variant="default"
            className="bg-white/90 backdrop-blur-sm border-none shadow-sm">

            {course.category}
          </Badge>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-semibold text-apple-text dark:text-apple-light transition-colors mb-2 line-clamp-1">
          {course.title}
        </h3>
        <p className="text-apple-subtext dark:text-slate-400 transition-colors text-sm mb-6 line-clamp-2 flex-1">
          {course.description}
        </p>

        <div className="mt-auto">
          {showProgress ?
          <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-apple-text dark:text-apple-light transition-colors">
                  {course.progress}% Complete
                </span>
                <span className="text-apple-subtext dark:text-slate-400 flex items-center gap-1 transition-colors">
                  <BookOpenIcon className="w-4 h-4" />
                  {course.lessonCount} lessons
                </span>
              </div>
              <ProgressBar value={course.progress} />
            </div> :

          course.lessonCount ? (
            <div className="flex items-center text-sm text-apple-subtext dark:text-slate-400 gap-1 transition-colors">
              <BookOpenIcon className="w-4 h-4" />
              <span>{course.lessonCount} lessons</span>
            </div>
          ) : null
          }
        </div>
      </div>
    </Card>);

}
