import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import SocketService from '../services/socket';
import { useAuthStore } from '../store/authStore';

export const useSocket = (namespace: 'main' | 'chat' = 'main') => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { accessToken, isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated || !accessToken) {
            setSocket(null);
            return;
        }

        let currentSocket: Socket;
        if (namespace === 'chat') {
            currentSocket = SocketService.connectChat(accessToken);
        } else {
            currentSocket = SocketService.connectMain(accessToken);
        }

        setSocket(currentSocket);

        // No disconnect on unmount here to keep shared connection alive across components
        // but we could add cleanup if we want per-page lifecycle
    }, [isAuthenticated, accessToken, namespace]);

    return socket;
};
