'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import Loading from '../app/loading';

const PUBLIC_ROUTES = ['/landing', '/login', '/'];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, user, accessToken, setAuth, logout, _hasHydrated } = useAuthStore();

    const [status, setStatus] = useState<'INITIALIZING' | 'AUTHORIZED' | 'DENIED'>('INITIALIZING');
    const verifyingRef = useRef(false); // Prevent multiple verifications

    // Verify session and handle route access - wait for Zustand hydration first
    useEffect(() => {
        if (!_hasHydrated) return; // Wait for localStorage to load
        
        if (verifyingRef.current) return; // Prevent duplicate verification
        verifyingRef.current = true;

        const verifySession = async () => {
            const path = pathname.split('?')[0];
            const isPublicRoute = PUBLIC_ROUTES.includes(path);

            try {
                if (isAuthenticated && user && accessToken) {
                    // Try to verify token validity
                    try {
                        const { data } = await api.get('/auth/me');
                        setAuth(data.user, accessToken);
                        setStatus('AUTHORIZED');
                    } catch (error: any) {
                        // Token expired or invalid
                        console.log('[RouteGuard] Session expired or invalid');
                        logout();
                        if (!isPublicRoute) {
                            router.push(`/login?callback=${encodeURIComponent(pathname)}`);
                        }
                        setStatus('DENIED');
                    }
                } else if (isAuthenticated && (!user || !accessToken)) {
                    // Corrupted auth state
                    logout();
                    if (!isPublicRoute) {
                        router.push(`/login?callback=${encodeURIComponent(pathname)}`);
                    }
                    setStatus('DENIED');
                } else if (!isAuthenticated) {
                    // User not authenticated
                    if (isPublicRoute) {
                        setStatus('AUTHORIZED');
                    } else {
                        setStatus('DENIED');
                        router.push(`/login?callback=${encodeURIComponent(pathname)}`);
                    }
                }
            } finally {
                verifyingRef.current = false;
            }
        };

        verifySession();
    }, [_hasHydrated, pathname, isAuthenticated, user, accessToken, setAuth, logout, router]);

    // Show loading while initializing
    if (status === 'INITIALIZING') {
        return <Loading />;
    }

    return status === 'AUTHORIZED' ? <>{children}</> : null;
}