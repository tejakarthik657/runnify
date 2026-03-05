'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import Loading from '../app/loading';

const PUBLIC_ROUTES = ['/landing', '/login', '/'];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, user, accessToken, setAuth, logout, _hasHydrated } = useAuthStore();

    const [isValidating, setIsValidating] = useState(false);
    const validatedTokenRef = useRef<string | null>(null);

    const isPublicRoute = useMemo(() => {
        const path = pathname.split('?')[0];
        return PUBLIC_ROUTES.includes(path);
    }, [pathname]);

    useEffect(() => {
        if (!_hasHydrated || isPublicRoute) return;

        if (!isAuthenticated || !user || !accessToken) {
            logout();
            router.replace(`/login?callback=${encodeURIComponent(pathname)}`);
            return;
        }

        if (validatedTokenRef.current === accessToken) {
            return;
        }

        let cancelled = false;
        setIsValidating(true);

        const validateToken = async () => {
            try {
                const { data } = await api.get('/auth/me');
                if (cancelled) return;
                setAuth(data.user, accessToken);
                validatedTokenRef.current = accessToken;
            } catch {
                if (cancelled) return;
                validatedTokenRef.current = null;
                logout();
                router.replace(`/login?callback=${encodeURIComponent(pathname)}`);
            } finally {
                if (!cancelled) {
                    setIsValidating(false);
                }
            }
        };

        validateToken();

        return () => {
            cancelled = true;
        };
    }, [_hasHydrated, isPublicRoute, isAuthenticated, user, accessToken, pathname, logout, setAuth, router]);

    if (!_hasHydrated) {
        return <Loading />;
    }

    if (isPublicRoute) {
        return <>{children}</>;
    }

    if (!isAuthenticated || !user || !accessToken || isValidating) {
        return <Loading />;
    }

    return <>{children}</>;
}