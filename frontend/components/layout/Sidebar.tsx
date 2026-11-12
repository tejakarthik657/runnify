'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radio,
  Search,
  MessageCircle,
  Moon,
  Shield,
  Gamepad2,
  User,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Zap,
  Flame
} from 'lucide-react';
import { useBunkStore } from '../../store/bunkStore';

const BUNK_NAV_ITEMS = [
  { label: 'Campus Pulse', icon: Radio, href: '/', badge: 'LIVE', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { label: 'Mystery Room', icon: Search, href: '/mystery', badge: 'EP 01', badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { label: 'Blind Connect', icon: MessageCircle, href: '/connect', badge: 'MATCH', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { label: 'After Hours', icon: Moon, href: '/after-hours', badge: '3 LIVE', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { label: 'Squads & Wars', icon: Shield, href: '/squads', badge: 'KITSW #1', badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { label: 'The Arcade', icon: Gamepad2, href: '/arcade', badge: 'NEW', badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { label: 'My Passport', icon: User, href: '/profile' },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useBunkStore();

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 bg-[#0E1017] border-r border-white/5 z-[55] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-20 flex items-center px-4 gap-3 border-b border-white/5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <span className="font-black text-white text-lg tracking-wider">B</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white tracking-widest text-lg">BUNK</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  Campus
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[130px]">{user.collegeShort}</p>
            </div>
          </Link>
        ) : (
          <Link href="/" className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg">
            <span className="font-black text-white text-lg">B</span>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors ${collapsed ? 'hidden' : 'block'}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto">
        <div className={`px-2 py-1 mb-2 ${collapsed ? 'text-center' : ''}`}>
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Campus Worlds
            </span>
          )}
        </div>

        {BUNK_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? 'bg-violet-600/15 text-violet-400 border border-violet-500/30 shadow-sm shadow-violet-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="relative shrink-0">
                <Icon
                  size={19}
                  className={`transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-violet-400' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                )}
              </div>

              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wider uppercase ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Collapsed Toggle if collapsed */}
      {collapsed && (
        <div className="p-2 border-t border-white/5 flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* User Identity Mini Card */}
      <div className="p-3 border-t border-white/5 bg-white/[0.01]">
        <Link
          href="/profile"
          className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-base shrink-0 shadow-inner">
            {user.avatar}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{user.name.split(' ')[0]}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                  Lv.{user.level}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{user.branch} • {user.xp} XP</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
