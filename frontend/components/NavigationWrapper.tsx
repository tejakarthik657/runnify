'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BottomNav from './layout/BottomNav';
import Sidebar from './layout/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import ChatPopup from './chat/ChatPopup';

// Section 5.1: Navigation Exclusion Logic
const HIDE_NAV_ROUTES = ['/login', '/landing', '/register', '/'];

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const shouldHideNav = HIDE_NAV_ROUTES.includes(pathname);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

    return (
        <div className="min-h-screen bg-[#F4F7F4] text-[#1a1a2e] font-['Nunito']">
            {!shouldHideNav && (
                <>
                    {/* Desktop Collapsible Sidebar */}
                    <div className="hidden lg:block">
                        <Sidebar collapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
                    </div>
                </>
            )}

            {/* Main Content Area */}
            <main
                className={`
                    transition-all duration-300 ease-in-out min-h-screen
                    ${!shouldHideNav ? `pb-24 lg:pb-0 ${isSidebarCollapsed ? 'lg:pl-[60px]' : 'lg:pl-[220px]'}` : ''}
                `}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 md:p-6 lg:p-8"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {!shouldHideNav && (
                <>
                    {/* Mobile Bottom Navigation */}
                    <div className="lg:hidden">
                        <BottomNav />
                    </div>
                </>
            )}

            <ChatPopup />
        </div>
    );
}
