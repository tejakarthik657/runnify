'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Accessibility, Command, History, Wifi, WifiOff } from 'lucide-react';

const QUICK_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/map', label: 'Map' },
  { href: '/run', label: 'Run' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/faction', label: 'Faction' },
  { href: '/profile', label: 'Profile' },
];

export default function GlobalUXLayer() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [fontScale, setFontScale] = useState(100);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        setQueueCount(Number(localStorage.getItem('pendingGpsQueue') || '0'));
      } catch {
        // ignore malformed local data
      }
    };

    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    sync();

    const onOnline = () => {
      setIsOnline(true);
      if (wasOffline) setWasOffline(false);
    };
    const onOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const timer = window.setInterval(sync, 2000);

    const onStorage = () => sync();
    window.addEventListener('storage', onStorage);

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);

    const fs = Number(localStorage.getItem('ux_font_scale') || '100');
    const hc = localStorage.getItem('ux_high_contrast') === 'true';
    setFontScale(fs);
    setHighContrast(hc);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('keydown', onKey);
      window.clearInterval(timer);
    };
  }, [wasOffline]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
    localStorage.setItem('ux_font_scale', String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle('ux-high-contrast', highContrast);
    localStorage.setItem('ux_high_contrast', String(highContrast));
  }, [highContrast]);

  return (
    <>
      <style>{`
        .ux-high-contrast body { filter: contrast(1.12) saturate(1.05); }
      `}</style>

      <div className="fixed top-3 right-3 z-[1200] flex flex-col gap-2 items-end">
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${isOnline ? 'bg-white text-[#2E7D52] border-black/10' : 'bg-[#FFF1F1] text-[#b42318] border-[#f8d2d2]'}`}>
          <span className="inline-flex items-center gap-1.5">
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />} {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {wasOffline && isOnline && (
          <div className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F0F7F4] text-[#2E7D52] border border-[#A8D5BA]/40">
            Reconnected
          </div>
        )}

        {queueCount > 0 && (
          <div className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-[#1a1a2e] border border-black/10">
            Queue: {queueCount}
          </div>
        )}
      </div>

      <div className="fixed left-3 bottom-[84px] lg:bottom-4 z-[1100] flex gap-2">
        <button onClick={() => setPaletteOpen(true)} className="w-10 h-10 rounded-xl bg-white border border-black/10 shadow flex items-center justify-center text-[#1a1a2e]" title="Command Palette">
          <Command size={16} />
        </button>
        <button onClick={() => setA11yOpen(true)} className="w-10 h-10 rounded-xl bg-white border border-black/10 shadow flex items-center justify-center text-[#1a1a2e]" title="Accessibility">
          <Accessibility size={16} />
        </button>
        <button onClick={() => setChangelogOpen(true)} className="w-10 h-10 rounded-xl bg-white border border-black/10 shadow flex items-center justify-center text-[#1a1a2e]" title="Changelog">
          <History size={16} />
        </button>
      </div>

      {paletteOpen && (
        <div className="fixed inset-0 z-[1300] bg-black/35 p-4" onClick={() => setPaletteOpen(false)}>
          <div className="max-w-xl mx-auto mt-[12vh] bg-white rounded-3xl border border-black/10 shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Quick Command (Ctrl/Cmd + K)</div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="px-3 py-2 rounded-xl bg-[#F7FAF8] border border-black/5 text-xs font-extrabold text-[#1a1a2e]" onClick={() => setPaletteOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {a11yOpen && (
        <div className="fixed inset-0 z-[1300] bg-black/35 p-4" onClick={() => setA11yOpen(false)}>
          <div className="max-w-md mx-auto mt-[16vh] bg-white rounded-3xl border border-black/10 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-black text-[#1a1a2e] mb-3">Accessibility</div>
            <label className="flex items-center justify-between py-2 text-sm font-semibold">
              High contrast
              <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
            </label>
            <label className="block text-sm font-semibold mt-3">Font scale: {fontScale}%</label>
            <input type="range" min={90} max={120} step={5} value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} className="w-full mt-1" />
          </div>
        </div>
      )}

      {changelogOpen && (
        <div className="fixed inset-0 z-[1300] bg-black/35 p-4" onClick={() => setChangelogOpen(false)}>
          <div className="max-w-lg mx-auto mt-[12vh] bg-white rounded-3xl border border-black/10 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-black text-[#1a1a2e] mb-3">What Changed</div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>Live tracking accuracy improved with GPS jump/noise rejection.</li>
              <li>Leaderboard now supports search and saved filters.</li>
              <li>Mobile quick navigation chips added on map/run/dashboard.</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
