'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Users, Search, Loader2, Send } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function LiveUsersDM({ onSelectUser }: { onSelectUser: (user: any) => void }) {
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [initiatingDM, setInitiatingDM] = useState<string | null>(null);

    useEffect(() => {
        loadOnlineUsers();
        const interval = setInterval(loadOnlineUsers, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const loadOnlineUsers = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get('/chat/online-users');
            setOnlineUsers(data.onlineUsers || []);
        } catch (error: any) {
            console.warn('Failed to load online users:', error.message);
            setOnlineUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartDM = async (userId: string, username: string) => {
        setInitiatingDM(userId);
        try {
            const { data } = await api.post('/chat/dm/start', { targetUserId: userId });
            onSelectUser({
                roomId: data.roomId,
                roomName: username,
                type: 'dm',
                targetUser: data.targetUser
            });
            toast.success(`Opened DM with ${username}`);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to start DM');
        } finally {
            setInitiatingDM(null);
        }
    };

    const filteredUsers = onlineUsers.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-b from-[#F4F7F4] to-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-black/5 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A594D3] to-[#E89BA5] flex items-center justify-center text-white shadow-lg">
                        <Users size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-[#1a1a2e]">Live Users</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{filteredUsers.length} Online</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#F4F7F4] border border-black/5 text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A594D3]/50 text-sm font-medium"
                    />
                </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading && filteredUsers.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-gray-400">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                )}

                {filteredUsers.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400 px-4 text-center">
                        <MessageCircle size={32} className="opacity-50 mb-2" />
                        <p className="text-sm font-medium">No users found</p>
                        <p className="text-xs opacity-75">Check back soon!</p>
                    </div>
                )}

                {filteredUsers.map((user) => (
                    <button
                        key={user.userId}
                        onClick={() => handleStartDM(user.userId, user.username)}
                        disabled={initiatingDM === user.userId}
                        className="w-full px-4 py-3 md:px-6 md:py-4 border-b border-black/5 hover:bg-white/60 transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-3 text-left min-w-0">
                            <div 
                                className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-sm flex-shrink-0"
                                style={{ backgroundColor: user.color || '#A8D5BA' }}
                            >
                                {user.username[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm md:text-base font-black text-[#1a1a2e] truncate">{user.username}</p>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <p className="text-xs text-gray-400 font-bold">Online</p>
                                </div>
                            </div>
                        </div>

                        {initiatingDM === user.userId ? (
                            <Loader2 size={18} className="animate-spin text-[#A594D3] flex-shrink-0" />
                        ) : (
                            <Send 
                                size={18} 
                                className="text-gray-300 group-hover:text-[#A594D3] transition-colors flex-shrink-0" 
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="p-3 md:p-4 border-t border-black/5 bg-white/50 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                Auto-refreshes every 10s
            </div>
        </div>
    );
}
