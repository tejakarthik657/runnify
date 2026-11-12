'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Search, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import api from '../../services/api';
import { useBunkStore } from '../../store/bunkStore';

interface Person {
  id: string;
  name: string;
  branch: string;
  year: string;
  interests: string[];
  bio: string;
  avatarUrl: string | null;
}

export default function ConnectPage() {
  const { activeCampus } = useBunkStore();
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/bunk/people', { params: { campus: activeCampus || undefined } })
      .then(({ data }) => setPeople(data.people))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to discover students'))
      .finally(() => setIsLoading(false));
  }, [activeCampus]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="eyebrow text-emerald-300">Connect / Verified campus students</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Find people outside your usual circle.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Discover real students from your campus by branch, year, and shared interests. Bunk never invents conversations or reveals private contact details.</p>
      </div>
      {isLoading && <div className="surface-card p-6 text-sm text-slate-400">Finding students in your campus...</div>}
      {error && <div className="surface-card border-rose-500/30 p-6 text-sm text-rose-300">{error}</div>}
      {!isLoading && !error && people.length === 0 && (
        <div className="surface-card p-8 text-center">
          <Users size={28} className="mx-auto text-slate-500" />
          <h2 className="mt-4 text-lg font-bold text-white">You are early here.</h2>
          <p className="mt-2 text-sm text-slate-400">Invite classmates to create verified profiles and your campus will start to appear.</p>
          <Link href="/" className="primary-button mt-5 inline-flex">Start the first conversation <ArrowUpRight size={15} /></Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {people.map((person) => (
          <article key={person.id} className="surface-card p-5">
            <div className="flex items-start gap-4">
              <div className="avatar-tile h-12 w-12">{person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full rounded-[13px] object-cover" /> : person.name.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold text-white">{person.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{person.branch}{person.year ? ` · ${person.year}` : ''}</p>
              </div>
              <ShieldCheck size={16} className="text-emerald-400" />
            </div>
            {person.bio && <p className="mt-4 text-sm leading-6 text-slate-300">{person.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {person.interests.map((interest) => <span key={interest} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">{interest}</span>)}
            </div>
          </article>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500"><Search size={14} /> Private messaging and consent-based connections come after both students opt in.</div>
    </div>
  );
}
