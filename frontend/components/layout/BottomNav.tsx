'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Radio,
  Compass,
  MessageCircle,
  Moon,
  Gamepad2,
  User
} from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { label: 'Pulse', icon: Radio, href: '/' },
  { label: 'Discover', icon: Compass, href: '/#discover' },
  { label: 'Connect', icon: MessageCircle, href: '/connect', isAction: true },
  { label: 'Lounges', icon: Moon, href: '/after-hours' },
  { label: 'Profile', icon: User, href: '/profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-[60] bg-[#11131C]/90 border border-white/10 px-3 py-2 rounded-2xl safe-area-bottom shadow-2xl lg:hidden backdrop-blur-xl flex justify-around items-center">
      <div className="flex items-center justify-between w-full">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 -mt-6 group"
              >
                <div
                  className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white border-2 border-[#11131C] flex items-center justify-center shadow-lg shadow-violet-500/40 transition-transform active:scale-95 group-hover:scale-105"
                >
                  <Icon size={22} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'text-violet-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className={`text-[10px] mt-1 font-semibold ${isActive ? 'text-violet-400 font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
