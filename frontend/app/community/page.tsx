'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ArrowLeft, Hash, Users, MessageSquarePlus, UserPlus, Radio, ShieldCheck, ChevronRight, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import api from '../../services/api';
import ChatWindow from '../../components/chat/ChatWindow';
import Badge from '../../components/ui/Badge';
import { useSocket } from '../../hooks/useSocket';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function CommunityPage() {
    const [activeRoom, setActiveRoom] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: roomsData, isLoading: roomsLoading, mutate: mutateRooms } = useSWR('/chat/rooms', fetcher);
    const { data: onlineData, isLoading: onlineLoading } = useSWR('/user/online', fetcher, { refreshInterval: 5000 });
    const { data: searchResults, isLoading: searchLoading } = useSWR(searchTerm.length > 2 ? `/user/search?q=${searchTerm}` : null, fetcher);

    // Signal online status by connecting to chat socket
    const socket = useSocket('chat');

    const startDM = async (otherUser: any) => {
        try {
            // Updated target field name to targetUserId to match backend
            const { data } = await api.post('/chat/dm/start', { targetUserId: otherUser._id || otherUser.userId });
            mutateRooms();
            setActiveRoom({
                roomId: data.roomId,
                name: otherUser.username,
                type: 'dm'
            });
            setSearchTerm('');
        } catch (error: any) {
            console.error('DM Initialization Failed');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-70px)] md:h-screen overflow-hidden bg-[#F4F7F4] font-['Nunito']">

            {/* Header */}
            <div className="p-3 sm:p-4 md:px-8 border-b border-black/5 bg-white/80 backdrop-blur-md flex items-center justify-between z-20">
                <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                    <Link href="/dashboard" className="p-2 sm:p-3 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all active:scale-95">
                        <ArrowLeft size={18} className="sm:w-5 sm:h-5 text-[#1a1a2e]" />
                    </Link>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-[#1a1a2e]">Chat Hub</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#A8D5BA] animate-pulse" />
                            <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Tactical Network Active</span>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 bg-[#F0F7F4] border border-[#A8D5BA]/20 rounded-2xl">
                    <Radio size={12} className="sm:w-3.5 sm:h-3.5 text-[#A8D5BA]" />
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#2E7D52]">Secure Uplink Online</span>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar */}
                <aside className={`
                    ${activeRoom ? 'hidden md:flex' : 'flex'} 
                    w-full md:w-[380px] border-r border-black/5 flex flex-col bg-white
                `}>

                    {/* Search */}
                    <div className="p-4 sm:p-6">
                        <div className="relative group">
                            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#A8D5BA] transition-colors" size={16} />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search for runners..."
                                className="w-full bg-[#F4F7F4] border-none rounded-2xl py-3 sm:py-4 pl-10 sm:pl-12 pr-3 sm:pr-4 text-xs sm:text-sm font-bold text-[#1a1a2e] focus:ring-2 focus:ring-[#A8D5BA]/50 transition-all placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8 scrollbar-hide">
                        {/* Search Results */}
                        <AnimatePresence>
                            {searchTerm.length > 2 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="space-y-3"
                                >
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Search Results</p>
                                    <div className="space-y-2">
                                        {searchLoading ? (
                                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#A8D5BA]" size={24} /></div>
                                        ) : searchResults?.users?.length > 0 ? (
                                            searchResults.users.map((u: any) => (
                                                <button
                                                    key={u._id} onClick={() => startDM(u)}
                                                    className="w-full flex items-center gap-4 p-4 bg-[#F0F7F4] hover:bg-[#A8D5BA] hover:text-white rounded-[24px] transition-all text-left shadow-sm active:scale-95 group"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-sm font-black text-[#1a1a2e] shadow-inner overflow-hidden" style={{ color: u.color }}>
                                                        {u.avatarUrl ? (
                                                            <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" />
                                                        ) : (
                                                            u.username.substring(0, 2).toUpperCase()
                                                        )}
                                                    </div>
                                                    <span className="flex-1 font-black text-sm uppercase tracking-tight">{u.username}</span>
                                                    <UserPlus size={18} className="text-[#A8D5BA] group-hover:text-white" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 bg-gray-50 rounded-[24px] border border-dashed border-gray-200">
                                                <p className="text-[10px] text-gray-300 uppercase font-black tracking-widest italic">Zero Matches Found</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Redesigned Online Runners Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Field Units</p>
                                <Badge variant="sage" className="px-2 py-0.5 text-[9px] font-black" pulse>{onlineData?.count || 0}</Badge>
                            </div>

                            <div className="space-y-2">
                                {onlineLoading ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-200" size={20} /></div>
                                ) : onlineData?.onlineUsers?.length > 0 ? (
                                    onlineData.onlineUsers.map((user: any) => (
                                        <motion.button
                                            key={user.userId + user.socketId}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => startDM({ _id: user.userId, username: user.username, color: user.userColor })}
                                            className="w-full flex items-center gap-4 p-4 bg-white hover:bg-gray-50 rounded-[24px] transition-all text-left border border-black/5 hover:border-[#A8D5BA]/30 group"
                                        >
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-2xl bg-[#F8FAF8] flex items-center justify-center text-sm font-black shadow-inner overflow-hidden" style={{ color: user.userColor }}>
                                                    {user.avatarUrl ? (
                                                        <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        (user.username || '?').charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#A8D5BA] border-2 border-white shadow-sm" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-sm uppercase tracking-tight text-[#1a1a2e]">{user.username}</span>
                                                    <span className="text-[9px] font-black text-gray-300 uppercase">Rank #{user.globalRank || '—'}</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Ready for Intel</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-[#F0F7F4] group-hover:bg-[#A8D5BA] flex items-center justify-center text-[#A8D5BA] group-hover:text-white transition-all scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100">
                                                <MessageCircle size={18} />
                                            </div>
                                        </motion.button>
                                    ))
                                ) : (
                                    <div className="p-8 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-100">
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Scanning for signals...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Channels */}
                        <div className="space-y-6 pt-4">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-4">Public Frequencies</p>
                                <div className="space-y-2">
                                    {(roomsData?.rooms || []).filter((r: any) => r.type !== 'dm').map((room: any) => (
                                        <button
                                            key={room.roomId} onClick={() => setActiveRoom(room)}
                                            className={`
                                                w-full flex items-center gap-4 p-5 rounded-[28px] transition-all text-left border-2
                                                ${activeRoom?.roomId === room.roomId
                                                    ? 'bg-[#F0F7F4] border-[#A8D5BA] shadow-sm'
                                                    : 'bg-white border-transparent hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeRoom?.roomId === room.roomId ? 'bg-[#A8D5BA] text-white' : 'bg-[#F4F7F4] text-gray-300'}`}>
                                                <Hash size={20} />
                                            </div>
                                            <span className={`text-sm font-black uppercase tracking-widest flex-1 ${activeRoom?.roomId === room.roomId ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>
                                                {room.label || room.name}
                                            </span>
                                            {activeRoom?.roomId === room.roomId && <ChevronRight size={18} className="text-[#A8D5BA]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between pl-1 mb-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Direct Comms</p>
                                    <button onClick={() => setSearchTerm('')} className="p-2 bg-[#F0F7F4] rounded-lg text-[#A8D5BA] hover:bg-[#A8D5BA] hover:text-white transition-all">
                                        <MessageSquarePlus size={16} />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {(roomsData?.rooms || []).filter((r: any) => r.type === 'dm').map((room: any) => (
                                        <button
                                            key={room.roomId} onClick={() => setActiveRoom(room)}
                                            className={`
                                                w-full flex items-center gap-4 p-5 rounded-[28px] transition-all text-left border-2
                                                ${activeRoom?.roomId === room.roomId
                                                    ? 'bg-[#F0F7F4] border-[#A594D3] shadow-sm'
                                                    : 'bg-white border-transparent hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border-2 transition-all ${activeRoom?.roomId === room.roomId ? 'bg-[#A594D3] border-white text-white rotate-6 scale-110' : 'bg-white border-gray-100 text-gray-300'}`}>
                                                {(room.label || room.name || 'U')[0].toUpperCase()}
                                            </div>
                                            <span className={`text-sm font-black uppercase tracking-widest flex-1 ${activeRoom?.roomId === room.roomId ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>
                                                {room.label || room.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Chat Area */}
                <main className="flex-1 overflow-hidden relative bg-white">
                    {activeRoom ? (
                        <>
                            <div className="md:hidden absolute top-4 left-4 z-30">
                                <button onClick={() => setActiveRoom(null)} className="p-3 bg-white/80 backdrop-blur rounded-2xl border border-black/5 shadow-md">
                                    <ArrowLeft size={20} className="text-[#1a1a2e]" />
                                </button>
                            </div>
                            <ChatWindow
                                key={activeRoom.roomId}
                                roomId={activeRoom.roomId}
                                roomName={activeRoom.label || activeRoom.name}
                                type={activeRoom.type}
                            />
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#F4F7F4]">
                            <div className="w-24 h-24 bg-white rounded-[40px] shadow-sm flex items-center justify-center text-gray-200 mb-8 border border-black/5">
                                <Radio size={48} className="animate-pulse" />
                            </div>
                            <h3 className="text-xl font-black text-[#1a1a2e] mb-3 uppercase tracking-tighter">Choose a Frequency</h3>
                            <p className="text-gray-400 max-w-xs text-xs font-bold uppercase leading-relaxed tracking-widest italic opacity-60">
                                Connect to a channel to coordinate with your squad members and track field activities.
                            </p>
                        </div>
                    )}
                </main>
            </div>

            {/* System Status */}
            <footer className="hidden md:flex bg-white border-t border-black/5 px-8 py-3 justify-between items-center z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#A8D5BA]" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest tracking-tighter">Transmissions Stable</span>
                    </div>
                    <span className="text-[9px] font-black text-gray-200 uppercase tracking-widest tracking-tighter">Buffer 0.04ms</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-[#A8D5BA]" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">End-to-End Encryption Enabled</span>
                </div>
            </footer>
        </div>
    );
}
