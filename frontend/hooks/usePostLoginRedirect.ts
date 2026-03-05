import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

/**
 * Hook to handle redirects after successful login
 * Checks for ?callback= parameter and redirects accordingly
 */
export const usePostLoginRedirect = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        // Only run when there's a successful authentication
        if (!isAuthenticated) return;

        // Get the callback URL from search params
        const callback = searchParams.get('callback');

        if (callback) {
            try {
                // Validate the callback URL is internal (starts with /)
                const isInternal = callback.startsWith('/');
                if (isInternal) {
                    // Use replace to avoid adding to history
                    router.replace(callback);
                }
            } catch (error) {
                console.error('[Redirect] Invalid callback URL:', error);
                // Fallback to dashboard
                router.replace('/dashboard');
            }
        }
    }, [isAuthenticated, searchParams, router]);
};
