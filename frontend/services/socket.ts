import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

class SocketService {
    private static mainSocket: Socket | null = null;
    private static chatSocket: Socket | null = null;

    static connectMain(token: string): Socket {
        if (this.mainSocket?.connected) return this.mainSocket;

        this.mainSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
        });

        this.mainSocket.on('connect', () => console.log('[Socket] Connected to main namespace'));
        this.mainSocket.on('disconnect', () => console.log('[Socket] Disconnected from main namespace'));

        return this.mainSocket;
    }

    static connectChat(token: string): Socket {
        if (this.chatSocket?.connected) return this.chatSocket;

        this.chatSocket = io(`${SOCKET_URL}/chat`, {
            auth: { token },
            transports: ['websocket'],
        });

        this.chatSocket.on('connect', () => console.log('[Socket] Connected to /chat namespace'));
        this.chatSocket.on('disconnect', () => console.log('[Socket] Disconnected from /chat namespace'));

        return this.chatSocket;
    }

    static disconnectAll() {
        this.mainSocket?.disconnect();
        this.chatSocket?.disconnect();
        this.mainSocket = null;
        this.chatSocket = null;
    }

    static getMainSocket(): Socket | null {
        return this.mainSocket;
    }

    static getChatSocket(): Socket | null {
        return this.chatSocket;
    }
}

export default SocketService;
