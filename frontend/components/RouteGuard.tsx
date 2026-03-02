'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import Loading from '../app/loading'; // Use our new tactical loading state

// 5.1 Navigation Logic: Routes that don't require an encrypted uplink
const PUBLIC_ROUTES = ['/landing', '/login', '/'];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, setAuth, logout } = useAuthStore();

    // State to track if the current node (user) is authorized for this sector
    const [status, setStatus] = useState<'IDLE' | 'AUTHORIZING' | 'GRANTED' | 'DENIED'>('IDLE');

    useEffect(() => {
        const verifyUplink = async () => {
            setStatus('AUTHORIZING');

            // 1. Session Validation Logic
            if (isAuthenticated) {
                try {
                    // Verify signal with core auth node
                    const { data } = await api.get('/auth/me');
                    setAuth(data.user, useAuthStore.getState().accessToken!);
                } catch (error) {
                    // SIGNAL_LOST: Flush local credentials
                    logout();
                    setStatus('DENIED');
                    return;
                }
            }

            // 2. Sector Access Control
            const path = pathname.split('?')[0];
            const isPublicSector = PUBLIC_ROUTES.includes(path);

            if (!isAuthenticated && !isPublicSector) {
                setStatus('DENIED');
                router.push('/login?callback=' + pathname);
            } else {
                setStatus('GRANTED');
            }
        };

        verifyUplink();
    }, [pathname, isAuthenticated, router, setAuth, logout]);

    // 6.0 Motion Rule: Show the tactical boot sequence during authorization
    if (status === 'AUTHORIZING' || status === 'IDLE') {
        return <Loading />;
    }

    return status === 'GRANTED' ? <>{children}</> : null;
}