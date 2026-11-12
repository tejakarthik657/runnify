'use client';

import { FormEvent, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  EyeOff,
  Flame,
  MessageCircle,
  Plus,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useBunkStore } from '../store/bunkStore';

const reactionLabels = [
  { key: 'fire' as const, label: 'Fire', icon: '🔥' },
  { key: 'tea' as const, label: 'Tea', icon: '☕' },
  { key: 'skull' as const, label: 'Dead', icon: '💀' },
];

export default function HomePage() {
  const {
    user,
    activeCampus,
    todayPulse,
    discoverPosts,
    campusClashes,
    setActiveCampus,
    voteTodayPulse,
    reactToDiscoverPost,
    addDiscoverPost,
  } = useBunkStore();
  const [showComposer, setShowComposer] = useState(false);
  const [postText, setPostText] = useState('');
  const [postTopic, setPostTopic] = useState('#CampusPulse');
  const [postAsShadow, setPostAsShadow] = useState(true);

  const submitPost = (event: FormEvent) => {
    event.preventDefault();
    if (!postText.trim()) return;
    addDiscoverPost(postText.trim(), postTopic, postAsShadow);
    setPostText('');
    setShowComposer(false);
  };

  return (
    <div className="space-y-8">
      <section className="bunk-hero">
        <div className="relative z-10 max-w-3xl">
          <div className="eyebrow"><span className="live-dot" /> {activeCampus} / LIVE NOW</div>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">
            The internet has a campus.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Bunk is where your college&apos;s opinions, inside jokes, debates and unexpected moments surface in real time.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#pulse" className="primary-button"><Sparkles size={16} /> See today&apos;s pulse</Link>
            <Link href="/connect" className="quiet-button"><Users size={16} /> Meet someone new</Link>
          </div>
        </div>
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="absolute bottom-6 right-7 hidden w-64 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md lg:block">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            <span>Campus signal</span><Radio size={13} className="text-lime-300" />
          </div>
          <p className="mt-3 text-sm font-semibold text-white">Something is happening at the canteen.</p>
          <p className="mt-1 text-xs text-slate-400">184 students are already talking about it.</p>
        </div>
      </section>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Your campus, unfiltered</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">What&apos;s happening?</h2>
        </div>
        <select
          value={activeCampus}
          onChange={(event) => setActiveCampus(event.target.value)}
          className="select-control"
          aria-label="Select campus"
        >
          {useBunkStore.getState().availableCampuses.map((campus) => <option key={campus}>{campus}</option>)}
        </select>
      </div>

      <section id="pulse" className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 p-5 sm:p-6">
            <div>
              <div className="eyebrow text-lime-300">The Pulse / Daily question</div>
              <p className="mt-2 text-xs text-slate-500">{todayPulse.closesIn} · {todayPulse.totalVotes.toLocaleString()} responses</p>
            </div>
            <BarChart3 size={20} className="text-lime-300" />
          </div>
          <div className="p-5 sm:p-6">
            <h3 className="max-w-xl text-2xl font-bold leading-tight text-white">{todayPulse.question}</h3>
            <div className="mt-6 space-y-3">
              {todayPulse.options.map((option) => {
                const selected = todayPulse.userVotedId === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => voteTodayPulse(option.id)}
                    disabled={Boolean(todayPulse.userVotedId)}
                    className={`pulse-option ${selected ? 'pulse-option-selected' : ''}`}
                  >
                    <span className="flex items-center gap-3 text-left">
                      <span className={`option-mark ${selected ? 'option-mark-selected' : ''}`}>{selected && <Check size={13} />}</span>
                      <span>{option.text}</span>
                    </span>
                    {todayPulse.userVotedId && <span className="font-mono text-xs text-lime-300">{option.pctOverall}%</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="text-emerald-400" /> Results are private until you vote.</div>
          </div>
        </article>

        <article className="surface-card p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div><div className="eyebrow text-violet-300">Cross-campus signal</div><h3 className="mt-2 text-xl font-bold text-white">Who has the louder campus?</h3></div>
            <Flame size={20} className="text-orange-300" />
          </div>
          <div className="mt-6 space-y-5">
            {campusClashes.map((clash) => (
              <div key={clash.id} className="border-t border-white/8 pt-5 first:border-0 first:pt-0">
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-white">{clash.title}</span><ArrowUpRight size={15} className="text-slate-500" /></div>
                <div className="mt-4 flex justify-between text-xs font-bold"><span>{clash.campusA.name}</span><span className="text-slate-500">{clash.campusA.score.toLocaleString()} · {clash.campusB.score.toLocaleString()}</span><span>{clash.campusB.name}</span></div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10"><div className="bg-lime-300" style={{ width: `${clash.campusA.pct}%` }} /><div className="bg-violet-400" style={{ width: `${clash.campusB.pct}%` }} /></div>
                <p className="mt-2 text-[11px] text-slate-500">{clash.cloutLead}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <article className="surface-card">
          <div className="flex items-center justify-between border-b border-white/8 p-5 sm:p-6">
            <div><div className="eyebrow text-orange-300">Discover / Fresh from campus</div><h2 className="mt-2 text-xl font-bold text-white">The things people actually say</h2></div>
            <button onClick={() => setShowComposer(true)} className="icon-button" aria-label="Create a post"><Plus size={18} /></button>
          </div>
          <div className="divide-y divide-white/8">
            {discoverPosts.map((post) => (
              <div key={post.id} className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-lime-300">{post.topic}</span><span className="text-[11px] text-slate-500">{post.timeAgo}</span></div>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-200">{post.content}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {reactionLabels.map((reaction) => (
                    <button key={reaction.key} onClick={() => reactToDiscoverPost(post.id, reaction.key)} className={`reaction-button ${post.userReaction === reaction.key ? 'reaction-active' : ''}`}>
                      <span>{reaction.icon}</span> {post.reactions[reaction.key]}
                    </button>
                  ))}
                  <span className="ml-auto flex items-center gap-1 text-xs text-slate-500"><MessageCircle size={14} /> {post.commentsCount}</span>
                </div>
              </div>
            ))}
          </div>
          {showComposer && (
            <form onSubmit={submitPost} className="border-t border-white/8 bg-white/[0.02] p-5 sm:p-6">
              <div className="flex items-center justify-between"><div className="eyebrow">Start a conversation</div><button type="button" onClick={() => setShowComposer(false)} className="text-xs text-slate-500">Cancel</button></div>
              <textarea value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="What is your campus pretending not to notice?" className="text-area mt-4" rows={3} />
              <div className="mt-3 flex flex-wrap items-center gap-3"><input value={postTopic} onChange={(event) => setPostTopic(event.target.value)} className="input-control flex-1" aria-label="Post topic" /><button type="button" onClick={() => setPostAsShadow(!postAsShadow)} className={`quiet-button ${postAsShadow ? 'text-lime-300' : ''}`}><EyeOff size={15} /> {postAsShadow ? 'Shadow mode' : 'Post as Rahul'}</button><button type="submit" className="primary-button"><Send size={15} /> Publish</button></div>
            </form>
          )}
        </article>

        <aside className="space-y-6">
          <div className="surface-card p-5">
            <div className="eyebrow">Your presence</div>
            <div className="mt-4 flex items-center gap-3"><div className="avatar-tile">{user.avatar}</div><div><p className="font-bold text-white">{user.name}</p><p className="text-xs text-slate-500">{user.branch} · {user.year}</p></div></div>
            <div className="mt-5 grid grid-cols-2 gap-2"><div className="metric"><strong>{user.karma.questionsSparked}</strong><span>conversations sparked</span></div><div className="metric"><strong>{user.karma.votedInPulses}</strong><span>pulses answered</span></div></div>
            <Link href="/profile" className="mt-4 flex items-center justify-between text-xs font-bold text-lime-300">View your profile <ChevronRight size={15} /></Link>
          </div>
          <div className="surface-card p-5">
            <div className="flex items-center gap-2"><MessageCircle size={16} className="text-violet-300" /><div className="eyebrow text-violet-300">After Hours</div></div>
            <p className="mt-3 text-sm leading-6 text-slate-300">Late-night rooms for opinions that do not belong in the class group.</p>
            <Link href="/after-hours" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white">See live rooms <ArrowUpRight size={14} /></Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
