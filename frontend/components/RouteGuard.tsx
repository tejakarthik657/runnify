'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import Loading from '../app/loading';

const PUBLIC_ROUTES = ['/landing', '/login', '/'];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, user, accessToken, setAuth, logout } = useAuthStore();

    const [status, setStatus] = useState<'INITIALIZING' | 'AUTHORIZED' | 'DENIED'>('INITIALIZING');
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

    // Wait for Zustand hydration from localStorage
    useEffect(() => {
        const hydrateTimer = setTimeout(() => {
            setHasCheckedAuth(true);
        }, 50);

        return () => clearTimeout(hydrateTimer);
    }, []);

    // Verify session and handle route access
    useEffect(() => {
        if (!hasCheckedAuth) return;

        const verifySession = async () => {
            const path = pathname.split('?')[0];
            const isPublicRoute = PUBLIC_ROUTES.includes(path);

            if (isAuthenticated && user && accessToken) {
                try {
                    const { data } = await api.get('/auth/me');
                    setAuth(data.user, accessToken);
                    setStatus('AUTHORIZED');
                } catch (error) {
                    console.log('[RouteGuard] Session expired');
                    logout();
                    if (!isPublicRoute) {
                        router.push(`/login?callback=${encodeURIComponent(pathname)}`);
                    }
                    setStatus('DENIED');
                }
            } else if (isAuthenticated && (!user || !accessToken)) {
                logout();
                if (!isPublicRoute) {
                    router.push(`/login?callback=${encodeURIComponent(pathname)}`);
                }
                setStatus('DENIED');
            } else if (!isAuthenticated && !isPublicRoute) {
                setStatus('DENIED');
                router.push(`/login?callback=${encodeURIComponent(pathname)}`);
            } else {
                setStatus('AUTHORIZED');
            }
        };

        verifySession();
    }, [hasCheckedAuth, pathname, isAuthenticated, user, accessToken, setAuth, logout, router]);

    // Show loading while initializing
    if (status === 'INITIALIZING') {
        return <Loading />;
    }

    return status === 'AUTHORIZED' ? <>{children}</> : null;
}