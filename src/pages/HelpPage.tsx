import { CircleHelpIcon, MailIcon, MessageSquareIcon, PhoneIcon } from 'lucide-react';
import { Card } from '../components/ui/Card';

const helpTopics = [
  {
    title: 'Joining a live class',
    body: 'Use your student ID when requested and open the class link from the Live Classes area.'
  },
  {
    title: 'Payment verification',
    body: 'If a purchase is not reflected yet, contact support with your student ID and payment receipt.'
  },
  {
    title: 'Profile updates',
    body: 'You can change your name, email, and password from My Profile. Student ID cannot be edited.'
  }
];

export function HelpPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c20f24]">Help</p>
        <h1 className="mt-2 text-3xl font-bold text-apple-text">Support and guidance</h1>
        <p className="mt-2 text-apple-subtext">
          Find answers to common student questions and contact support when you need help.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="p-6">
          <div className="rounded-2xl bg-red-50 p-3 text-[#c20f24] w-fit">
            <MessageSquareIcon className="w-5 h-5" />
          </div>
          <h2 className="mt-4 font-semibold text-apple-text">WhatsApp Support</h2>
          <p className="mt-2 text-sm text-apple-subtext">Fast responses for class and payment issues.</p>
          <p className="mt-4 text-sm font-medium text-[#c20f24]">071 973 5601</p>
        </Card>
        <Card className="p-6">
          <div className="rounded-2xl bg-green-50 p-3 text-green-600 w-fit">
            <PhoneIcon className="w-5 h-5" />
          </div>
          <h2 className="mt-4 font-semibold text-apple-text">Call Support</h2>
          <p className="mt-2 text-sm text-apple-subtext">Available on weekdays from 8:30 AM to 5:30 PM.</p>
          <p className="mt-4 text-sm font-medium text-[#c20f24]">011 245 7788</p>
        </Card>
        <Card className="p-6">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 w-fit">
            <MailIcon className="w-5 h-5" />
          </div>
          <h2 className="mt-4 font-semibold text-apple-text">Email</h2>
          <p className="mt-2 text-sm text-apple-subtext">Best for account changes and detailed payment checks.</p>
          <p className="mt-4 text-sm font-medium text-[#c20f24]">support@udayanaict.lk</p>
        </Card>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <CircleHelpIcon className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-apple-text">Frequently asked questions</h2>
        </div>
        <div className="space-y-4">
          {helpTopics.map((topic) => (
            <div key={topic.title} className="rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-apple-text">{topic.title}</h3>
              <p className="mt-2 text-sm leading-6 text-apple-subtext">{topic.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
