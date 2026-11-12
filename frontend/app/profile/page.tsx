'use client';

import { FormEvent, useState } from 'react';
import { Check, Edit3, ShieldCheck, X } from 'lucide-react';
import { useBunkStore } from '../../store/bunkStore';

export default function ProfilePage() {
  const { user, addPersonalityTag, removePersonalityTag } = useBunkStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [tag, setTag] = useState('');

  const addTag = (event: FormEvent) => {
    event.preventDefault();
    if (!tag.trim()) return;
    addPersonalityTag(tag.trim());
    setTag('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow text-lime-300">Your presence on Bunk</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Your campus identity.</h1>
      </div>
      <section className="surface-card p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="avatar-tile h-20 w-20 text-4xl">{user.avatar}</div>
          <div className="flex-1">
            {editing ? (
              <input value={name} onChange={(event) => setName(event.target.value)} onBlur={() => setEditing(false)} autoFocus className="input-control text-xl font-bold" />
            ) : (
              <h2 className="flex items-center gap-2 text-2xl font-black text-white">{name}<ShieldCheck size={18} className="text-emerald-400" /></h2>
            )}
            <p className="mt-1 text-sm text-slate-500">{user.handle} · {user.college}</p>
          </div>
          <button onClick={() => setEditing(true)} className="quiet-button"><Edit3 size={14} /> Edit name</button>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="metric"><strong>{user.karma.questionsSparked}</strong><span>conversations sparked</span></div>
          <div className="metric"><strong>{user.karma.votedInPulses}</strong><span>pulses answered</span></div>
          <div className="metric"><strong>{user.karma.communityImpact}</strong><span>community impact</span></div>
        </div>
      </section>
      <section className="surface-card p-6 sm:p-8">
        <p className="eyebrow">How people find you</p>
        <p className="mt-2 text-sm text-slate-400">Your tags shape conversations and Blind Connect matches. They never define your popularity.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {user.personalityTags.map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200">{item}<button onClick={() => removePersonalityTag(item)} aria-label={`Remove ${item}`}><X size={12} className="text-slate-500 hover:text-rose-300" /></button></span>)}
        </div>
        <form onSubmit={addTag} className="mt-5 flex gap-2">
          <input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="#add-a-vibe" className="input-control flex-1" />
          <button type="submit" className="primary-button"><Check size={15} /> Add</button>
        </form>
      </section>
    </div>
  );
}
