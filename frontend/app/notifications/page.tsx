import { Bell, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between border-b border-white/8 pb-5">
        <div>
          <p className="eyebrow text-lime-300">Campus radar</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-white"><Bell size={21} /> Notifications</h1>
        </div>
        <button disabled className="quiet-button opacity-50"><CheckCheck size={14} /> Mark all read</button>
      </div>
      <div className="surface-card p-8 text-center">
        <Bell size={28} className="mx-auto text-slate-500" />
        <h2 className="mt-4 text-lg font-bold text-white">No notifications yet.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Real activity from your campus will appear here as people react, reply, and create rooms.</p>
      </div>
    </div>
  );
}
